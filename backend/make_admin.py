"""
Утилита для назначения суперадмина сайта.
Запуск: python make_admin.py <username>
"""
import sys
from database import get_db

def make_site_admin(username):
    with get_db() as conn:
        user = conn.execute('SELECT id, username, is_site_admin FROM users WHERE username = ?', (username,)).fetchone()
        if not user:
            print(f'Пользователь "{username}" не найден.')
            return
        conn.execute('UPDATE users SET is_site_admin = 1 WHERE id = ?', (user['id'],))
        conn.commit()
        print(f'Пользователь "{username}" назначен суперадмином.')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Использование: python make_admin.py <username>')
        sys.exit(1)
    make_site_admin(sys.argv[1])
