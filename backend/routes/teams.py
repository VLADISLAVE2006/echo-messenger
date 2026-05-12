import base64
from datetime import datetime

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from database import get_db
from routes.auth import get_current_user
from sockets.events import online_users

team_bp = Blueprint('team', __name__, url_prefix='/api')


# ---- Вспомогательные функции ----

def is_team_creator(conn, team_id, user_id):
    team = conn.execute('SELECT created_by FROM teams WHERE id = ?', (team_id,)).fetchone()
    return team and team['created_by'] == user_id


def is_team_admin(conn, team_id, user_id):
    roles = conn.execute(
        'SELECT role_name FROM team_roles WHERE team_id = ? AND user_id = ?',
        (team_id, user_id)
    ).fetchall()
    return any(r['role_name'] == 'Admin' for r in roles)


def validate_image(avatar):
    """Проверяет base64-изображение. Возвращает None или строку ошибки."""
    try:
        base64_data = avatar.split(',')[1] if avatar.startswith('data:image') else avatar
        decoded = base64.b64decode(base64_data)
        if len(decoded) / (1024 * 1024) > 5:
            return 'Image size exceeds 5MB limit'
    except Exception:
        return 'Invalid image data'
    return None


# ---- КОМАНДЫ ----

@team_bp.route('/teams', methods=['GET'])
@jwt_required()
def get_teams():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        teams = conn.execute('''
            SELECT DISTINCT t.*,
                   (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
            FROM teams t
            JOIN team_members tm ON t.id = tm.team_id
            WHERE tm.user_id = ?
            ORDER BY t.created_at DESC
        ''', (user['id'],)).fetchall()

    return jsonify({'teams': [dict(t) for t in teams]}), 200


