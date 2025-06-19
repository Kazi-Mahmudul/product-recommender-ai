# 🔐 ePick Authentication System

A complete authentication system built with FastAPI, PostgreSQL, and JWT tokens for the ePick product recommendation platform.

## 🚀 Features

- **User Registration**: Secure signup with email verification
- **Email Verification**: 6-digit verification codes with expiration
- **JWT Authentication**: Secure token-based authentication
- **Password Security**: Bcrypt password hashing
- **Email Integration**: SMTP email sending for verification codes
- **Protected Routes**: Middleware for route protection
- **API Documentation**: Auto-generated Swagger/OpenAPI docs

## 📋 Requirements

### Database
- PostgreSQL database
- Connection string in `DATABASE_URL` environment variable

### Email Configuration
- SMTP server (Gmail, SendGrid, Mailgun, etc.)
- Email credentials for sending verification codes

### Dependencies
All required packages are included in `requirements.production.txt`:
- `fastapi` - Web framework
- `sqlalchemy` - ORM
- `psycopg2-binary` - PostgreSQL adapter
- `passlib[bcrypt]` - Password hashing
- `python-jose[cryptography]` - JWT tokens
- `email-validator` - Email validation
- `python-multipart` - Form data handling

## 🛠️ Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost/database_name

# Authentication
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=60
VERIFICATION_CODE_EXPIRE_MINUTES=10

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@pickbd.com
EMAIL_USE_TLS=True

# Optional: Debug mode
DEBUG=True
```

### 2. Install Dependencies

```bash
pip install -r requirements.production.txt
```

### 3. Create Database Tables

Run the authentication table creation script:

```bash
python scripts/create_auth_tables.py
```

### 4. Start the Server

```bash
python app/main.py
```

The API will be available at `http://localhost:8000`

## 📚 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/signup` | Register new user |
| `POST` | `/api/v1/auth/verify` | Verify email with code |
| `POST` | `/api/v1/auth/login` | Login and get JWT token |
| `GET` | `/api/v1/auth/me` | Get current user info |
| `POST` | `/api/v1/auth/logout` | Logout (client-side) |
| `POST` | `/api/v1/auth/resend-verification` | Resend verification email |

### API Documentation

- **Swagger UI**: `http://localhost:8000/api/v1/docs`
- **ReDoc**: `http://localhost:8000/api/v1/redoc`

## 🔧 Usage Examples

### 1. User Registration

```bash
curl -X POST "http://localhost:8000/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "confirm_password": "SecurePass123"
  }'
```

**Response:**
```json
{
  "message": "Account created successfully. Please check your email for verification code.",
  "success": true
}
```

### 2. Email Verification

```bash
curl -X POST "http://localhost:8000/api/v1/auth/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456"
  }'
```

**Response:**
```json
{
  "message": "Email verified successfully. You can now log in.",
  "success": true
}
```

### 3. User Login

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 60
}
```

### 4. Access Protected Endpoints

```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "is_verified": true,
  "created_at": "2024-01-01T00:00:00"
}
```

## 🧪 Testing

Run the authentication test script:

```bash
python scripts/test_auth.py
```

This will test:
- User signup
- Email verification flow
- Login with unverified account (should fail)
- Protected endpoint access
- API documentation accessibility

## 🔒 Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

### JWT Token Security
- HS256 algorithm
- Configurable expiration time (default: 60 minutes)
- Secure secret key requirement

### Email Verification
- 6-digit random codes
- Configurable expiration time (default: 10 minutes)
- Automatic cleanup of expired codes

### Database Security
- Password hashing with bcrypt
- SQL injection protection via SQLAlchemy
- Foreign key constraints
- Cascade deletion for verification codes

## 📁 Project Structure

```
app/
├── api/
│   ├── deps.py              # Authentication dependencies
│   ├── endpoints/
│   │   └── auth.py          # Authentication endpoints
│   └── api.py               # Main API router
├── core/
│   ├── config.py            # Configuration settings
│   └── database.py          # Database connection
├── crud/
│   └── auth.py              # Authentication CRUD operations
├── models/
│   └── user.py              # User and EmailVerification models
├── schemas/
│   └── auth.py              # Authentication Pydantic schemas
└── utils/
    ├── auth.py              # Authentication utilities
    └── email.py             # Email sending utilities
```

## 🚨 Important Notes

### Email Configuration
- For Gmail, use App Passwords instead of regular passwords
- Enable 2-factor authentication and generate an app password
- Test email configuration before deploying

### Production Deployment
- Change the default `SECRET_KEY` to a secure random string
- Use environment variables for all sensitive configuration
- Set up proper SSL/TLS for email communication
- Configure proper CORS settings for your frontend domain

### Database Migration
- Use Alembic for database migrations in production
- Backup database before running migrations
- Test migrations in staging environment first

## 🔄 Integration with Frontend

### React/TypeScript Example

```typescript
// Authentication service
class AuthService {
  private baseUrl = 'http://localhost:8000/api/v1';

  async signup(email: string, password: string, confirmPassword: string) {
    const response = await fetch(`${this.baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirm_password: confirmPassword })
    });
    return response.json();
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }

  async verifyEmail(email: string, code: string) {
    const response = await fetch(`${this.baseUrl}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    return response.json();
  }

  async getCurrentUser(token: string) {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
}
```

## 🆘 Troubleshooting

### Common Issues

1. **Email not sending**
   - Check email credentials in environment variables
   - Verify SMTP server settings
   - Check firewall/network restrictions

2. **Database connection errors**
   - Verify `DATABASE_URL` format
   - Check database server is running
   - Ensure database exists and is accessible

3. **JWT token errors**
   - Verify `SECRET_KEY` is set
   - Check token expiration time
   - Ensure proper Authorization header format

4. **CORS errors**
   - Update `CORS_ORIGINS` in config
   - Check frontend domain is included
   - Verify credentials are properly configured

### Getting Help

- Check the API documentation at `/api/v1/docs`
- Review server logs for detailed error messages
- Test individual endpoints using the test script
- Verify environment variable configuration

## 📈 Future Enhancements

- [ ] Password reset functionality
- [ ] Social authentication (Google, Facebook)
- [ ] Two-factor authentication (2FA)
- [ ] Rate limiting for security
- [ ] Account deletion
- [ ] User profile management
- [ ] Session management
- [ ] Audit logging

---

**🎉 Congratulations!** Your authentication system is now ready to power secure user authentication in ePick for all future user-based features. 