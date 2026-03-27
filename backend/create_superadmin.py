"""
Создаёт суперадмина сайта. Логин и пароль берутся из database.py.
Запуск: python create_superadmin.py
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from werkzeug.security import generate_password_hash
from database import get_db, SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD
from datetime import datetime

with get_db() as conn:
    existing = conn.execute('SELECT id FROM users WHERE username = ?', (SUPERADMIN_USERNAME,)).fetchone()
    if existing:
        conn.execute('UPDATE users SET is_site_admin = 1 WHERE username = ?', (SUPERADMIN_USERNAME,))
        conn.commit()
        print(f'Пользователь "{SUPERADMIN_USERNAME}" уже существует — назначен суперадмином.')
    else:
        password_hash = generate_password_hash(SUPERADMIN_PASSWORD)
        conn.execute(
            'INSERT INTO users (username, password_hash, bio, last_seen, is_site_admin) VALUES (?, ?, ?, ?, ?)',
            (SUPERADMIN_USERNAME, password_hash, 'Суперадминистратор сайта', datetime.now(), 1)
        )
        conn.commit()
        print(f'Суперадмин создан: логин="{SUPERADMIN_USERNAME}", пароль="{SUPERADMIN_PASSWORD}"')
