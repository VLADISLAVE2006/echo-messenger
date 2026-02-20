from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from datetime import timedelta

from database import init_db
from auth_routes import auth_bp
from chat_routes import chat_bp
from message_routes import message_bp
from team_routes import team_bp

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # замените на случайную строку
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=48)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # в продакшене с HTTPS установите True

# Расширенная настройка CORS для поддержки всех необходимых методов и заголовков
CORS(app,
     supports_credentials=True,
     origins=['http://localhost:3000'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'])

# Инициализация SocketIO
socketio = SocketIO(
    app,
    cors_allowed_origins='http://localhost:3000',
    async_mode='threading',
    logger=True,
    engineio_logger=True
)

init_db()

# Регистрация blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(message_bp)
app.register_blueprint(team_bp)

# Импорт и регистрация socket событий
from socket_events import register_socket_events
register_socket_events(socketio)

if __name__ == '__main__':
    # Запуск с SocketIO
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)