from flask import Blueprint, request, jsonify
from database import get_db
from auth_routes import authenticate

message_bp = Blueprint('message', __name__, url_prefix='/api/messages')

@message_bp.route('', methods=['POST'])
def send_message():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    chat_id = data.get('chat_id')
    content = data.get('content')

    if not chat_id or not content:
        return jsonify({'error': 'chat_id and content required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что пользователь состоит в чате
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
        message_id = cur.lastrowid
        conn.commit()

    return jsonify({'message_id': message_id, 'status': 'sent'}), 201

@message_bp.route('', methods=['GET'])
def get_messages():
    username = request.args.get('username')
    password = request.args.get('password')
    chat_id = request.args.get('chat_id')
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    if not username or not password or not chat_id:
        return jsonify({'error': 'username, password, chat_id required as query params'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем членство
        member = conn.execute(
            'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?',
            (chat_id, user['id'])
        ).fetchone()
        if not member:
            return jsonify({'error': 'Access denied'}), 403

        messages = conn.execute('''
            SELECT m.*, u.username
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.chat_id = ? AND m.is_deleted = 0
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        ''', (chat_id, limit, offset)).fetchall()

    return jsonify([dict(msg) for msg in messages]), 200

@message_bp.route('/<int:message_id>', methods=['PUT'])
def edit_message(message_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    new_content = data.get('content')

    if not new_content:
        return jsonify({'error': 'New content required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что сообщение принадлежит пользователю
        message = conn.execute(
            'SELECT * FROM messages WHERE id = ?', (message_id,)
        ).fetchone()
        if not message or message['user_id'] != user['id']:
            return jsonify({'error': 'Message not found or not yours'}), 404

        conn.execute(
            'UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (new_content, message_id)
        )
        conn.commit()

    return jsonify({'message': 'Message updated'}), 200

@message_bp.route('/<int:message_id>', methods=['DELETE'])
def delete_message(message_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что сообщение принадлежит пользователю
        message = conn.execute(
            'SELECT * FROM messages WHERE id = ?', (message_id,)
        ).fetchone()
        if not message or message['user_id'] != user['id']:
            return jsonify({'error': 'Message not found or not yours'}), 404

        # Мягкое удаление
        conn.execute(
            'UPDATE messages SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (message_id,)
        )
        conn.commit()

    return jsonify({'message': 'Message deleted'}), 200