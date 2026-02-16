from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db
import sqlite3
import base64

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

def authenticate(username, password):
    """Проверяет учетные данные и возвращает пользователя или None"""
    with get_db() as conn:
        user = conn.execute(
            'SELECT * FROM users WHERE username = ?', (username,)
        ).fetchone()
    if user and check_password_hash(user['password_hash'], password):
        return user
    return None

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    password2 = data.get('password2')

    if not username or not password or not password2:
        return jsonify({'error': 'Username, password and password confirmation are required'}), 400

    if password != password2:
        return jsonify({'error': 'Passwords do not match'}), 400

    password_hash = generate_password_hash(password)

    try:
        with get_db() as conn:
            conn.execute(
                'INSERT INTO users (username, password_hash, bio) VALUES (?, ?, ?)',
                (username, password_hash, 'Добавьте описание о себе')
            )
            conn.commit()

            # Получаем созданного пользователя
            user = conn.execute(
                'SELECT id, username, avatar, bio FROM users WHERE username = ?',
                (username,)
            ).fetchone()

    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 409

    return jsonify({
        'message': 'User created successfully',
        'user': {
            'id': user['id'],
            'username': user['username'],
            'avatar': user['avatar'],
            'bio': user['bio']
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    user = authenticate(username, password)
    if user:
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'avatar': user['avatar'],
                'bio': user['bio']
            }
        }), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    # Заглушка для выхода (клиент сам удаляет локальные данные)
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    new_username = data.get('new_username')
    new_bio = data.get('new_bio')

    if not username or not password or not new_username or not new_bio:
        return jsonify({'error': 'Missing fields'}), 400

    # Проверка длины bio
    if len(new_bio) > 100:
        return jsonify({'error': 'Bio must be less than 100 characters'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        # Проверка уникальности нового username, если он меняется
        if new_username != username:
            existing = conn.execute(
                'SELECT id FROM users WHERE username = ?',
                (new_username,)
            ).fetchone()
            if existing:
                return jsonify({'error': 'Username already taken'}), 409

        conn.execute(
            'UPDATE users SET username = ?, bio = ? WHERE id = ?',
            (new_username, new_bio, user['id'])
        )
        conn.commit()

    return jsonify({'message': 'Profile updated successfully'}), 200

@auth_bp.route('/profile/avatar', methods=['POST'])
def upload_avatar():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    avatar = data.get('avatar')  # ожидается base64 строка

    if not username or not password or not avatar:
        return jsonify({'error': 'Missing fields'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    # Проверка размера (5MB max)
    try:
        if avatar.startswith('data:image'):
            base64_data = avatar.split(',')[1]
        else:
            base64_data = avatar

        decoded = base64.b64decode(base64_data)
        size_mb = len(decoded) / (1024 * 1024)

        if size_mb > 5:
            return jsonify({'error': 'Image size exceeds 5MB limit'}), 400
    except Exception:
        return jsonify({'error': 'Invalid image data'}), 400

    with get_db() as conn:
        conn.execute(
            'UPDATE users SET avatar = ? WHERE id = ?',
            (avatar, user['id'])
        )
        conn.commit()

    return jsonify({'message': 'Avatar updated successfully'}), 200

@auth_bp.route('/profile/avatar', methods=['DELETE'])
def delete_avatar():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing fields'}), 400

    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    with get_db() as conn:
        conn.execute(
            'UPDATE users SET avatar = NULL WHERE id = ?',
            (user['id'],)
        )
        conn.commit()

    return jsonify({'message': 'Avatar deleted successfully'}), 200