from flask import Blueprint, request, jsonify
from database import get_db
from auth_routes import authenticate

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

_socketio = None

def init_socketio(socketio):
    global _socketio
    _socketio = socketio


def require_site_admin(username, password):
    """Проверяет что пользователь является суперадмином. Возвращает user или None."""
    user = authenticate(username, password)
    if not user:
        return None
    if not user['is_site_admin']:
        return None
    return user


# ---- ПОЛЬЗОВАТЕЛИ ----

@admin_bp.route('/users', methods=['GET'])
def get_all_users():
    username = request.args.get('username')
    password = request.args.get('password')

    admin = require_site_admin(username, password)
    if not admin:
        return jsonify({'error': 'Forbidden'}), 403

    with get_db() as conn:
        users = conn.execute(
            'SELECT id, username, avatar, bio, is_site_admin, last_seen, created_at FROM users ORDER BY created_at DESC'
        ).fetchall()

    return jsonify({'users': [dict(u) for u in users]}), 200


@admin_bp.route('/users/<int:user_id>/toggle-admin', methods=['PUT'])
def toggle_site_admin(user_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    admin = require_site_admin(username, password)
    if not admin:
        return jsonify({'error': 'Forbidden'}), 403

    if admin['id'] == user_id:
        return jsonify({'error': 'Cannot change your own admin status'}), 400

    with get_db() as conn:
        user = conn.execute('SELECT id, is_site_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        new_status = 0 if user['is_site_admin'] else 1
        conn.execute('UPDATE users SET is_site_admin = ? WHERE id = ?', (new_status, user_id))
        conn.commit()

    return jsonify({'message': 'Admin status updated', 'is_site_admin': bool(new_status)}), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    admin = require_site_admin(username, password)
    if not admin:
        return jsonify({'error': 'Forbidden'}), 403

    if admin['id'] == user_id:
        return jsonify({'error': 'Cannot delete yourself'}), 400

    with get_db() as conn:
        user = conn.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Уведомляем пользователя об удалении до фактического удаления
        if _socketio:
            _socketio.emit('account_deleted', {}, room=f'user_{user_id}')

        # Удаляем записи с не-каскадными FK на users.id
        conn.execute('DELETE FROM whiteboards WHERE created_by = ?', (user_id,))
        conn.execute('DELETE FROM polls WHERE created_by = ?', (user_id,))
        conn.execute('DELETE FROM teams WHERE created_by = ?', (user_id,))
        conn.execute('DELETE FROM chats WHERE created_by = ?', (user_id,))
        conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()

    return jsonify({'message': 'User deleted'}), 200


# ---- ГРУППЫ (КОМАНДЫ) ----

@admin_bp.route('/teams', methods=['GET'])
def get_all_teams():
    username = request.args.get('username')
    password = request.args.get('password')

    admin = require_site_admin(username, password)
    if not admin:
        return jsonify({'error': 'Forbidden'}), 403

    with get_db() as conn:
        teams = conn.execute('''
            SELECT t.id, t.name, t.description, t.is_private, t.avatar,
                   t.created_at, u.username as creator_username,
                   (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
            FROM teams t
            JOIN users u ON t.created_by = u.id
            ORDER BY t.created_at DESC
        ''').fetchall()

    return jsonify({'teams': [dict(t) for t in teams]}), 200


@admin_bp.route('/teams/<int:team_id>', methods=['DELETE'])
def delete_team(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    admin = require_site_admin(username, password)
    if not admin:
        return jsonify({'error': 'Forbidden'}), 403

    with get_db() as conn:
        team = conn.execute('SELECT id FROM teams WHERE id = ?', (team_id,)).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404

        conn.execute('DELETE FROM teams WHERE id = ?', (team_id,))
        conn.commit()

    if _socketio:
        _socketio.emit('team_deleted', {'team_id': team_id}, room=f'team_{team_id}')

    return jsonify({'message': 'Team deleted'}), 200