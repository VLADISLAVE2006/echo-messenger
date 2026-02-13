from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db
import sqlite3

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
                'INSERT INTO users (username, password_hash) VALUES (?, ?)',
                (username, password_hash)
            )
            conn.commit()
    except sqlite3.IntegrityError:  # нужно импортировать sqlite3 в начале или перехватывать конкретное исключение
        return jsonify({'error': 'Username already exists'}), 409

    return jsonify({'message': 'User created successfully'}), 201

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
        return jsonify({'message': 'Login successful'}), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    # В stateless API (JWT) этот эндпоинт может просто подтверждать выход на клиенте.
    # Здесь оставляем как заглушку.
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/user/username', methods=['PUT'])
def change_username():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    new_username = data.get('new_username')

    if not username or not password or not new_username:
        return jsonify({'error': 'Username, password and new_username are required'}), 400

    # Аутентификация
    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    # Проверка, что новый username не занят
    with get_db() as conn:
        existing = conn.execute(
            'SELECT id FROM users WHERE username = ?',
            (new_username,)
        ).fetchone()
    if existing:
        return jsonify({'error': 'New username already taken'}), 409

    # Обновление
    with get_db() as conn:
        conn.execute(
            'UPDATE users SET username = ? WHERE id = ?',
            (new_username, user['id'])
        )
        conn.commit()

    return jsonify({'message': 'Username updated successfully'}), 200

@auth_bp.route('/user/password', methods=['PUT'])
def change_password():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')
    new_password = data.get('new_password')
    new_password2 = data.get('new_password2')

    if not username or not password or not new_password or not new_password2:
        return jsonify({'error': 'Username, password, new_password and new_password2 are required'}), 400

    if new_password != new_password2:
        return jsonify({'error': 'New passwords do not match'}), 400

    # Аутентификация
    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    new_hash = generate_password_hash(new_password)
    with get_db() as conn:
        conn.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            (new_hash, user['id'])
        )
        conn.commit()

    return jsonify({'message': 'Password updated successfully'}), 200

@auth_bp.route('/user', methods=['DELETE'])
def delete_account():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    # Аутентификация
    user = authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    # Удаление
    with get_db() as conn:
        conn.execute('DELETE FROM users WHERE id = ?', (user['id'],))
        conn.commit()

    return jsonify({'message': 'Account deleted successfully'}), 200