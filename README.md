# Echo Messenger

Командный мессенджер с совместной доской, виджетами и голосованиями в реальном времени.

---

## Стек технологий

| Слой | Технология |
|---|---|
| Backend | Python 3, Flask, Flask-SocketIO, Flask-JWT-Extended, Flask-Limiter, SQLite |
| Frontend | React 19, Vite, Socket.IO Client, SCSS, dayjs |
| Архитектура | Feature-Sliced Design (FSD) |
| Аутентификация | JWT (Bearer-токен) |

---

## Структура проекта

```
echo-messenger/
├── backend/
│   ├── app.py                  # Точка входа Flask
│   ├── database.py             # Инициализация SQLite
│   ├── routes/
│   │   ├── auth.py             # Регистрация, вход, профиль
│   │   ├── teams.py            # CRUD команд, участники, роли
│   │   ├── chats.py            # Чаты команд
│   │   ├── messages.py         # Сообщения
│   │   └── admin.py            # Панель администратора
│   └── sockets/
│       └── events.py           # Все WebSocket-события
└── frontend/
    └── src/
        ├── app/                # App.jsx — роутинг
        ├── pages/              # Login, Dashboard, Teams, TeamWorkspace, Profile, AdminDashboard
        ├── widgets/            # ChatPanel, WhiteboardCanvas, MembersList, TeamPoll, ...
        ├── features/           # Модальные окна (создание / настройки / удаление)
        ├── entities/           # TeamCard
        └── shared/             # api, hooks, context, ui-компоненты
```

---

## Запуск проекта

### Требования

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install flask flask-cors flask-socketio flask-jwt-extended flask-limiter werkzeug
python app.py
```

Сервер запустится на `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Откройте `http://localhost:3000`.

---

## Продакшен-сборка фронтенда

```bash
cd frontend
npm run build
```

Статика окажется в `frontend/dist/`.

---

## Ключи безопасности

Для продакшена замените ключи в `backend/app.py`:

```python
app.secret_key = 'your-secret-key'
app.config['JWT_SECRET_KEY'] = 'your-jwt-secret-at-least-32-chars!'
```

---

## Основной функционал

### Аутентификация
- Регистрация и вход по логину/паролю
- JWT-токены (срок жизни 48 часов)
- Rate limiting: 300 запросов в час

### Команды
- Создание публичных и приватных команд
- Вступление напрямую или по заявке (для приватных)
- Загрузка аватара команды
- Роли участников: **Создатель**, **Admin**, произвольные роли

### Рабочее пространство

| Вкладка | Описание |
|---|---|
| Доска | Совместная рисовалка в реальном времени — ручка, маркер, фигуры, ластик, undo/redo |
| Чат | Обмен сообщениями с индикатором печати в реальном времени |
| Участники | Управление ролями и заявками на вступление |
| Виджеты | Статистика команды, таймер, список задач |

### Голосования
- Создание опроса с 2–6 вариантами ответа
- Голосование обновляется у всех участников в реальном времени
- Только администратор может завершить голосование

### Профиль
- Редактирование имени пользователя и описания
- Загрузка/удаление аватара

### Панель администратора
- Управление всеми пользователями (выдача/снятие прав суперадмина, удаление)
- Управление всеми командами (удаление)
- Доступна только суперадминам

---

## WebSocket-события

| Событие | Направление | Описание |
|---|---|---|
| `join_team` | client → server | Войти в комнату команды |
| `leave_team` | client → server | Покинуть комнату |
| `send_message` | client → server | Отправить сообщение |
| `new_message` | server → client | Новое сообщение в чате |
| `typing` | client → server | Индикатор печати |
| `user_typing` | server → client | Кто-то печатает |
| `whiteboard_draw` | client → server | Завершённый элемент доски |
| `whiteboard_drawing` | server → client | Трансляция рисования |
| `whiteboard_cursor` | client ↔ server | Позиция курсора на доске |
| `whiteboard_clear` | client → server | Очистить доску |
| `poll_created` | client → server | Создать голосование |
| `new_poll` | server → client | Новое голосование появилось |
| `poll_vote` | client ↔ server | Голос участника |
| `poll_updated` | server → client | Обновление результатов |
| `poll_closed` | server → client | Голосование завершено |
| `user_online` / `user_offline` | server → client | Статус участника |
| `team_deleted` | server → client | Команда была удалена |
| `join_personal_room` | client → server | Личная комната для уведомлений |

---

## REST API

Все маршруты имеют префикс `/api`. Защищённые требуют заголовка:

```
Authorization: Bearer <token>
```

### Аутентификация

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/register` | Регистрация |
| POST | `/api/login` | Вход |
| POST | `/api/logout` | Выход |
| GET | `/api/me` | Данные текущего пользователя |
| PUT | `/api/profile` | Обновить профиль |
| POST | `/api/profile/avatar` | Загрузить аватар |
| DELETE | `/api/profile/avatar` | Удалить аватар |

### Команды

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/teams` | Мои команды |
| POST | `/api/teams` | Создать команду |
| GET | `/api/teams/public` | Все публичные команды |
| GET | `/api/teams/:id` | Данные команды |
| PUT | `/api/teams/:id` | Обновить команду |
| DELETE | `/api/teams/:id` | Удалить команду |
| POST | `/api/teams/:id/join` | Вступить |
| POST | `/api/teams/:id/request` | Подать заявку |
| GET | `/api/teams/:id/requests` | Список заявок |
| POST | `/api/teams/:id/requests/:rid/approve` | Одобрить заявку |
| POST | `/api/teams/:id/requests/:rid/reject` | Отклонить заявку |
| DELETE | `/api/teams/:id/members/:uid` | Исключить участника |
| PUT | `/api/teams/:id/members/:uid/roles` | Обновить роли участника |
| GET | `/api/teams/:id/whiteboard` | Получить сохранённую доску |
| PUT | `/api/teams/:id/whiteboard` | Сохранить доску |
| GET | `/api/teams/:id/stats` | Статистика команды |
| POST | `/api/teams/:id/polls` | Создать голосование |
| POST | `/api/teams/:id/polls/:pid/vote` | Проголосовать |
| POST | `/api/teams/:id/active-poll` | Установить/сбросить активное голосование |

### Чаты и сообщения

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/chats/:team_id` | Чаты команды |
| GET | `/api/messages?chat_id=X` | Сообщения чата |
| POST | `/api/messages` | Отправить сообщение |
| PUT | `/api/messages/:id` | Редактировать сообщение |
| DELETE | `/api/messages/:id` | Удалить сообщение |

### Администрирование

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/admin/users` | Все пользователи |
| PUT | `/api/admin/users/:id/toggle-admin` | Выдать/снять права суперадмина |
| DELETE | `/api/admin/users/:id` | Удалить пользователя |
| GET | `/api/admin/teams` | Все команды |
| DELETE | `/api/admin/teams/:id` | Удалить команду |
