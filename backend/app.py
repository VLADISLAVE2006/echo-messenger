from flask import Flask
from flask_cors import CORS
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

init_db()

app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(message_bp)
app.register_blueprint(team_bp)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)