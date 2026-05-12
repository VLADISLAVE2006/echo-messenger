from flask_socketio import emit, join_room, leave_room
from flask import request
from flask_jwt_extended import decode_token
from database import get_db

# Глобальный реестр онлайн-пользователей
# Структура: { team_id: { user_id: socket_id } }
online_users = {}

# Аутентифицированные соединения: { sid: user_dict }
connected_users = {}


def register_socket_events(socketio):

    @socketio.on('connect')
    def handle_connect(auth):
        token = (auth or {}).get('token')
        if not token:
            return False
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
            with get_db() as conn:
                user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
            if not user:
                return False
            connected_users[request.sid] = dict(user)
        except Exception:
            return False
        emit('connected', {'sid': request.sid})

    @socketio.on('disconnect')
    def handle_disconnect():
        user = connected_users.pop(request.sid, None)
        if not user:
            return
        user_id = user['id']
        for team_id in list(online_users.keys()):
            if user_id in online_users[team_id]:
                del online_users[team_id][user_id]
                socketio.emit('user_offline', {'user_id': user_id, 'team_id': team_id}, room=f'team_{team_id}')
                if not online_users[team_id]:
                    del online_users[team_id]

    # ==================== КОМАНДЫ ====================

    @socketio.on('join_team')
    def handle_join_team(data):
        user = connected_users.get(request.sid)
        if not user:
            emit('error', {'message': 'Not authenticated'})
            return

        team_id = data.get('team_id')
        if not team_id:
            emit('error', {'message': 'Missing team_id'})
            return
        team_id = int(team_id)

        with get_db() as conn:
            if not conn.execute(
                'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
                (team_id, user['id'])
            ).fetchone():
                emit('error', {'message': 'Not a team member'})
                return

        room = f'team_{team_id}'
        join_room(room)

        if team_id not in online_users:
            online_users[team_id] = {}
        online_users[team_id][user['id']] = request.sid

        emit('joined_team', {
            'status': 'success',
            'team_id': team_id,
            'online_users': list(online_users[team_id].keys())
        }, room=room)

        emit('user_online', {
            'user_id': user['id'],
            'username': user['username'],
            'team_id': team_id
        }, room=room, include_self=False)

    @socketio.on('leave_team')
    def handle_leave_team(data):
        user = connected_users.get(request.sid)
        if not user:
            return

        team_id = int(data.get('team_id'))
        leave_room(f'team_{team_id}')

        if team_id in online_users and user['id'] in online_users[team_id]:
            del online_users[team_id][user['id']]
            if not online_users[team_id]:
                del online_users[team_id]

        socketio.emit('online_users_list', {
            'team_id': team_id,
            'online_users': list(online_users.get(team_id, {}).keys())
        }, room=f'team_{team_id}')

    # ==================== ЧАТ ====================

    @socketio.on('send_message')
    def handle_send_message(data):
        user = connected_users.get(request.sid)
        if not user:
            emit('error', {'message': 'Not authenticated'})
            return

        team_id = int(data.get('team_id'))
        chat_id = data.get('chat_id')
        content = data.get('content')

        if not content or not chat_id:
            emit('error', {'message': 'Missing required fields'})
            return

        with get_db() as conn:
            if not conn.execute(
                'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?',
                (chat_id, user['id'])
            ).fetchone():
                emit('error', {'message': 'Not a chat member'})
                return

            cur = conn.execute(
                'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ?, ?)',
                (chat_id, user['id'], content)
            )
            message_id = cur.lastrowid
            conn.commit()

            message = conn.execute('SELECT * FROM messages WHERE id = ?', (message_id,)).fetchone()

        emit('new_message', {
            'id': message_id,
            'team_id': team_id,
            'chat_id': chat_id,
            'user_id': user['id'],
            'username': user['username'],
            'avatar': user['avatar'],
            'content': content,
            'created_at': message['created_at']
        }, room=f'team_{team_id}', include_self=True)

    @socketio.on('typing')
    def handle_typing(data):
        team_id = int(data.get('team_id'))
        emit('user_typing', {
            'username': data.get('username'),
            'chat_id': data.get('chat_id'),
            'is_typing': data.get('is_typing', False)
        }, room=f'team_{team_id}', include_self=False)

    # ==================== ВАЙТБОРД ====================

    @socketio.on('join_whiteboard')
    def handle_join_whiteboard(data):
        user = connected_users.get(request.sid)
        if not user:
            emit('error', {'message': 'Not authenticated'})
            return
        team_id = int(data.get('team_id'))
        join_room(f'whiteboard_{team_id}')
        emit('joined_whiteboard', {'status': 'success', 'team_id': team_id})

    @socketio.on('leave_whiteboard')
    def handle_leave_whiteboard(data):
        leave_room(f'whiteboard_{int(data.get("team_id"))}')

    @socketio.on('whiteboard_draw')
    def handle_whiteboard_draw(data):
        team_id = int(data.get('team_id'))
        element = data.get('element')
        if not element:
            return
        user = connected_users.get(request.sid)
        emit('whiteboard_update', {
            'username': user['username'] if user else data.get('username'),
            'element': element
        }, room=f'whiteboard_{team_id}', include_self=False)

    @socketio.on('whiteboard_drawing')
    def handle_whiteboard_drawing(data):
        team_id = int(data.get('team_id'))
        element = data.get('element')
        if not element:
            return
        user = connected_users.get(request.sid)
        emit('whiteboard_live_drawing', {
            'username': user['username'] if user else data.get('username'),
            'element': element
        }, room=f'whiteboard_{team_id}', include_self=False)

    @socketio.on('whiteboard_cursor')
    def handle_whiteboard_cursor(data):
        team_id = int(data.get('team_id'))
        x, y = data.get('x'), data.get('y')
        if x is None or y is None:
            return
        user = connected_users.get(request.sid)
        emit('whiteboard_cursor_update', {
            'username': user['username'] if user else data.get('username'),
            'x': x, 'y': y
        }, room=f'whiteboard_{team_id}', include_self=False)

    @socketio.on('whiteboard_clear')
    def handle_whiteboard_clear(data):
        user = connected_users.get(request.sid)
        if not user:
            return
        team_id = int(data.get('team_id'))
        emit('whiteboard_cleared', {
            'username': user['username'],
            'team_id': team_id
        }, room=f'whiteboard_{team_id}', include_self=True)

    @socketio.on('whiteboard_sync')
    def handle_whiteboard_sync(data):
        team_id = int(data.get('team_id'))
        elements = data.get('elements')
        if elements is None:
            return
        user = connected_users.get(request.sid)
        emit('whiteboard_sync', {
            'username': user['username'] if user else data.get('username'),
            'elements': elements
        }, room=f'whiteboard_{team_id}', include_self=False)

    # ==================== ГОЛОСОВАНИЯ ====================

    @socketio.on('poll_vote')
    def handle_poll_vote(data):
        team_id = int(data.get('team_id'))
        poll_id = data.get('poll_id')
        option_id = data.get('option_id')
        if poll_id is None or option_id is None:
            return
        user = connected_users.get(request.sid)
        emit('poll_updated', {
            'poll_id': poll_id,
            'option_id': option_id,
            'votes': data.get('votes', 0),
            'voter': user['username'] if user else data.get('username')
        }, room=f'team_{team_id}', include_self=True)

    # ==================== ЗАЯВКИ В КОМАНДУ ====================

    @socketio.on('join_request_created')
    def handle_join_request(data):
        team_id = int(data.get('team_id'))
        request_data = data.get('request')
        if not request_data:
            return
        emit('new_join_request', {
            'team_id': team_id,
            'request': request_data
        }, room=f'team_{team_id}')

    @socketio.on('join_request_approved')
    def handle_request_approved(data):
        team_id = int(data.get('team_id'))
        emit('member_joined', {
            'team_id': team_id,
            'user_id': data.get('user_id'),
            'username': data.get('username')
        }, room=f'team_{team_id}')

    @socketio.on('join_request_rejected')
    def handle_request_rejected(data):
        pass

    # ==================== ЛИЧНАЯ КОМНАТА ====================

    @socketio.on('join_personal_room')
    def handle_join_personal_room(data):
        user = connected_users.get(request.sid)
        if not user:
            return
        join_room(f'user_{user["id"]}')

    # ==================== УТИЛИТЫ ====================

    @socketio.on('get_online_users')
    def handle_get_online_users(data):
        team_id = int(data.get('team_id'))
        emit('online_users_list', {
            'team_id': team_id,
            'online_users': list(online_users.get(team_id, {}).keys())
        })
