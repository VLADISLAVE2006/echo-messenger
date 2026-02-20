from flask import Blueprint, request, jsonify
from database import get_db
from auth_routes import authenticate
import base64
from datetime import datetime, timedelta

team_bp = Blueprint('team', __name__, url_prefix='/api')

# ---- Вспомогательные функции ----

def is_team_creator(conn, team_id, user_id):
    team = conn.execute(
        'SELECT created_by FROM teams WHERE id = ?', (team_id,)
    ).fetchone()
    return team and team['created_by'] == user_id

def is_team_admin(conn, team_id, user_id):
    roles = conn.execute(
        'SELECT role_name FROM team_roles WHERE team_id = ? AND user_id = ?',
        (team_id, user_id)
    ).fetchall()
    return any(r['role_name'] == 'Admin' for r in roles)

# ---- Существующие эндпоинты (без изменений) ----

@team_bp.route('/teams', methods=['GET'])
def get_teams():
    username = request.args.get('username')
    password = request.args.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required as query params'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        teams = conn.execute('''
            SELECT t.*,
                   (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
            FROM teams t
            ORDER BY t.created_at DESC
        ''').fetchall()

    return jsonify({'teams': [dict(team) for team in teams]}), 200

@team_bp.route('/teams', methods=['POST'])
def create_team():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    description = data.get('description', '')
    is_private = data.get('is_private', False)
    avatar = data.get('avatar')

    if not username or not password or not name:
        return jsonify({'error': 'Missing required fields'}), 400

    if len(description) > 80:
        return jsonify({'error': 'Description must be less than 80 characters'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    if avatar:
        try:
            if avatar.startswith('data:image'):
                base64_data = avatar.split(',')[1]
            else:
                base64_data = avatar

            decoded = base64.b64decode(base64_data)
            size_mb = len(decoded) / (1024 * 1024)

            if size_mb > 5:
                return jsonify({'error': 'Avatar size exceeds 5MB limit'}), 400
        except Exception:
            return jsonify({'error': 'Invalid avatar data'}), 400

    with get_db() as conn:
        # 1. Создаём чат для команды
        chat_cur = conn.execute(
            'INSERT INTO chats (name, type, created_by) VALUES (?, ?, ?)',
            (f'{name} Chat', 'group', user['id'])
        )
        chat_id = chat_cur.lastrowid

        # Добавляем создателя в чат
        conn.execute(
            'INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
            (chat_id, user['id'], 'admin')
        )

        # 2. Создаём команду с указанием chat_id
        cur = conn.execute(
            'INSERT INTO teams (name, description, is_private, avatar, created_by, chat_id) VALUES (?, ?, ?, ?, ?, ?)',
            (name, description, 1 if is_private else 0, avatar, user['id'], chat_id)
        )
        team_id = cur.lastrowid

        # Добавляем создателя в участники команды
        conn.execute(
            'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
            (team_id, user['id'])
        )

        # Назначаем роль "Admin"
        conn.execute(
            'INSERT INTO team_roles (team_id, user_id, role_name) VALUES (?, ?, ?)',
            (team_id, user['id'], 'Admin')
        )

        conn.commit()

    return jsonify({
        'message': 'Team created successfully',
        'team_id': team_id,
        'chat_id': chat_id
    }), 200

@team_bp.route('/teams/<int:team_id>', methods=['GET'])
def get_team(team_id):
    username = request.args.get('username')
    password = request.args.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required as query params'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        team = conn.execute(
            'SELECT * FROM teams WHERE id = ?', (team_id,)
        ).fetchone()

        if not team:
            return jsonify({'error': 'Team not found'}), 404

        member_count = conn.execute(
            'SELECT COUNT(*) as count FROM team_members WHERE team_id = ?',
            (team_id,)
        ).fetchone()['count']

        members = conn.execute('''
            SELECT u.id, u.username, u.avatar, u.last_seen
            FROM users u
            JOIN team_members tm ON u.id = tm.user_id
            WHERE tm.team_id = ?
        ''', (team_id,)).fetchall()

        members_with_roles = []
        now = datetime.now()
        for member in members:
            roles = conn.execute(
                'SELECT role_name FROM team_roles WHERE team_id = ? AND user_id = ?',
                (team_id, member['id'])
            ).fetchall()

            last_seen = member['last_seen']
            is_online = False
            if last_seen:
                try:
                    if isinstance(last_seen, str):
                        last_seen_dt = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                    else:
                        last_seen_dt = last_seen
                    if now - last_seen_dt < timedelta(minutes=5):
                        is_online = True
                except:
                    pass

            members_with_roles.append({
                'id': member['id'],
                'username': member['username'],
                'avatar': member['avatar'],
                'roles': [r['role_name'] for r in roles],
                'is_online': is_online
            })

    team_dict = dict(team)
    team_dict['member_count'] = member_count

    return jsonify({
        'team': team_dict,
        'members': members_with_roles
    }), 200

# ---- НОВЫЙ ЭНДПОИНТ: обновление ролей участника (с поддержкой CORS OPTIONS) ----

@team_bp.route('/teams/<int:team_id>/members/<int:user_id>/roles', methods=['PUT', 'OPTIONS'])
def update_member_roles(team_id, user_id):
    # Preflight CORS
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    new_roles = data.get('roles')  # ожидается список строк (например, ["Admin", "Moderator"])

    if not username or not password or new_roles is None:
        return jsonify({'error': 'Missing fields'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что текущий пользователь является админом команды
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Admin rights required'}), 403

        # Проверяем, что целевой пользователь является участником команды
        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user_id)
        ).fetchone()
        if not member:
            return jsonify({'error': 'User is not a member of this team'}), 404

        # Удаляем старые роли и добавляем новые
        conn.execute('DELETE FROM team_roles WHERE team_id = ? AND user_id = ?', (team_id, user_id))
        for role in new_roles:
            conn.execute(
                'INSERT INTO team_roles (team_id, user_id, role_name) VALUES (?, ?, ?)',
                (team_id, user_id, role)
            )
        conn.commit()

    return jsonify({'message': 'Roles updated successfully'}), 200

# ---- НОВАЯ СИСТЕМА ЗАЯВОК (join_requests) ----

@team_bp.route('/teams/<int:team_id>/request', methods=['POST'])
def send_join_request(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400

    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что команда существует
        team = conn.execute('SELECT * FROM teams WHERE id = ?', (team_id,)).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404

        # Критически важно: нельзя отправить заявку в приватную команду
        if team['is_private'] == 1:
            return jsonify({'error': 'Cannot send request to private team'}), 403

        # Проверяем, что пользователь не является участником
        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()
        if member:
            return jsonify({'error': 'You are already a member of this team'}), 400

        # Проверяем, что нет активной заявки
        existing_request = conn.execute(
            'SELECT * FROM join_requests WHERE team_id = ? AND user_id = ? AND status = ?',
            (team_id, user['id'], 'pending')
        ).fetchone()
        if existing_request:
            return jsonify({'error': 'You already have a pending request for this team'}), 400

        # Создаём заявку
        cur = conn.execute(
            'INSERT INTO join_requests (team_id, user_id, status) VALUES (?, ?, ?)',
            (team_id, user['id'], 'pending')
        )
        request_id = cur.lastrowid
        conn.commit()

    return jsonify({
        'message': 'Request sent successfully',
        'request_id': request_id
    }), 200

@team_bp.route('/teams/<int:team_id>/requests', methods=['GET'])
def get_join_requests(team_id):
    username = request.args.get('username')
    password = request.args.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что пользователь админ команды
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Only admins can view requests'}), 403

        # Получаем все pending заявки
        requests_raw = conn.execute('''
            SELECT jr.id, jr.user_id, jr.status, jr.created_at,
                   u.username, u.avatar
            FROM join_requests jr
            JOIN users u ON jr.user_id = u.id
            WHERE jr.team_id = ? AND jr.status = ?
            ORDER BY jr.created_at DESC
        ''', (team_id, 'pending')).fetchall()

        requests = [dict(r) for r in requests_raw]

    return jsonify({'requests': requests}), 200

@team_bp.route('/teams/<int:team_id>/requests/<int:request_id>/approve', methods=['POST'])
def approve_request(team_id, request_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем права администратора
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Only admins can approve requests'}), 403

        # Проверяем, что заявка существует и pending
        join_request = conn.execute(
            'SELECT * FROM join_requests WHERE id = ? AND team_id = ? AND status = ?',
            (request_id, team_id, 'pending')
        ).fetchone()
        if not join_request:
            return jsonify({'error': 'Request not found or already processed'}), 404

        # Добавляем в участники команды
        conn.execute(
            'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
            (team_id, join_request['user_id'])
        )

        # Добавляем в чат команды
        team = conn.execute('SELECT chat_id FROM teams WHERE id = ?', (team_id,)).fetchone()
        if team and team['chat_id']:
            conn.execute(
                'INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
                (team['chat_id'], join_request['user_id'], 'member')
            )

        # Обновляем статус заявки
        conn.execute(
            'UPDATE join_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ('approved', request_id)
        )

        conn.commit()

    return jsonify({'message': 'Request approved successfully'}), 200

@team_bp.route('/teams/<int:team_id>/requests/<int:request_id>/reject', methods=['POST'])
def reject_request(team_id, request_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем права администратора
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Only admins can reject requests'}), 403

        # Проверяем, что заявка существует и pending
        join_request = conn.execute(
            'SELECT * FROM join_requests WHERE id = ? AND team_id = ? AND status = ?',
            (request_id, team_id, 'pending')
        ).fetchone()
        if not join_request:
            return jsonify({'error': 'Request not found or already processed'}), 404

        # Обновляем статус
        conn.execute(
            'UPDATE join_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ('rejected', request_id)
        )
        conn.commit()

    return jsonify({'message': 'Request rejected successfully'}), 200

# ---- ВАЙТБОРД (WHITEBOARD) ----

@team_bp.route('/teams/<int:team_id>/whiteboard', methods=['GET'])
def get_whiteboard(team_id):
    username = request.args.get('username')
    password = request.args.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что пользователь участник команды
        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()
        if not member:
            return jsonify({'error': 'You are not a member of this team'}), 403

        # Получаем whiteboard команды (или создаём, если нет)
        whiteboard = conn.execute(
            'SELECT * FROM whiteboards WHERE team_id = ?',
            (team_id,)
        ).fetchone()

        if not whiteboard:
            # Создаём whiteboard
            cur = conn.execute(
                'INSERT INTO whiteboards (team_id, created_by) VALUES (?, ?)',
                (team_id, user['id'])
            )
            whiteboard_id = cur.lastrowid

            # Создаём пустые данные
            conn.execute(
                'INSERT INTO whiteboard_data (whiteboard_id, data) VALUES (?, ?)',
                (whiteboard_id, '{"elements":[]}')
            )
            conn.commit()
            data = '{"elements":[]}'
        else:
            # Получаем последние данные
            wb_data = conn.execute(
                'SELECT data FROM whiteboard_data WHERE whiteboard_id = ? ORDER BY updated_at DESC LIMIT 1',
                (whiteboard['id'],)
            ).fetchone()
            data = wb_data['data'] if wb_data else '{"elements":[]}'
            whiteboard_id = whiteboard['id']

    return jsonify({
        'whiteboard_id': whiteboard_id,
        'data': data
    }), 200

@team_bp.route('/teams/<int:team_id>/whiteboard', methods=['PUT'])
def update_whiteboard(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400

    username = data.get('username')
    password = data.get('password')
    whiteboard_data = data.get('data')

    if not whiteboard_data:
        return jsonify({'error': 'Whiteboard data required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что пользователь участник команды
        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()
        if not member:
            return jsonify({'error': 'You are not a member of this team'}), 403

        # Получаем whiteboard
        whiteboard = conn.execute(
            'SELECT * FROM whiteboards WHERE team_id = ?',
            (team_id,)
        ).fetchone()
        if not whiteboard:
            return jsonify({'error': 'Whiteboard not found'}), 404

        # Обновляем данные (сохраняем новую версию)
        conn.execute(
            'INSERT INTO whiteboard_data (whiteboard_id, data) VALUES (?, ?)',
            (whiteboard['id'], whiteboard_data)
        )
        conn.commit()

    return jsonify({'message': 'Whiteboard updated successfully'}), 200

# ---- Существующие эндпоинты для удаления участника и обновления/удаления команды (без изменений) ----

@team_bp.route('/teams/<int:team_id>/members/<int:user_id>', methods=['DELETE'])
def remove_team_member(team_id, user_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        if not is_team_creator(conn, team_id, user['id']):
            return jsonify({'error': 'Only team creator can remove members'}), 403

        if user_id == user['id']:
            return jsonify({'error': 'Cannot remove team creator'}), 400

        team = conn.execute(
            'SELECT chat_id FROM teams WHERE id = ?', (team_id,)
        ).fetchone()

        conn.execute(
            'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user_id)
        )

        if team and team['chat_id']:
            conn.execute(
                'DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?',
                (team['chat_id'], user_id)
            )

        conn.commit()

    return jsonify({'message': 'Member removed successfully'}), 200

@team_bp.route('/teams/<int:team_id>', methods=['PUT'])
def update_team(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    description = data.get('description')
    is_private = data.get('is_private')
    avatar = data.get('avatar')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        if not is_team_creator(conn, team_id, user['id']):
            return jsonify({'error': 'Only team creator can update team'}), 403

        team = conn.execute(
            'SELECT * FROM teams WHERE id = ?', (team_id,)
        ).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404

        if description is not None and len(description) > 80:
            return jsonify({'error': 'Description must be less than 80 characters'}), 400

        if avatar:
            try:
                if avatar.startswith('data:image'):
                    base64_data = avatar.split(',')[1]
                else:
                    base64_data = avatar

                decoded = base64.b64decode(base64_data)
                size_mb = len(decoded) / (1024 * 1024)

                if size_mb > 5:
                    return jsonify({'error': 'Avatar size exceeds 5MB limit'}), 400
            except Exception:
                return jsonify({'error': 'Invalid avatar data'}), 400

        updates = []
        values = []
        if name is not None:
            updates.append("name = ?")
            values.append(name)
        if description is not None:
            updates.append("description = ?")
            values.append(description)
        if is_private is not None:
            updates.append("is_private = ?")
            values.append(1 if is_private else 0)
        if avatar is not None:
            updates.append("avatar = ?")
            values.append(avatar)

        if not updates:
            return jsonify({'error': 'No fields to update'}), 400

        values.append(team_id)
        query = f"UPDATE teams SET {', '.join(updates)} WHERE id = ?"
        conn.execute(query, values)
        conn.commit()

    return jsonify({'message': 'Team updated successfully'}), 200

@team_bp.route('/teams/<int:team_id>', methods=['DELETE'])
def delete_team(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        if not is_team_creator(conn, team_id, user['id']):
            return jsonify({'error': 'Only team creator can delete team'}), 403

        team = conn.execute(
            'SELECT id FROM teams WHERE id = ?', (team_id,)
        ).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404

        conn.execute('DELETE FROM teams WHERE id = ?', (team_id,))
        conn.commit()

    return jsonify({'message': 'Team deleted successfully'}), 200