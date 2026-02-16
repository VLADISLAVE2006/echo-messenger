from flask import Blueprint, request, jsonify
from database import get_db
from auth_routes import authenticate
import base64

team_bp = Blueprint('team', __name__, url_prefix='/api')

@team_bp.route('/teams', methods=['GET'])
def get_teams():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

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
    avatar = data.get('avatar')  # base64, опционально

    if not username or not password or not name:
        return jsonify({'error': 'Missing required fields'}), 400

    # Валидация длины описания
    if len(description) > 80:
        return jsonify({'error': 'Description must be less than 80 characters'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    # Проверка размера аватара, если передан
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
        # Создать команду
        cur = conn.execute(
            'INSERT INTO teams (name, description, is_private, avatar, created_by) VALUES (?, ?, ?, ?, ?)',
            (name, description, 1 if is_private else 0, avatar, user['id'])
        )
        team_id = cur.lastrowid

        # Добавить создателя как участника
        conn.execute(
            'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
            (team_id, user['id'])
        )

        # Назначить роль "Создатель"
        conn.execute(
            'INSERT INTO team_roles (team_id, user_id, role_name) VALUES (?, ?, ?)',
            (team_id, user['id'], 'Создатель')
        )

        conn.commit()

    return jsonify({
        'message': 'Team created successfully',
        'team_id': team_id
    }), 200

@team_bp.route('/teams/<int:team_id>', methods=['GET'])
def get_team(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Получить команду
        team = conn.execute(
            'SELECT * FROM teams WHERE id = ?',
            (team_id,)
        ).fetchone()

        if not team:
            return jsonify({'error': 'Team not found'}), 404

        # Подсчитать участников
        member_count = conn.execute(
            'SELECT COUNT(*) as count FROM team_members WHERE team_id = ?',
            (team_id,)
        ).fetchone()['count']

        # Получить всех участников
        members = conn.execute('''
            SELECT u.id, u.username, u.avatar
            FROM users u
            JOIN team_members tm ON u.id = tm.user_id
            WHERE tm.team_id = ?
        ''', (team_id,)).fetchall()

        # Для каждого участника получить все роли
        members_with_roles = []
        for member in members:
            roles = conn.execute(
                'SELECT role_name FROM team_roles WHERE team_id = ? AND user_id = ?',
                (team_id, member['id'])
            ).fetchall()
            members_with_roles.append({
                'id': member['id'],
                'username': member['username'],
                'avatar': member['avatar'],
                'roles': [r['role_name'] for r in roles]
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
        # Проверить существование команды
        team = conn.execute(
            'SELECT id FROM teams WHERE id = ?',
            (team_id,)
        ).fetchone()

        if not team:
            return jsonify({'error': 'Team not found'}), 404

        # Проверить, не является ли уже участником
        member = conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, user['id'])
        ).fetchone()

        if member:
            return jsonify({'error': 'You are already a member of this team'}), 400

        # Проверить, нет ли уже pending заявки
        existing = conn.execute(
            'SELECT * FROM team_requests WHERE team_id = ? AND user_id = ? AND status = ?',
            (team_id, user['id'], 'pending')
        ).fetchone()

        if existing:
            return jsonify({'error': 'Request already pending'}), 400

        # Создать заявку
        conn.execute(
            'INSERT OR IGNORE INTO team_requests (team_id, user_id, status) VALUES (?, ?, ?)',
            (team_id, user['id'], 'pending')
        )
        conn.commit()

    return jsonify({'message': 'Request sent successfully'}), 200