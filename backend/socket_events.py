from flask_socketio import emit, join_room, leave_room
from flask import request
from database import get_db
from auth_routes import authenticate
from datetime import datetime

# Глобальное хранилище онлайн пользователей
# Структура: { team_id: { user_id: socket_id } }
online_users = {}

def register_socket_events(socketio):
    """Регистрирует все WebSocket события"""
    
    # ==================== АУТЕНТИФИКАЦИЯ ====================
    
    @socketio.on('connect')
    def handle_connect():
        """Клиент подключился к WebSocket"""
        print(f'Client connected: {request.sid}')
        emit('connected', {'sid': request.sid})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Клиент отключился от WebSocket"""
        print(f'Client disconnected: {request.sid}')
        
        # Удаляем пользователя из всех команд
        for team_id in list(online_users.keys()):
            for user_id, sid in list(online_users[team_id].items()):
                if sid == request.sid:
                    del online_users[team_id][user_id]
                    
                    # Уведомляем команду об offline
                    socketio.emit('user_offline', {
                        'user_id': user_id,
                        'team_id': team_id
                    }, room=f'team_{team_id}')
                    
                    # Удаляем пустые команды
                    if not online_users[team_id]:
                        del online_users[team_id]
    
    # ==================== КОМАНДЫ (TEAMS) ====================
    
    @socketio.on('join_team')
    def handle_join_team(data):
        """
        Присоединение к комнате команды
        
        Payload:
        {
            "username": "string",
            "password": "string",
            "team_id": int
        }
        
        Response:
        {
            "status": "success",
            "team_id": int,
            "online_users": [user_id1, user_id2, ...]
        }
        """
        username = data.get('username')
        password = data.get('password')
        team_id = data.get('team_id')
        
        if not username or not password or not team_id:
            emit('error', {'message': 'Missing credentials or team_id'})
            return
        
        user = authenticate(username, password)
        if not user:
            emit('error', {'message': 'Invalid credentials'})
            return
        
        # Проверяем членство в команде
        with get_db() as conn:
            member = conn.execute(
                'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
                (team_id, user['id'])
            ).fetchone()
            
            if not member:
                emit('error', {'message': 'Not a team member'})
                return
        
        # Присоединяем к комнате
        room = f'team_{team_id}'
        join_room(room)
        
        # Добавляем в онлайн
        if team_id not in online_users:
            online_users[team_id] = {}
        online_users[team_id][user['id']] = request.sid
        
        # Получаем список онлайн пользователей
        online_user_ids = list(online_users[team_id].keys())
        
        # Уведомляем всех о новом онлайн пользователе
        emit('user_online', {
            'user_id': user['id'],
            'username': user['username'],
            'team_id': team_id
        }, room=room)
        
        # Отправляем подтверждение клиенту
        emit('joined_team', {
            'status': 'success',
            'team_id': team_id,
            'online_users': online_user_ids
        })
        
        print(f"User {user['username']} joined team {team_id}")
    
    @socketio.on('leave_team')
    def handle_leave_team(data):
        """
        Покидание комнаты команды
        
        Payload:
        {
            "username": "string",
            "password": "string",
            "team_id": int
        }
        """
        username = data.get('username')
        password = data.get('password')
        team_id = data.get('team_id')
        
        user = authenticate(username, password)
        if not user:
            return
        
        room = f'team_{team_id}'
        leave_room(room)
        
        # Удаляем из онлайн
        if team_id in online_users and user['id'] in online_users[team_id]:
            del online_users[team_id][user['id']]
            
            if not online_users[team_id]:
                del online_users[team_id]
        
        # Уведомляем об offline
        emit('user_offline', {
            'user_id': user['id'],
            'team_id': team_id
        }, room=room)
        
        print(f"User {user['username']} left team {team_id}")
    
    # ==================== ЧАТ ====================
    
    @socketio.on('send_message')
    def handle_send_message(data):
        """
        Отправка сообщения в чат команды
        
        Payload:
        {
            "username": "string",
            "password": "string",
            "team_id": int,
            "chat_id": int,
            "content": "string"
        }
        
        Broadcast to room:
        {
            "message_id": int,
            "chat_id": int,
            "user_id": int,
            "username": "string",
            "avatar": "string",
            "content": "string",
            "created_at": "ISO timestamp"
        }
        """
        username = data.get('username')
        password = data.get('password')
        team_id = data.get('team_id')
        chat_id = data.get('chat_id')
        content = data.get('content')
        
        if not content or not chat_id or not team_id:
            emit('error', {'message': 'Missing required fields'})
            return
        
        user = authenticate(username, password)
        if not user:
            emit('error', {'message': 'Invalid credentials'})
            return
        
        # Сохраняем сообщение в БД
        with get_db() as conn:
            # Проверяем членство в чате
            member = conn.execute(
                'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?',
                (chat_id, user['id'])
            ).fetchone()
            
            if not member:
                emit('error', {'message': 'Not a chat member'})
                return
            
            # Создаем сообщение
            cur = conn.execute(
                'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ?, ?)',
                (chat_id, user['id'], content)
            )
            message_id = cur.lastrowid
            conn.commit()
            
            # Получаем созданное сообщение с timestamp
            message = conn.execute(
                'SELECT * FROM messages WHERE id = ?',
                (message_id,)
            ).fetchone()
        
        # Формируем payload для broadcast
        message_data = {
            'id': message_id,
            'chat_id': chat_id,
            'user_id': user['id'],
            'username': user['username'],
            'avatar': user['avatar'],
            'content': content,
            'created_at': message['created_at']
        }
        
        # Отправляем всем в комнате команды
        room = f'team_{team_id}'
        emit('new_message', message_data, room=room, include_self=True)
        
        print(f"Message sent to team {team_id}: {content[:50]}...")
    
    @socketio.on('typing')
    def handle_typing(data):
        """
        Уведомление о печати
        
        Payload:
        {
            "username": "string",
            "team_id": int,
            "chat_id": int,
            "is_typing": bool
        }
        
        Broadcast:
        {
            "user_id": int,
            "username": "string",
            "chat_id": int,
            "is_typing": bool
        }
        """
        username = data.get('username')
        team_id = data.get('team_id')
        chat_id = data.get('chat_id')
        is_typing = data.get('is_typing', False)
        
        # Не требуем аутентификацию для typing indicator
        room = f'team_{team_id}'
        emit('user_typing', {
            'username': username,
            'chat_id': chat_id,
            'is_typing': is_typing
        }, room=room, include_self=False)
    
    # ==================== WHITEBOARD ====================
    
    @socketio.on('join_whiteboard')
    def handle_join_whiteboard(data):
        """
        Присоединение к вайтборду команды
        
        Payload:
        {
            "username": "string",
            "password": "string",
            "team_id": int
        }
        """
        username = data.get('username')
        password = data.get('password')
        team_id = data.get('team_id')
        
        user = authenticate(username, password)
        if not user:
            emit('error', {'message': 'Invalid credentials'})
            return
        
        # Присоединяем к whiteboard room
        room = f'whiteboard_{team_id}'
        join_room(room)
        
        emit('joined_whiteboard', {
            'status': 'success',
            'team_id': team_id
        })
        
        print(f"User {user['username']} joined whiteboard {team_id}")
    
    @socketio.on('whiteboard_draw')
    def handle_whiteboard_draw(data):
        """
        Отправка элемента рисования
        
        Payload:
        {
            "team_id": int,
            "element": {
                "type": "path" | "line" | "rectangle" | "circle" | "triangle",
                "color": "string",
                "lineWidth": number,
                "points": [...] | other shape data
            }
        }
        
        Broadcast:
        {
            "user_id": int,
            "username": "string",
            "element": { ... }
        }
        """
        team_id = data.get('team_id')
        element = data.get('element')
        username = data.get('username')
        
        if not team_id or not element:
            return
        
        room = f'whiteboard_{team_id}'
        
        # Отправляем всем кроме отправителя
        emit('whiteboard_update', {
            'username': username,
            'element': element
        }, room=room, include_self=False)
    
    @socketio.on('whiteboard_clear')
    def handle_whiteboard_clear(data):
        """
        Очистка вайтборда
        
        Payload:
        {
            "username": "string",
            "password": "string",
            "team_id": int
        }
        """
        username = data.get('username')
        password = data.get('password')
        team_id = data.get('team_id')
        
        user = authenticate(username, password)
        if not user:
            return
        
        room = f'whiteboard_{team_id}'
        
        # Уведомляем всех об очистке
        emit('whiteboard_cleared', {
            'username': user['username'],
            'team_id': team_id
        }, room=room, include_self=True)
        
        print(f"Whiteboard {team_id} cleared by {user['username']}")
    
    @socketio.on('leave_whiteboard')
    def handle_leave_whiteboard(data):
        """Покидание вайтборда"""
        team_id = data.get('team_id')
        room = f'whiteboard_{team_id}'
        leave_room(room)
    
    # ==================== ГОЛОСОВАНИЯ (POLLS) ====================
    
    @socketio.on('poll_created')
    def handle_poll_created(data):
        """
        Уведомление о создании голосования
        
        Payload:
        {
            "team_id": int,
            "poll": {
                "id": int,
                "question": "string",
                "options": [...],
                "created_by": "string"
            }
        }
        """
        team_id = data.get('team_id')
        poll = data.get('poll')
        
        if not team_id or not poll:
            return
        
        room = f'team_{team_id}'
        emit('new_poll', poll, room=room, include_self=False)
        
        print(f"New poll created in team {team_id}")
    
    @socketio.on('poll_vote')
    def handle_poll_vote(data):
        """
        Обновление результатов голосования
        
        Payload:
        {
            "team_id": int,
            "poll_id": int,
            "option_id": int,
            "username": "string"
        }
        
        Broadcast:
        {
            "poll_id": int,
            "option_id": int,
            "votes": int,
            "voter": "string"
        }
        """
        team_id = data.get('team_id')
        poll_id = data.get('poll_id')
        option_id = data.get('option_id')
        username = data.get('username')
        votes = data.get('votes', 0)
        
        if not team_id or poll_id is None or option_id is None:
            return
        
        room = f'team_{team_id}'
        
        # Отправляем обновление результатов
        emit('poll_updated', {
            'poll_id': poll_id,
            'option_id': option_id,
            'votes': votes,
            'voter': username
        }, room=room, include_self=True)
    
    # ==================== ЗАЯВКИ В КОМАНДУ ====================
    
    @socketio.on('join_request_created')
    def handle_join_request(data):
        """
        Уведомление админов о новой заявке
        
        Payload:
        {
            "team_id": int,
            "request": {
                "id": int,
                "user_id": int,
                "username": "string",
                "avatar": "string",
                "created_at": "ISO timestamp"
            }
        }
        """
        team_id = data.get('team_id')
        request_data = data.get('request')
        
        if not team_id or not request_data:
            return
        
        room = f'team_{team_id}'
        
        # Отправляем только админам (фронт сам отфильтрует)
        emit('new_join_request', {
            'team_id': team_id,
            'request': request_data
        }, room=room)
        
        print(f"New join request for team {team_id}")
    
    @socketio.on('join_request_approved')
    def handle_request_approved(data):
        """
        Уведомление об одобрении заявки
        
        Payload:
        {
            "team_id": int,
            "user_id": int,
            "username": "string"
        }
        """
        team_id = data.get('team_id')
        user_id = data.get('user_id')
        username = data.get('username')
        
        room = f'team_{team_id}'
        
        emit('member_joined', {
            'team_id': team_id,
            'user_id': user_id,
            'username': username
        }, room=room)
    
    @socketio.on('join_request_rejected')
    def handle_request_rejected(data):
        """Уведомление об отклонении заявки"""
        # Можно отправить уведомление конкретному пользователю
        # если храним mapping user_id -> socket_id
        pass
    
    # ==================== УТИЛИТЫ ====================
    
    @socketio.on('get_online_users')
    def handle_get_online_users(data):
        """
        Получение списка онлайн пользователей команды
        
        Payload:
        {
            "team_id": int
        }
        
        Response:
        {
            "team_id": int,
            "online_users": [user_id1, user_id2, ...]
        }
        """
        team_id = data.get('team_id')
        
        if not team_id:
            emit('error', {'message': 'Missing team_id'})
            return
        
        online_user_ids = list(online_users.get(team_id, {}).keys())
        
        emit('online_users_list', {
            'team_id': team_id,
            'online_users': online_user_ids
        })
    
    print("Socket events registered successfully")