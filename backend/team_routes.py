from flask import Blueprint, request, jsonify
from database import get_db
from auth_routes import authenticate
import base64
from datetime import datetime, timedelta

team_bp = Blueprint('team', __name__, url_prefix='/api')

# Вспомогательная функция для проверки, является ли пользователь создателем команды
def is_team_creator(conn, team_id, user_id):
    team = conn.execute(
        'SELECT created_by FROM teams WHERE id = ?', (team_id,)
    ).fetchone()
    return team and team['created_by'] == user_id

@team_bp.route('/teams', methods=['GET'])
def get_teams():
    # Получаем параметры из query string
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
        cur = conn.execute(
            'INSERT INTO teams (name, description, is_private, avatar, created_by) VALUES (?, ?, ?, ?, ?)',
            (name, description, 1 if is_private else 0, avatar, user['id'])
        )
        team_id = cur.lastrowid

        # Добавляем создателя как участника
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
        'team_id': team_id
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

            # Определяем онлайн-статус: если last_seen был менее 5 минут назад
            last_seen = member['last_seen']
            is_online = False
            if last_seen:
                try:
                    # last_seen может быть строкой, преобразуем
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

@team_bp.route('/teams/<int:team_id>/request', methods=['POST'])
def join_team_request(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        team = conn.execute(
            'SELECT id FROM teams WHERE id = ?', (team_id,)
        ).fetchone()

        if not team:
            return jsonify({'error': 'Team not found'}), 404

        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()

        if member:
            return jsonify({'error': 'You are already a member of this team'}), 400

        existing = conn.execute(
            'SELECT * FROM team_requests WHERE team_id = ? AND user_id = ? AND status = ?',
            (team_id, user['id'], 'pending')
        ).fetchone()

        if existing:
            return jsonify({'error': 'Request already pending'}), 400

        conn.execute(
            'INSERT OR IGNORE INTO team_requests (team_id, user_id, status) VALUES (?, ?, ?)',
            (team_id, user['id'], 'pending')
        )
        conn.commit()

    return jsonify({'message': 'Request sent successfully'}), 200

# ----- Новые эндпоинты -----

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
        # Проверяем, что текущий пользователь — создатель команды
        if not is_team_creator(conn, team_id, user['id']):
            return jsonify({'error': 'Only team creator can remove members'}), 403

        # Нельзя удалить самого создателя
        if user_id == user['id']:
            return jsonify({'error': 'Cannot remove team creator'}), 400

        # Удаляем участника из team_members (каскадно удалятся роли)
        conn.execute(
            'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user_id)
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

        # Проверяем существование команды
        team = conn.execute(
            'SELECT * FROM teams WHERE id = ?', (team_id,)
        ).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404

        # Валидация description
        if description is not None and len(description) > 80:
            return jsonify({'error': 'Description must be less than 80 characters'}), 400

        # Валидация avatar
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

        # Формируем запрос на обновление только переданных полей
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

        # Проверяем существование команды
        team = conn.execute(
            'SELECT id FROM teams WHERE id = ?', (team_id,)
        ).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404

        # Благодаря ON DELETE CASCADE связанные записи удалятся автоматически
        conn.execute('DELETE FROM teams WHERE id = ?', (team_id,))
        conn.commit()

    return jsonify({'message': 'Team deleted successfully'}), 200