from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db
from routes.auth import get_current_user

message_bp = Blueprint('message', __name__, url_prefix='/api/messages')


@message_bp.route('', methods=['POST'])
@jwt_required()
def send_message():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    chat_id = data.get('chat_id')
    content = data.get('content')
    if not chat_id or not content:
        return jsonify({'error': 'chat_id and content required'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        member = conn.execute(
            'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?',
            (chat_id, user['id'])
        ).fetchone()
        if not member:
            return jsonify({'error': 'You are not a member of this chat'}), 403

        cur = conn.execute(
            'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ?, ?)',
            (chat_id, user['id'], content)
        )
        conn.commit()

    return jsonify({'message_id': cur.lastrowid, 'status': 'sent'}), 201


@message_bp.route('', methods=['GET'])
@jwt_required()
def get_messages():
    chat_id = request.args.get('chat_id')
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    if not chat_id:
        return jsonify({'error': 'chat_id required'}), 400

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

        messages = conn.execute('''
            SELECT m.id, m.chat_id, m.user_id, m.content, m.created_at, m.updated_at,
                   u.username, u.avatar
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.chat_id = ? AND m.is_deleted = 0
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        ''', (chat_id, limit, offset)).fetchall()

    return jsonify([dict(msg) for msg in messages]), 200


@message_bp.route('/<int:message_id>', methods=['PUT'])
@jwt_required()
def edit_message(message_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    new_content = data.get('content')
    if not new_content:
        return jsonify({'error': 'New content required'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        message = conn.execute('SELECT * FROM messages WHERE id = ?', (message_id,)).fetchone()
        if not message or message['user_id'] != user['id']:
            return jsonify({'error': 'Message not found or not yours'}), 404

        conn.execute(
            'UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (new_content, message_id)
        )
        conn.commit()

    return jsonify({'message': 'Message updated'}), 200


@message_bp.route('/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        message = conn.execute('SELECT * FROM messages WHERE id = ?', (message_id,)).fetchone()
        if not message or message['user_id'] != user['id']:
            return jsonify({'error': 'Message not found or not yours'}), 404

        conn.execute(
            'UPDATE messages SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (message_id,)
        )
        conn.commit()

    return jsonify({'message': 'Message deleted'}), 200
