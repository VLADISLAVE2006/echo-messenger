from flask import Blueprint, request, jsonify
from database import get_db
from auth_routes import authenticate  # переиспользуем функцию аутентификации

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chats')

@chat_bp.route('', methods=['POST'])
def create_chat():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    # Аутентификация: ожидаем username и password в теле
    username = data.get('username')
    password = data.get('password')
    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    chat_type = data.get('type')  # 'private' или 'group'
    name = data.get('name', '')
    member_ids = data.get('member_ids', [])  # список ID участников (кроме создателя)

    if chat_type not in ('private', 'group'):
        return jsonify({'error': 'Invalid chat type'}), 400
    if chat_type == 'group' and not name:
        return jsonify({'error': 'Group chat requires a name'}), 400
    if not member_ids and chat_type == 'group':
        return jsonify({'error': 'Group must have at least one member besides creator'}), 400

    with get_db() as conn:
        # Создаём чат
        cur = conn.execute(
            'INSERT INTO chats (name, type, created_by) VALUES (?, ?, ?)',
            (name, chat_type, user['id'])
        )
        chat_id = cur.lastrowid

        # Добавляем создателя как участника с ролью admin
        conn.execute(
            'INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
            (chat_id, user['id'], 'admin')
        )

        # Добавляем остальных участников
        for uid in member_ids:
            # Проверяем, что пользователь существует (можно сделать проверку)
            conn.execute(
                'INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
                (chat_id, uid, 'member')
            )
        conn.commit()

    return jsonify({'chat_id': chat_id, 'message': 'Chat created'}), 201

@chat_bp.route('', methods=['GET'])
def get_chats():
    # Получаем список чатов, где участвует пользователь
    username = request.args.get('username')
    password = request.args.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required as query params'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

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
def get_chat(chat_id):
    username = request.args.get('username')
    password = request.args.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required as query params'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что пользователь является участником
        member = conn.execute(
            'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?',
            (chat_id, user['id'])
        ).fetchone()
        if not member:
            return jsonify({'error': 'Access denied'}), 403

        chat = conn.execute(
            'SELECT * FROM chats WHERE id = ?', (chat_id,)
        ).fetchone()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        # Получаем список участников
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
def update_chat(chat_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    new_name = data.get('name')

    if not new_name:
        return jsonify({'error': 'New name required'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что пользователь админ в этом чате
        member = conn.execute(
            'SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?',
            (chat_id, user['id'])
        ).fetchone()
        if not member or member['role'] != 'admin':
            return jsonify({'error': 'Only admin can update chat'}), 403

        conn.execute(
            'UPDATE chats SET name = ? WHERE id = ?',
            (new_name, chat_id)
        )
        conn.commit()

    return jsonify({'message': 'Chat updated'}), 200

@chat_bp.route('/<int:chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем, что пользователь создатель чата
        chat = conn.execute(
            'SELECT created_by FROM chats WHERE id = ?', (chat_id,)
        ).fetchone()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        if chat['created_by'] != user['id']:
            return jsonify({'error': 'Only creator can delete chat'}), 403

        conn.execute('DELETE FROM chats WHERE id = ?', (chat_id,))
        conn.commit()

    return jsonify({'message': 'Chat deleted'}), 200

@chat_bp.route('/<int:chat_id>/members', methods=['POST'])
def add_members(chat_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    new_member_ids = data.get('member_ids', [])

    if not new_member_ids:
        return jsonify({'error': 'No members to add'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем права (админ или создатель)
        member = conn.execute(
            'SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?',
            (chat_id, user['id'])
        ).fetchone()
        if not member or member['role'] != 'admin':
            return jsonify({'error': 'Admin rights required'}), 403

        # Добавляем новых участников
        for uid in new_member_ids:
            conn.execute(
                'INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
                (chat_id, uid, 'member')
            )
        conn.commit()

    return jsonify({'message': 'Members added'}), 200

@chat_bp.route('/<int:chat_id>/members/<int:user_id>', methods=['DELETE'])
def remove_member(chat_id, user_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверяем права (админ или удаляемый сам себя)
        if user['id'] != user_id:
            # Проверяем, что текущий пользователь админ
            member = conn.execute(
                'SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?',
                (chat_id, user['id'])
            ).fetchone()
            if not member or member['role'] != 'admin':
                return jsonify({'error': 'Admin rights required to remove others'}), 403

        # Удаляем участника
        conn.execute(
            'DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?',
            (chat_id, user_id)
        )
        conn.commit()

    return jsonify({'message': 'Member removed'}), 200