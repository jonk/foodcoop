# Food Coop API Server

Express.js API server for managing Food Coop shift notifications.

## Features

- 🔐 JWT-based authentication
- 👤 User management and profiles
- ⏰ Shift preference management
- 📧 Email notification system
- 🔄 Integration with Python shift checker

## Quick Start

### 1. Install Dependencies

```bash
cd foodcoop-api
npm install
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your configuration:
- Set a strong `JWT_SECRET`
- Configure your email settings
- Set your frontend URL

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile

### Shift Management

- `GET /api/shifts/preferences` - Get user's shift preferences
- `POST /api/shifts/preferences` - Create new shift preference
- `PUT /api/shifts/preferences/:id` - Update shift preference
- `DELETE /api/shifts/preferences/:id` - Delete shift preference
- `GET /api/shifts/available` - Get available shifts
- `POST /api/shifts/check` - Trigger shift check

### User Management

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/settings` - Get user settings
- `PUT /api/users/settings` - Update user settings
- `POST /api/users/change-password` - Change password
- `DELETE /api/users/account` - Delete account

## Development

### Project Structure

```
src/
├── index.js          # Main server file
├── routes/
│   ├── auth.js       # Authentication routes
│   ├── shifts.js     # Shift management routes
│   └── users.js      # User management routes
└── middleware/       # Custom middleware (future)
```

### Adding New Routes

1. Create a new route file in `src/routes/`
2. Export the router
3. Import and use it in `src/index.js`

### Authentication

Protected routes use the `authenticateToken` middleware. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Next Steps

1. **Database Integration**: Replace mock data with Prisma + PostgreSQL
2. **Python Integration**: Connect with your shift checker script
3. **Email Service**: Implement proper email notifications
4. **Validation**: Add input validation middleware
5. **Testing**: Add unit and integration tests

## Useful Documentation

- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [JWT.io](https://jwt.io/) - JWT token debugging
- [bcrypt.js](https://github.com/dcodeIO/bcrypt.js/) - Password hashing
- [CORS](https://expressjs.com/en/resources/middleware/cors.html) - Cross-origin requests
- [Prisma Docs](https://www.prisma.io/docs/) - Database ORM

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | JWT signing secret | Required |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | Required for production |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | Required |
| `SMTP_PASS` | SMTP password/app password | Required | 