@team_bp.route('/teams', methods=['POST'])
@jwt_required()
def create_team():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    name = data.get('name', '').strip()
    description = data.get('description', '')
    is_private = data.get('is_private', False)
    avatar = data.get('avatar')

    if not name:
        return jsonify({'error': 'Team name is required'}), 400
    if len(description) > 80:
        return jsonify({'error': 'Description must be less than 80 characters'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if avatar:
        err = validate_image(avatar)
        if err:
            return jsonify({'error': err}), 400

    with get_db() as conn:
        chat_cur = conn.execute(
            'INSERT INTO chats (name, type, created_by) VALUES (?, ?, ?)',
            (f'{name} Chat', 'group', user['id'])
        )
        chat_id = chat_cur.lastrowid

        conn.execute(
            'INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
            (chat_id, user['id'], 'admin')
        )

        cur = conn.execute(
            'INSERT INTO teams (name, description, is_private, avatar, created_by, chat_id) VALUES (?, ?, ?, ?, ?, ?)',
            (name, description, 1 if is_private else 0, avatar, user['id'], chat_id)
        )
        team_id = cur.lastrowid

        conn.execute(
            'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
            (team_id, user['id'])
        )
        conn.execute(
            'INSERT INTO team_roles (team_id, user_id, role_name) VALUES (?, ?, ?)',
            (team_id, user['id'], 'Admin')
        )
        conn.commit()

    return jsonify({'message': 'Team created successfully', 'team_id': team_id, 'chat_id': chat_id}), 200


@team_bp.route('/teams/<int:team_id>', methods=['GET'])
@jwt_required()
def get_team(team_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        team = conn.execute('SELECT * FROM teams WHERE id = ?', (team_id,)).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404

        member_count = conn.execute(
            'SELECT COUNT(*) as count FROM team_members WHERE team_id = ?', (team_id,)
        ).fetchone()['count']

        members_raw = conn.execute('''
            SELECT u.id, u.username, u.avatar, u.last_seen
            FROM users u
            JOIN team_members tm ON u.id = tm.user_id
            WHERE tm.team_id = ?
        ''', (team_id,)).fetchall()

        members = []
        for m in members_raw:
            roles = conn.execute(
                'SELECT role_name FROM team_roles WHERE team_id = ? AND user_id = ?',
                (team_id, m['id'])
            ).fetchall()
            members.append({
                'id': m['id'],
                'username': m['username'],
                'avatar': m['avatar'],
                'roles': [r['role_name'] for r in roles],
                'is_online': team_id in online_users and m['id'] in online_users[team_id]
            })

        active_poll = None
        if team['active_poll_id']:
            poll_row = conn.execute('''
                SELECT p.*, u.username as created_by
                FROM polls p JOIN users u ON p.created_by = u.id
                WHERE p.id = ?
            ''', (team['active_poll_id'],)).fetchone()

            if poll_row:
                options = conn.execute('''
                    SELECT po.id, po.text,
                           COUNT(pv.id) as votes,
                           CASE WHEN EXISTS (
                               SELECT 1 FROM poll_votes pv2
                               WHERE pv2.option_id = po.id AND pv2.user_id = ?
                           ) THEN 1 ELSE 0 END as voted_by_current_user
                    FROM poll_options po
                    LEFT JOIN poll_votes pv ON po.id = pv.option_id
                    WHERE po.poll_id = ?
                    GROUP BY po.id ORDER BY po.id
                ''', (user['id'], poll_row['id'])).fetchall()

                active_poll = {
                    'id': poll_row['id'],
                    'question': poll_row['question'],
                    'created_by': poll_row['created_by'],
                    'created_at': poll_row['created_at'],
                    'options': [dict(o) for o in options]
                }

    team_dict = dict(team)
    team_dict['member_count'] = member_count

    return jsonify({'team': team_dict, 'members': members, 'active_poll': active_poll}), 200


@team_bp.route('/teams/public', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_public_teams():
    if request.method == 'OPTIONS':
        return '', 200

    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401

    with get_db() as conn:
        teams = conn.execute('''
            SELECT t.*,
                   (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
                   EXISTS(SELECT 1 FROM team_members WHERE team_id = t.id AND user_id = ?) as is_member,
                   EXISTS(SELECT 1 FROM join_requests WHERE team_id = t.id AND user_id = ? AND status = 'pending') as has_pending_request
            FROM teams t
            ORDER BY t.created_at DESC
        ''', (user['id'], user['id'])).fetchall()

    return jsonify({'teams': [dict(t) for t in teams]}), 200


@team_bp.route('/teams/<int:team_id>', methods=['PUT'])
@jwt_required()
def update_team(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not is_team_creator(conn, team_id, user['id']):
            return jsonify({'error': 'Only team creator can update team'}), 403

        team = conn.execute('SELECT * FROM teams WHERE id = ?', (team_id,)).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404

        name = data.get('name')
        description = data.get('description')
        is_private = data.get('is_private')
        avatar = data.get('avatar')

        if description is not None and len(description) > 80:
            return jsonify({'error': 'Description must be less than 80 characters'}), 400

        if avatar:
            err = validate_image(avatar)
            if err:
                return jsonify({'error': err}), 400

        updates, values = [], []
        if name is not None:
            updates.append('name = ?'); values.append(name)
        if description is not None:
            updates.append('description = ?'); values.append(description)
        if is_private is not None:
            updates.append('is_private = ?'); values.append(1 if is_private else 0)
        if avatar is not None:
            updates.append('avatar = ?'); values.append(avatar)

        if not updates:
            return jsonify({'error': 'No fields to update'}), 400

        values.append(team_id)
        conn.execute(f"UPDATE teams SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()

    return jsonify({'message': 'Team updated successfully'}), 200


@team_bp.route('/teams/<int:team_id>', methods=['DELETE'])
@jwt_required()
def delete_team(team_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not is_team_creator(conn, team_id, user['id']):
            return jsonify({'error': 'Only team creator can delete team'}), 403

        if not conn.execute('SELECT id FROM teams WHERE id = ?', (team_id,)).fetchone():
            return jsonify({'error': 'Team not found'}), 404

        conn.execute('DELETE FROM teams WHERE id = ?', (team_id,))
        conn.commit()

    return jsonify({'message': 'Team deleted successfully'}), 200


# ---- УЧАСТНИКИ ----

@team_bp.route('/teams/<int:team_id>/members/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_team_member(team_id, user_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not is_team_creator(conn, team_id, user['id']):
            return jsonify({'error': 'Only team creator can remove members'}), 403
        if user_id == user['id']:
            return jsonify({'error': 'Cannot remove team creator'}), 400

        team = conn.execute('SELECT chat_id FROM teams WHERE id = ?', (team_id,)).fetchone()
        conn.execute('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', (team_id, user_id))
        conn.execute('DELETE FROM team_roles WHERE team_id = ? AND user_id = ?', (team_id, user_id))
        if team and team['chat_id']:
            conn.execute(
                'DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?',
                (team['chat_id'], user_id)
            )
        conn.commit()

    return jsonify({'message': 'Member removed successfully'}), 200


@team_bp.route('/teams/<int:team_id>/members/<int:user_id>/roles', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_member_roles(team_id, user_id):
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    new_roles = data.get('roles')
    if new_roles is None:
        return jsonify({'error': 'Missing fields'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Only Admin can change roles'}), 403
        if user['id'] == user_id:
            return jsonify({'error': 'Cannot edit your own roles'}), 400
        if is_team_admin(conn, team_id, user_id):
            return jsonify({'error': 'Cannot edit roles of another Admin'}), 403

        if not conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', (team_id, user_id)
        ).fetchone():
            return jsonify({'error': 'User not in team'}), 404

        custom_roles = list(dict.fromkeys(
            r.strip() for r in new_roles if r.strip() and r.strip() != 'Admin'
        ))
        for role in custom_roles:
            if len(role) > 30:
                return jsonify({'error': f'Role name too long: {role}'}), 400

        conn.execute(
            'DELETE FROM team_roles WHERE team_id = ? AND user_id = ? AND role_name != ?',
            (team_id, user_id, 'Admin')
        )
        for role_name in custom_roles:
            conn.execute(
                'INSERT INTO team_roles (team_id, user_id, role_name) VALUES (?, ?, ?)',
                (team_id, user_id, role_name)
            )
        conn.commit()

    return jsonify({'message': 'Roles updated successfully', 'roles': custom_roles}), 200


# ---- ЗАЯВКИ НА ВСТУПЛЕНИЕ ----

@team_bp.route('/teams/<int:team_id>/request', methods=['POST'])
@jwt_required()
def send_join_request(team_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        team = conn.execute('SELECT * FROM teams WHERE id = ?', (team_id,)).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404
        if team['is_private'] == 0:
            return jsonify({'error': 'This is a public team. Use direct join instead.'}), 400
        if conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', (team_id, user['id'])
        ).fetchone():
            return jsonify({'error': 'You are already a member of this team'}), 400
        if conn.execute(
            "SELECT * FROM join_requests WHERE team_id = ? AND user_id = ? AND status = 'pending'",
            (team_id, user['id'])
        ).fetchone():
            return jsonify({'error': 'You already have a pending request for this team'}), 400

        cur = conn.execute(
            'INSERT INTO join_requests (team_id, user_id, status) VALUES (?, ?, ?)',
            (team_id, user['id'], 'pending')
        )
        conn.commit()

    return jsonify({'message': 'Request sent successfully', 'request_id': cur.lastrowid}), 200


@team_bp.route('/teams/<int:team_id>/join', methods=['POST'])
@jwt_required()
def join_team_instantly(team_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        team = conn.execute('SELECT * FROM teams WHERE id = ?', (team_id,)).fetchone()
        if not team:
            return jsonify({'error': 'Team not found'}), 404
        if team['is_private'] == 1:
            return jsonify({'error': 'Cannot join private team directly. Send a join request instead.'}), 403
        if conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', (team_id, user['id'])
        ).fetchone():
            return jsonify({'error': 'You are already a member of this team'}), 400

        conn.execute('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)', (team_id, user['id']))
        if team['chat_id']:
            conn.execute(
                'INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
                (team['chat_id'], user['id'], 'member')
            )
        conn.commit()

    return jsonify({'message': 'Successfully joined the team'}), 200


@team_bp.route('/teams/<int:team_id>/requests', methods=['GET'])
@jwt_required()
def get_join_requests(team_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Only admins can view requests'}), 403

        requests_raw = conn.execute('''
            SELECT jr.id, jr.user_id, jr.status, jr.created_at, u.username, u.avatar
            FROM join_requests jr
            JOIN users u ON jr.user_id = u.id
            WHERE jr.team_id = ? AND jr.status = 'pending'
            ORDER BY jr.created_at DESC
        ''', (team_id,)).fetchall()

    return jsonify({'requests': [dict(r) for r in requests_raw]}), 200


@team_bp.route('/teams/<int:team_id>/requests/<int:request_id>/approve', methods=['POST'])
@jwt_required()
def approve_request(team_id, request_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Only admins can approve requests'}), 403

        join_req = conn.execute(
            "SELECT * FROM join_requests WHERE id = ? AND team_id = ? AND status = 'pending'",
            (request_id, team_id)
        ).fetchone()
        if not join_req:
            return jsonify({'error': 'Request not found or already processed'}), 404

        if not conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
            (team_id, join_req['user_id'])
        ).fetchone():
            conn.execute(
                'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
                (team_id, join_req['user_id'])
            )

        team = conn.execute('SELECT chat_id FROM teams WHERE id = ?', (team_id,)).fetchone()
        if team and team['chat_id']:
            conn.execute(
                'INSERT OR IGNORE INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)',
                (team['chat_id'], join_req['user_id'], 'member')
            )

        conn.execute(
            'UPDATE join_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ('approved', request_id)
        )
        conn.commit()

    return jsonify({'message': 'Request approved successfully'}), 200


@team_bp.route('/teams/<int:team_id>/requests/<int:request_id>/reject', methods=['POST'])
@jwt_required()
def reject_request(team_id, request_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not is_team_admin(conn, team_id, user['id']):
            return jsonify({'error': 'Only admins can reject requests'}), 403

        join_req = conn.execute(
            "SELECT * FROM join_requests WHERE id = ? AND team_id = ? AND status = 'pending'",
            (request_id, team_id)
        ).fetchone()
        if not join_req:
            return jsonify({'error': 'Request not found or already processed'}), 404

        conn.execute(
            'UPDATE join_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ('rejected', request_id)
        )
        conn.commit()

    return jsonify({'message': 'Request rejected successfully'}), 200


# ---- СТАТИСТИКА ----

@team_bp.route('/teams/<int:team_id>/stats', methods=['GET'])
@jwt_required()
def get_team_stats(team_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', (team_id, user['id'])
        ).fetchone():
            return jsonify({'error': 'Not a team member'}), 403

        team = conn.execute('SELECT chat_id FROM teams WHERE id = ?', (team_id,)).fetchone()
        if not team or not team['chat_id']:
            return jsonify({'total_messages': 0, 'today_messages': 0})

        chat_id = team['chat_id']
        total = conn.execute(
            'SELECT COUNT(*) as count FROM messages WHERE chat_id = ?', (chat_id,)
        ).fetchone()['count']
        today = conn.execute(
            "SELECT COUNT(*) as count FROM messages WHERE chat_id = ? AND DATE(created_at) = DATE('now')",
            (chat_id,)
        ).fetchone()['count']

    return jsonify({'total_messages': total, 'today_messages': today})


# ---- ВАЙТБОРД ----

@team_bp.route('/teams/<int:team_id>/whiteboard', methods=['GET'])
@jwt_required()
def get_whiteboard(team_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', (team_id, user['id'])
        ).fetchone():
            return jsonify({'error': 'You are not a member of this team'}), 403

        whiteboard = conn.execute(
            'SELECT * FROM whiteboards WHERE team_id = ?', (team_id,)
        ).fetchone()

        if not whiteboard:
            cur = conn.execute(
                'INSERT INTO whiteboards (team_id, created_by) VALUES (?, ?)', (team_id, user['id'])
            )
            whiteboard_id = cur.lastrowid
            conn.execute(
                'INSERT INTO whiteboard_data (whiteboard_id, data) VALUES (?, ?)',
                (whiteboard_id, '{"elements":[]}')
            )
            conn.commit()
            data = '{"elements":[]}'
        else:
            whiteboard_id = whiteboard['id']
            wb_data = conn.execute(
                'SELECT data FROM whiteboard_data WHERE whiteboard_id = ? ORDER BY updated_at DESC LIMIT 1',
                (whiteboard_id,)
            ).fetchone()
            data = wb_data['data'] if wb_data else '{"elements":[]}'

    return jsonify({'whiteboard_id': whiteboard_id, 'data': data}), 200


@team_bp.route('/teams/<int:team_id>/whiteboard', methods=['PUT'])
@jwt_required()
def update_whiteboard(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400

    whiteboard_data = data.get('data')
    if not whiteboard_data:
        return jsonify({'error': 'Whiteboard data required'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', (team_id, user['id'])
        ).fetchone():
            return jsonify({'error': 'You are not a member of this team'}), 403

        whiteboard = conn.execute(
            'SELECT * FROM whiteboards WHERE team_id = ?', (team_id,)
        ).fetchone()
        if not whiteboard:
            return jsonify({'error': 'Whiteboard not found'}), 404

        # Обновляем существующую запись вместо INSERT — предотвращает бесконечный рост таблицы
        existing = conn.execute(
            'SELECT id FROM whiteboard_data WHERE whiteboard_id = ?', (whiteboard['id'],)
        ).fetchone()

        if existing:
            conn.execute(
                'UPDATE whiteboard_data SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE whiteboard_id = ?',
                (whiteboard_data, whiteboard['id'])
            )
        else:
            conn.execute(
                'INSERT INTO whiteboard_data (whiteboard_id, data) VALUES (?, ?)',
                (whiteboard['id'], whiteboard_data)
            )
        conn.commit()

    return jsonify({'message': 'Whiteboard updated successfully'}), 200


# ---- ГОЛОСОВАНИЯ (POLLS) ----

@team_bp.route('/teams/<int:team_id>/polls', methods=['POST'])
@jwt_required()
def create_poll(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    question = data.get('question')
    options = data.get('options', [])

    if not question or len(options) < 2:
        return jsonify({'error': 'Question and at least 2 options required'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', (team_id, user['id'])
        ).fetchone():
            return jsonify({'error': 'Not a team member'}), 403

        cur = conn.execute(
            'INSERT INTO polls (team_id, question, created_by) VALUES (?, ?, ?)',
            (team_id, question, user['id'])
        )
        poll_id = cur.lastrowid

        for option_text in options:
            conn.execute('INSERT INTO poll_options (poll_id, text) VALUES (?, ?)', (poll_id, option_text))

        conn.execute('UPDATE teams SET active_poll_id = ? WHERE id = ?', (poll_id, team_id))
        conn.commit()

        poll_options = conn.execute(
            'SELECT id, text FROM poll_options WHERE poll_id = ?', (poll_id,)
        ).fetchall()

    poll_data = {
        'id': poll_id,
        'question': question,
        'created_by': user['username'],
        'created_at': datetime.now().isoformat(),
        'options': [{'id': o['id'], 'text': o['text'], 'votes': 0} for o in poll_options]
    }

    current_app.extensions['socketio'].emit('new_poll', poll_data, room=f'team_{team_id}')
    return jsonify({'poll': poll_data}), 201


@team_bp.route('/teams/<int:team_id>/polls/<int:poll_id>/vote', methods=['POST'])
@jwt_required()
def vote_poll(team_id, poll_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    option_id = data.get('option_id')
    if option_id is None:
        return jsonify({'error': 'option_id required'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    with get_db() as conn:
        if not conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', (team_id, user['id'])
        ).fetchone():
            return jsonify({'error': 'Not a team member'}), 403

        if not conn.execute(
            'SELECT * FROM polls WHERE id = ? AND team_id = ?', (poll_id, team_id)
        ).fetchone():
            return jsonify({'error': 'Poll not found'}), 404

        if not conn.execute(
            'SELECT * FROM poll_options WHERE id = ? AND poll_id = ?', (option_id, poll_id)
        ).fetchone():
            return jsonify({'error': 'Option not found'}), 404

        if conn.execute(
            'SELECT * FROM poll_votes WHERE poll_id = ? AND user_id = ?', (poll_id, user['id'])
        ).fetchone():
            return jsonify({'error': 'Already voted'}), 400

        conn.execute(
            'INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)',
            (poll_id, option_id, user['id'])
        )
        conn.commit()

        vote_count = conn.execute(
            'SELECT COUNT(*) as count FROM poll_votes WHERE option_id = ?', (option_id,)
        ).fetchone()['count']

    return jsonify({'votes': vote_count}), 200


@team_bp.route('/teams/<int:team_id>/active-poll', methods=['POST'])
@jwt_required()
def set_active_poll(team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing JSON'}), 400

    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    poll_id = data.get('poll_id')

    with get_db() as conn:
        if not conn.execute(
            'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', (team_id, user['id'])
        ).fetchone():
            return jsonify({'error': 'Not a team member'}), 403

        conn.execute('UPDATE teams SET active_poll_id = ? WHERE id = ?', (poll_id, team_id))
        conn.commit()

    current_app.extensions['socketio'].emit('poll_closed', {'team_id': team_id}, room=f'team_{team_id}')
    return jsonify({'status': 'success'}), 200
