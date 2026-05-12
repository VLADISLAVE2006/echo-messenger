from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db
from routes.auth import get_current_user

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

_socketio = None


def init_socketio(socketio):
    global _socketio
    _socketio = socketio


def _require_admin():
    """Возвращает пользователя если он суперадмин, иначе None."""
    user = get_current_user()
    if not user or not user['is_site_admin']:
        return None
    return user


# ---- ПОЛЬЗОВАТЕЛИ ----

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    admin = _require_admin()
    if not admin:
        return jsonify({'error': 'Forbidden'}), 403

    with get_db() as conn:
        users = conn.execute(
            'SELECT id, username, avatar, bio, is_site_admin, last_seen, created_at FROM users ORDER BY created_at DESC'
        ).fetchall()

    return jsonify({'users': [dict(u) for u in users]}), 200


@admin_bp.route('/users/<int:user_id>/toggle-admin', methods=['PUT'])
@jwt_required()
def toggle_site_admin(user_id):
    admin = _require_admin()
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
@jwt_required()
def delete_user(user_id):
    admin = _require_admin()
    if not admin:
        return jsonify({'error': 'Forbidden'}), 403
    if admin['id'] == user_id:
        return jsonify({'error': 'Cannot delete yourself'}), 400

    with get_db() as conn:
        if not conn.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone():
            return jsonify({'error': 'User not found'}), 404

        if _socketio:
            _socketio.emit('account_deleted', {}, room=f'user_{user_id}')

        conn.execute('DELETE FROM whiteboards WHERE created_by = ?', (user_id,))
        conn.execute('DELETE FROM polls WHERE created_by = ?', (user_id,))
        conn.execute('DELETE FROM teams WHERE created_by = ?', (user_id,))
        conn.execute('DELETE FROM chats WHERE created_by = ?', (user_id,))
        conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()

    return jsonify({'message': 'User deleted'}), 200


# ---- КОМАНДЫ ----

@admin_bp.route('/teams', methods=['GET'])
@jwt_required()
def get_all_teams():
    admin = _require_admin()
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
@jwt_required()
def delete_team(team_id):
    admin = _require_admin()
    if not admin:
        return jsonify({'error': 'Forbidden'}), 403

    with get_db() as conn:
        if not conn.execute('SELECT id FROM teams WHERE id = ?', (team_id,)).fetchone():
            return jsonify({'error': 'Team not found'}), 404

        conn.execute('DELETE FROM teams WHERE id = ?', (team_id,))
        conn.commit()

    if _socketio:
        _socketio.emit('team_deleted', {'team_id': team_id}, room=f'team_{team_id}')

    return jsonify({'message': 'Team deleted'}), 200
