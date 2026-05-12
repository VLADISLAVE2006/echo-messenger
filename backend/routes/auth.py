import base64
import sqlite3
from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

from database import get_db

auth_bp = Blueprint('auth', __name__, url_prefix='/api')


def get_current_user():
    """Возвращает пользователя по JWT identity. Использовать внутри @jwt_required()."""
    user_id = int(get_jwt_identity())
    with get_db() as conn:
        return conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()


def authenticate(username, password):
    """Legacy-helper для сокет-событий и базовой проверки учётных данных."""
    if not username or not password:
        return None
    with get_db() as conn:
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        if not user or not check_password_hash(user['password_hash'], password):
            return None
        conn.execute('UPDATE users SET last_seen = ? WHERE id = ?', (datetime.now(), user['id']))
        conn.commit()
    return user


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    username = data.get('username', '').strip()
    password = data.get('password')
    password2 = data.get('password2')

    if not username or not password or not password2:
        return jsonify({'error': 'Username, password and confirmation are required'}), 400
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    if password != password2:
        return jsonify({'error': 'Passwords do not match'}), 400

    try:
        with get_db() as conn:
            conn.execute(
                'INSERT INTO users (username, password_hash, bio, last_seen) VALUES (?, ?, ?, ?)',
                (username, generate_password_hash(password), 'Добавьте описание о себе', datetime.now())
            )
            conn.commit()
            user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 409

    token = create_access_token(identity=str(user['id']))
    return jsonify({
        'message': 'User created successfully',
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'avatar': user['avatar'],
            'bio': user['bio'],
            'is_site_admin': bool(user['is_site_admin'])
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
    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401

    token = create_access_token(identity=str(user['id']))
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'avatar': user['avatar'],
            'bio': user['bio'],
            'is_site_admin': bool(user['is_site_admin'])
        }
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'user': {
            'id': user['id'],
            'username': user['username'],
            'avatar': user['avatar'],
            'bio': user['bio'],
            'is_site_admin': bool(user['is_site_admin']),
        }
    }), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    new_username = data.get('new_username', '').strip()
    new_bio = data.get('new_bio', '').strip()

    if not new_username or not new_bio:
        return jsonify({'error': 'Missing fields'}), 400
    if len(new_bio) > 100:
        return jsonify({'error': 'Bio must be less than 100 characters'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if new_username != user['username']:
            if conn.execute('SELECT id FROM users WHERE username = ?', (new_username,)).fetchone():
                return jsonify({'error': 'Username already taken'}), 409

        conn.execute(
            'UPDATE users SET username = ?, bio = ?, last_seen = ? WHERE id = ?',
            (new_username, new_bio, datetime.now(), user['id'])
        )
        conn.commit()

    return jsonify({'message': 'Profile updated successfully'}), 200


@auth_bp.route('/profile/avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    avatar = data.get('avatar')
    if not avatar:
        return jsonify({'error': 'Missing avatar'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        base64_data = avatar.split(',')[1] if avatar.startswith('data:image') else avatar
        if len(base64.b64decode(base64_data)) / (1024 * 1024) > 5:
            return jsonify({'error': 'Image size exceeds 5MB limit'}), 400
    except Exception:
        return jsonify({'error': 'Invalid image data'}), 400

    with get_db() as conn:
        conn.execute(
            'UPDATE users SET avatar = ?, last_seen = ? WHERE id = ?',
            (avatar, datetime.now(), user['id'])
        )
        conn.commit()

    return jsonify({'message': 'Avatar updated successfully'}), 200


@auth_bp.route('/profile/avatar', methods=['DELETE'])
@jwt_required()
def delete_avatar():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        conn.execute(
            'UPDATE users SET avatar = NULL, last_seen = ? WHERE id = ?',
            (datetime.now(), user['id'])
        )
        conn.commit()

    return jsonify({'message': 'Avatar deleted successfully'}), 200
