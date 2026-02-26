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

# ---- ЭНДПОИНТЫ ----

@team_bp.route('/teams', methods=['GET'])
def get_teams():
    """Получение списка команд пользователя"""
    username = request.args.get('username')
    password = request.args.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required as query params'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Получаем команды, где пользователь является участником
        teams = conn.execute('''
            SELECT DISTINCT t.*,
                   (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
            FROM teams t
            JOIN team_members tm ON t.id = tm.team_id
            WHERE tm.user_id = ?
            ORDER BY t.created_at DESC
        ''', (user['id'],)).fetchall()

    return jsonify({'teams': [dict(team) for team in teams]}), 200

@team_bp.route('/teams', methods=['POST'])
def create_team():
    """Создание новой команды"""
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

        # 3. Добавляем создателя в участники команды
        conn.execute(
            'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
            (team_id, user['id'])
        )

        # 4. КРИТИЧЕСКИ ВАЖНО: Назначаем роль "Admin"
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
    """Получение информации о команде"""
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

        # ⬇️ ДОБАВЛЯЕМ: Получаем активный poll если есть
        active_poll = None
        if team['active_poll_id']:
            poll_data = conn.execute('''
                SELECT p.*, u.username as created_by
                FROM polls p
                JOIN users u ON p.created_by = u.id
                WHERE p.id = ?
            ''', (team['active_poll_id'],)).fetchone()

            if poll_data:
                # Получаем опции с количеством голосов
                options = conn.execute('''
                    SELECT po.id, po.text,
                           COUNT(pv.id) as votes,
                           CASE WHEN EXISTS (
                               SELECT 1 FROM poll_votes pv2
                               WHERE pv2.option_id = po.id
                               AND pv2.user_id = ?
                           ) THEN 1 ELSE 0 END as voted_by_current_user
                    FROM poll_options po
                    LEFT JOIN poll_votes pv ON po.id = pv.option_id
                    WHERE po.poll_id = ?
                    GROUP BY po.id
                    ORDER BY po.id
                ''', (user['id'], poll_data['id'])).fetchall()

                active_poll = {
                    'id': poll_data['id'],
                    'question': poll_data['question'],
                    'created_by': poll_data['created_by'],
                    'created_at': poll_data['created_at'],
                    'options': [dict(opt) for opt in options]
                }

    team_dict = dict(team)
    team_dict['member_count'] = member_count

    return jsonify({
        'team': team_dict,
        'members': members_with_roles,
        'active_poll': active_poll  # ⬅️ ДОБАВЛЯЕМ
    }), 200

