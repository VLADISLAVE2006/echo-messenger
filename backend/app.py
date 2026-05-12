from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import timedelta

from database import init_db
from routes.auth import auth_bp
from routes.chats import chat_bp
from routes.messages import message_bp
from routes.teams import team_bp
from routes.admin import admin_bp, init_socketio
from sockets.events import register_socket_events

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-key-change-in-production-32!'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=48)
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=48)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False

CORS(app,
     supports_credentials=True,
     origins=['http://localhost:3000'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'])

jwt = JWTManager(app)

limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=['300 per hour'],
    storage_uri='memory://'
)

socketio = SocketIO(
    app,
    cors_allowed_origins='http://localhost:3000',
    async_mode='threading',
    logger=False,
    engineio_logger=False
)

init_db()

app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(message_bp)
app.register_blueprint(team_bp)
app.register_blueprint(admin_bp)

register_socket_events(socketio)
init_socketio(socketio)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
