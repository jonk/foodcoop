# Food Coop API

API server for Food Coop shift notifications and user management.

## Features

- User authentication and registration
- Shift preference management
- Automated shift checking
- Email notifications
- Audit logging

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/foodcoop"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3000
```

3. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

4. Start the server:
```bash
npm run dev
```

## Shift Checking Integration

The API now includes integrated shift checking functionality that replaces the Python script approach:

### Manual Shift Checking

Users can manually check for shifts through the React frontend using the "Check for Shifts" button.

### Automated Shift Checking

For automated checking, you have several options:

#### Option 1: Using the Scheduler Script

Run the included scheduler script:
```bash
npm run scheduler
```

#### Option 2: Cron Job

Set up a cron job to call the API endpoint:
```bash
# Check every 5 minutes
*/5 * * * * curl -X POST http://localhost:3000/api/shifts/check-all
```

#### Option 3: Process Manager (PM2)

Use PM2 to run the scheduler continuously:
```bash
npm install -g pm2
pm2 start scheduler.js --name "shift-checker" --cron "*/5 * * * *"
```

### Environment Variables for Shift Checking

Add these to your `.env` file for automated checking:

```env
# Default coop password (for testing)
DEFAULT_COOP_PASSWORD="your-coop-password"

# Or individual user passwords
COOP_PASSWORD_1="user1-password"
COOP_PASSWORD_2="user2-password"
```

**Note**: In production, you should use a more secure method for storing passwords, such as encrypted environment variables or a secure key management system.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Shift Preferences
- `GET /api/shifts/preferences` - Get user preferences
- `POST /api/shifts/preferences` - Create new preference
- `PUT /api/shifts/preferences/:id` - Update preference
- `DELETE /api/shifts/preferences/:id` - Delete preference

### Shift Checking
- `POST /api/shifts/check` - Check shifts for current user
- `POST /api/shifts/check-all` - Check shifts for all users (automated)

### User Management
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/change-password` - Change password

## Migration from Python Script

The new Express-based shift checking provides several advantages:

1. **Integrated with user preferences** - No need to manually configure shift types
2. **Database-driven** - All preferences stored and managed through the API
3. **Multi-user support** - Can check shifts for multiple users automatically
4. **Better error handling** - Consistent error handling and logging
5. **Real-time notifications** - Can trigger notifications immediately when shifts are found

To migrate from your Python script:

1. Set up user accounts and preferences through the React frontend
2. Configure passwords in environment variables
3. Set up automated checking using one of the methods above
4. The Python script can be retired once the new system is working

## Security Considerations

- Passwords should be stored securely (encrypted environment variables or key management)
- Consider rate limiting for shift checking endpoints
- Implement proper logging and monitoring
- Use HTTPS in production
- Regularly rotate JWT secrets

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