@team_bp.route('/teams/<int:team_id>/members/<int:user_id>/roles', methods=['PUT', 'OPTIONS'])
def update_member_roles(team_id, user_id):
    """
    Обновляет роли участника команды.
    Защищает роль Admin у создателя команды от удаления.
    """
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    new_roles = data.get('roles')

    if not username or not password or new_roles is None:
        return jsonify({'error': 'Missing fields'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Получаем команду и проверяем создателя
        team = conn.execute(
            'SELECT created_by FROM teams WHERE id = ?',
            (team_id,)
        ).fetchone()

        if not team:
            return jsonify({'error': 'Team not found'}), 404

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

        # ЗАЩИТА: Если это создатель команды, всегда добавляем Admin в роли
        is_creator = (user_id == team['created_by'])
        if is_creator and 'Admin' not in new_roles:
            new_roles.append('Admin')

        # Получаем текущие роли
        current_roles = conn.execute(
            'SELECT role_name FROM team_roles WHERE team_id = ? AND user_id = ?',
            (team_id, user_id)
        ).fetchall()
        current_role_names = [r['role_name'] for r in current_roles]

        # Удаляем роли, которых нет в новом списке
        for role in current_role_names:
            if role not in new_roles:
                # ЗАЩИТА: Никогда не удаляем Admin у создателя
                if is_creator and role == 'Admin':
                    continue

                conn.execute(
                    'DELETE FROM team_roles WHERE team_id = ? AND user_id = ? AND role_name = ?',
                    (team_id, user_id, role)
                )

        # Добавляем новые роли
        for role in new_roles:
            if role not in current_role_names:
                conn.execute(
                    'INSERT INTO team_roles (team_id, user_id, role_name) VALUES (?, ?, ?)',
                    (team_id, user_id, role)
                )

        conn.commit()

    return jsonify({'message': 'Roles updated successfully'}), 200

# ---- ЗАЯВКИ НА ВСТУПЛЕНИЕ (JOIN REQUESTS) ----

@team_bp.route('/teams/<int:team_id>/request', methods=['POST'])
def send_join_request(team_id):
    """Отправка заявки на вступление в ПРИВАТНУЮ команду"""
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
        team = conn.execute('SELECT * FROM teams WHERE id = ?', (team_id,)).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404

        # ВАЖНО: Заявка только для приватных команд
        if team['is_private'] == 0:
            return jsonify({'error': 'This is a public team. Use direct join instead.'}), 400

        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()
        if member:
            return jsonify({'error': 'You are already a member of this team'}), 400

        existing_request = conn.execute(
            'SELECT * FROM join_requests WHERE team_id = ? AND user_id = ? AND status = ?',
            (team_id, user['id'], 'pending')
        ).fetchone()
        if existing_request:
            return jsonify({'error': 'You already have a pending request for this team'}), 400

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

@team_bp.route('/teams/<int:team_id>/join', methods=['POST'])
def join_team_instantly(team_id):
    """Мгновенное вступление в публичную команду"""
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
        # Проверяем существование команды
        team = conn.execute('SELECT * FROM teams WHERE id = ?', (team_id,)).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404

        # ВАЖНО: Проверяем что команда НЕ приватная
        if team['is_private'] == 1:
            return jsonify({'error': 'Cannot join private team directly. Send a join request instead.'}), 403

        # Проверяем что не является участником
        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()
        if member:
            return jsonify({'error': 'You are already a member of this team'}), 400

        # Добавляем в участники
        conn.execute(
            'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
            (team_id, user['id'])
        )

        # Добавляем в чат команды
        if team['chat_id']:
            conn.execute(
                'INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
                (team['chat_id'], user['id'], 'member')
            )

        conn.commit()

    return jsonify({'message': 'Successfully joined the team'}), 200

@team_bp.route('/teams/<int:team_id>/requests', methods=['GET'])
def get_join_requests(team_id):
    """Получение заявок на вступление в команду"""
    username = request.args.get('username')
    password = request.args.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Only admins can view requests'}), 403

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
    """Одобрение заявки на вступление"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Only admins can approve requests'}), 403

        join_request = conn.execute(
            'SELECT * FROM join_requests WHERE id = ? AND team_id = ? AND status = ?',
            (request_id, team_id, 'pending')
        ).fetchone()
        if not join_request:
            return jsonify({'error': 'Request not found or already processed'}), 404

        conn.execute(
            'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
            (team_id, join_request['user_id'])
        )

        team = conn.execute('SELECT chat_id FROM teams WHERE id = ?', (team_id,)).fetchone()
        if team and team['chat_id']:
            conn.execute(
                'INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
                (team['chat_id'], join_request['user_id'], 'member')
            )

        conn.execute(
            'UPDATE join_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ('approved', request_id)
        )

        conn.commit()

    return jsonify({'message': 'Request approved successfully'}), 200

@team_bp.route('/teams/<int:team_id>/requests/<int:request_id>/reject', methods=['POST'])
def reject_request(team_id, request_id):
    """Отклонение заявки на вступление"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Only admins can reject requests'}), 403

        join_request = conn.execute(
            'SELECT * FROM join_requests WHERE id = ? AND team_id = ? AND status = ?',
            (request_id, team_id, 'pending')
        ).fetchone()
        if not join_request:
            return jsonify({'error': 'Request not found or already processed'}), 404

        conn.execute(
            'UPDATE join_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ('rejected', request_id)
        )
        conn.commit()

    return jsonify({'message': 'Request rejected successfully'}), 200

# ---- ВАЙТБОРД (WHITEBOARD) ----

@team_bp.route('/teams/<int:team_id>/whiteboard', methods=['GET'])
def get_whiteboard(team_id):
    """Получение данных вайтборда команды"""
    username = request.args.get('username')
    password = request.args.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()
        if not member:
            return jsonify({'error': 'You are not a member of this team'}), 403

        whiteboard = conn.execute(
            'SELECT * FROM whiteboards WHERE team_id = ?',
            (team_id,)
        ).fetchone()

        if not whiteboard:
            cur = conn.execute(
                'INSERT INTO whiteboards (team_id, created_by) VALUES (?, ?)',
                (team_id, user['id'])
            )
            whiteboard_id = cur.lastrowid

            conn.execute(
                'INSERT INTO whiteboard_data (whiteboard_id, data) VALUES (?, ?)',
                (whiteboard_id, '{"elements":[]}')
            )
            conn.commit()
            data = '{"elements":[]}'
        else:
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
    """Обновление данных вайтборда"""
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
        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()
        if not member:
            return jsonify({'error': 'You are not a member of this team'}), 403

        whiteboard = conn.execute(
            'SELECT * FROM whiteboards WHERE team_id = ?',
            (team_id,)
        ).fetchone()
        if not whiteboard:
            return jsonify({'error': 'Whiteboard not found'}), 404

        conn.execute(
            'INSERT INTO whiteboard_data (whiteboard_id, data) VALUES (?, ?)',
            (whiteboard['id'], whiteboard_data)
        )
        conn.commit()

    return jsonify({'message': 'Whiteboard updated successfully'}), 200

# ---- УПРАВЛЕНИЕ УЧАСТНИКАМИ И КОМАНДОЙ ----

@team_bp.route('/teams/<int:team_id>/members/<int:user_id>', methods=['DELETE'])
def remove_team_member(team_id, user_id):
    """Удаление участника из команды"""
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

        conn.execute(
            'DELETE FROM team_roles WHERE team_id = ? AND user_id = ?',
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
    """Обновление информации о команде"""
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
    """Удаление команды"""
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

@team_bp.route('/teams/public', methods=['GET', 'OPTIONS'])
def get_public_teams():
    """Получение списка ВСЕХ команд (публичных и приватных)"""
    if request.method == 'OPTIONS':
        return '', 200

    username = request.args.get('username')
    password = request.args.get('password')

    if not username or not password:
        return jsonify({'error': 'username and password required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        teams = conn.execute('''
            SELECT t.*,
                   (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
                   EXISTS(SELECT 1 FROM team_members WHERE team_id = t.id AND user_id = ?) as is_member,
                   EXISTS(SELECT 1 FROM join_requests WHERE team_id = t.id AND user_id = ? AND status = 'pending') as has_pending_request
            FROM teams t
            ORDER BY t.created_at DESC
        ''', (user['id'], user['id'])).fetchall()

    return jsonify({'teams': [dict(team) for team in teams]}), 200


# ==================== POLLS (ГОЛОСОВАНИЯ) ====================

@team_bp.route('/teams/<int:team_id>/polls', methods=['POST'])
def create_poll(team_id):
    """Создание нового голосования"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    question = data.get('question')
    options = data.get('options', [])

    if not question or len(options) < 2:
        return jsonify({'error': 'Question and at least 2 options required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем членство
        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()
        if not member:
            return jsonify({'error': 'Not a team member'}), 403

        # Создаем poll
        cur = conn.execute(
            'INSERT INTO polls (team_id, question, created_by) VALUES (?, ?, ?)',
            (team_id, question, user['id'])
        )
        poll_id = cur.lastrowid

        # Создаем опции
        for option_text in options:
            conn.execute(
                'INSERT INTO poll_options (poll_id, text) VALUES (?, ?)',
                (poll_id, option_text)
            )

        # Делаем poll активным
        conn.execute(
            'UPDATE teams SET active_poll_id = ? WHERE id = ?',
            (poll_id, team_id)
        )

        conn.commit()

        # Получаем созданный poll с опциями
        poll_options = conn.execute(
            'SELECT id, text, 0 as votes FROM poll_options WHERE poll_id = ?',
            (poll_id,)
        ).fetchall()

    poll_data = {
        'id': poll_id,
        'question': question,
        'created_by': user['username'],
        'created_at': datetime.now().isoformat(),
        'options': [{'id': opt['id'], 'text': opt['text'], 'votes': 0} for opt in poll_options]
    }

    return jsonify({'poll': poll_data}), 201

@team_bp.route('/teams/<int:team_id>/polls/<int:poll_id>/vote', methods=['POST'])
def vote_poll(team_id, poll_id):
    """Голосование в poll"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    option_id = data.get('option_id')

    if option_id is None:
        return jsonify({'error': 'option_id required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем членство
        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()
        if not member:
            return jsonify({'error': 'Not a team member'}), 403

        # Проверяем что poll существует
        poll = conn.execute(
            'SELECT * FROM polls WHERE id = ? AND team_id = ?',
            (poll_id, team_id)
        ).fetchone()
        if not poll:
            return jsonify({'error': 'Poll not found'}), 404

        # Проверяем что опция существует
        option = conn.execute(
            'SELECT * FROM poll_options WHERE id = ? AND poll_id = ?',
            (option_id, poll_id)
        ).fetchone()
        if not option:
            return jsonify({'error': 'Option not found'}), 404

        # Проверяем не голосовал ли уже
        existing_vote = conn.execute(
            'SELECT * FROM poll_votes WHERE poll_id = ? AND user_id = ?',
            (poll_id, user['id'])
        ).fetchone()
        if existing_vote:
            return jsonify({'error': 'Already voted'}), 400

        # Записываем голос
        conn.execute(
            'INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)',
            (poll_id, option_id, user['id'])
        )
        conn.commit()

        # Получаем обновленное количество голосов
        vote_count = conn.execute(
            'SELECT COUNT(*) as count FROM poll_votes WHERE option_id = ?',
            (option_id,)
        ).fetchone()['count']

    return jsonify({'votes': vote_count}), 200

@team_bp.route('/teams/<int:team_id>/active-poll', methods=['POST'])
def set_active_poll(team_id):
    """Установить активное голосование (или закрыть если poll_id=null)"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    poll_id = data.get('poll_id')  # None чтобы закрыть poll

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем права (админ или создатель)
        if not is_team_admin(conn, team_id, user['id']) and not is_team_creator(conn, team_id, user['id']):
            return jsonify({'error': 'Admin rights required'}), 403

        # Устанавливаем активный poll
        conn.execute(
            'UPDATE teams SET active_poll_id = ? WHERE id = ?',
            (poll_id, team_id)
        )
        conn.commit()

    return jsonify({'status': 'success'}), 200