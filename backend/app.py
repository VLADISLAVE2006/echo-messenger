from flask import Flask
from flask_cors import CORS
from database import init_db

from auth_routes import auth_bp
from chat_routes import chat_bp
from message_routes import message_bp

app = Flask(__name__)
CORS(app)

# Инициализация БД при запуске
init_db()

# Регистрация blueprint'ов
app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(message_bp)

if __name__ == '__main__':
    app.run(debug=True)