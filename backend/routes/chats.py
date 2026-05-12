from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db
from routes.auth import get_current_user

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chats')


@chat_bp.route('', methods=['POST'])
@jwt_required()
def create_chat():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    chat_type = data.get('type')
    name = data.get('name', '')
    member_ids = data.get('member_ids', [])

    if chat_type not in ('private', 'group'):
        return jsonify({'error': 'Invalid chat type'}), 400
    if chat_type == 'group' and not name:
        return jsonify({'error': 'Group chat requires a name'}), 400
    if not member_ids and chat_type == 'group':
        return jsonify({'error': 'Group must have at least one member besides creator'}), 400

    with get_db() as conn:
        cur = conn.execute(
            'INSERT INTO chats (name, type, created_by) VALUES (?, ?, ?)',
            (name, chat_type, user['id'])
        )
        chat_id = cur.lastrowid
        conn.execute(
            'INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
            (chat_id, user['id'], 'admin')
        )
        for uid in member_ids:
            conn.execute(
                'INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
                (chat_id, uid, 'member')
            )
        conn.commit()

    return jsonify({'chat_id': chat_id, 'message': 'Chat created'}), 201


@chat_bp.route('', methods=['GET'])
@jwt_required()
def get_chats():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        chats = conn.execute('''
            SELECT c.*, cm.role,
                   (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count
            FROM chats c
            JOIN chat_members cm ON c.id = cm.chat_id
            WHERE cm.user_id = ?
            ORDER BY c.created_at DESC
        ''', (user['id'],)).fetchall()

    return jsonify([dict(chat) for chat in chats]), 200


@chat_bp.route('/<int:chat_id>', methods=['GET'])
@jwt_required()
def get_chat(chat_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        member = conn.execute(
            'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?',
            (chat_id, user['id'])
        ).fetchone()
        if not member:
            return jsonify({'error': 'Access denied'}), 403

        chat = conn.execute('SELECT * FROM chats WHERE id = ?', (chat_id,)).fetchone()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        members = conn.execute('''
            SELECT u.id, u.username, cm.role, cm.joined_at
            FROM users u
            JOIN chat_members cm ON u.id = cm.user_id
            WHERE cm.chat_id = ?
        ''', (chat_id,)).fetchall()

    result = dict(chat)
    result['members'] = [dict(m) for m in members]
    return jsonify(result), 200


@chat_bp.route('/<int:chat_id>', methods=['PUT'])
@jwt_required()
def update_chat(chat_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    new_name = data.get('name')
    if not new_name:
        return jsonify({'error': 'New name required'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        member = conn.execute(
            'SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?',
            (chat_id, user['id'])
        ).fetchone()
        if not member or member['role'] != 'admin':
            return jsonify({'error': 'Only admin can update chat'}), 403

        conn.execute('UPDATE chats SET name = ? WHERE id = ?', (new_name, chat_id))
        conn.commit()

    return jsonify({'message': 'Chat updated'}), 200


@chat_bp.route('/<int:chat_id>', methods=['DELETE'])
@jwt_required()
def delete_chat(chat_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        chat = conn.execute('SELECT created_by FROM chats WHERE id = ?', (chat_id,)).fetchone()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        if chat['created_by'] != user['id']:
            return jsonify({'error': 'Only creator can delete chat'}), 403

        conn.execute('DELETE FROM chats WHERE id = ?', (chat_id,))
        conn.commit()

    return jsonify({'message': 'Chat deleted'}), 200


@chat_bp.route('/<int:chat_id>/members', methods=['POST'])
@jwt_required()
def add_members(chat_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    new_member_ids = data.get('member_ids', [])
    if not new_member_ids:
        return jsonify({'error': 'No members to add'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        member = conn.execute(
            'SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?',
            (chat_id, user['id'])
        ).fetchone()
        if not member or member['role'] != 'admin':
            return jsonify({'error': 'Admin rights required'}), 403

        for uid in new_member_ids:
            conn.execute(
                'INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
                (chat_id, uid, 'member')
            )
        conn.commit()

    return jsonify({'message': 'Members added'}), 200


@chat_bp.route('/<int:chat_id>/members/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(chat_id, user_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if user['id'] != user_id:
            member = conn.execute(
                'SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?',
                (chat_id, user['id'])
            ).fetchone()
            if not member or member['role'] != 'admin':
                return jsonify({'error': 'Admin rights required to remove others'}), 403

        conn.execute(
            'DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?',
            (chat_id, user_id)
        )
        conn.commit()

    return jsonify({'message': 'Member removed'}), 200
