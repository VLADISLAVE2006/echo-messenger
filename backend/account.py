import sqlite3
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
DATABASE = 'users.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        ''')
        conn.commit()

@app.before_request
def before_first_request():
    init_db()

def authenticate(username, password):
    """Проверяет учетные данные и возвращает пользователя или None"""
    with get_db() as conn:
        user = conn.execute(
            'SELECT * FROM users WHERE username = ?',
            (username,)
        ).fetchone()
    if user and check_password_hash(user['password_hash'], password):
        return user
    return None

@app.route('/register', methods=['POST'])
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
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 409

    return jsonify({'message': 'User created successfully'}), 201

@app.route('/login', methods=['POST'])
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

@app.route('/logout', methods=['POST'])
def logout():
    """Просто заглушка для выхода (клиент должен удалить локальные данные)"""
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/user/username', methods=['PUT'])
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

@app.route('/user/password', methods=['PUT'])
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

@app.route('/user', methods=['DELETE'])
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

if __name__ == '__main__':
    app.run(debug=True)