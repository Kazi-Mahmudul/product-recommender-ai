# ePick - Smart Phone Recommendation Platform

ePick is an intelligent mobile phone recommendation platform designed for the Bangladesh market. It combines comprehensive phone data with AI-powered recommendations to help users make informed purchasing decisions.

## 🚀 Key Features

- **Smart Recommendations**: AI-powered phone suggestions based on user preferences and requirements
- **Comprehensive Database**: Extensive collection of mobile phones with detailed specifications
- **Advanced Filtering**: Multi-criteria search and filtering capabilities
- **Price Comparison**: Real-time price tracking and comparison across different models
- **User-Friendly Interface**: Intuitive web interface for easy phone discovery
- **Comparison Tools**: Side-by-side phone comparison functionality

## 🏗️ Architecture

ePick is built with a modern, scalable architecture:

- **Backend**: FastAPI with PostgreSQL database
- **Frontend**: React with TypeScript
- **AI Integration**: Gemini AI for intelligent recommendations
- **Caching**: Redis for performance optimization
- **Authentication**: JWT-based user authentication

## 📱 Live Demo

- **Website**: [https://pickbd.vercel.app](https://pickbd.vercel.app)
- **API Documentation**: [https://pickbd-ai.onrender.com/api/v1/docs](https://pickbd-ai.onrender.com/api/v1/docs)

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Node.js 16+
- Git

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/pickbd.git
   cd pickbd
   ```

2. **Set up Python environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual database credentials, API keys, and service URLs
   ```

4. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb pickbd
   
   # Run migrations
   alembic upgrade head
   
   # Load initial data
   python scripts/load_data.py --csv data/phones.csv
   ```

5. **Start the backend server**
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API endpoints
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/api/v1/docs

## API Documentation

Interactive API documentation is available at:
- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## API Endpoints

The API provides the following endpoints:

- `GET /api/v1/phones/`: Get a paginated list of phones with optional filtering
- `GET /api/v1/phones/{phone_id}`: Get a specific phone by ID
- `GET /api/v1/phones/name/{phone_name}`: Get a specific phone by name
- `GET /api/v1/phones/brands`: Get all unique phone brands
- `GET /api/v1/phones/price-range`: Get the minimum and maximum phone prices

## Future Plans

This API will be integrated with:
- AI-powered product comparison
- Natural language query support
- Chart-based visualization
- Recommendation engine

## 🚀 Production Deployment

### Environment Configuration

For production deployment, ensure the following environment variables are properly configured:

```bash
# Production settings
DEBUG=False
LOG_LEVEL=INFO
ENVIRONMENT=production

# Database (use your actual production database URL)
DATABASE_URL=postgresql://username:password@host:port/database

# Security (MUST be changed from defaults)
SECRET_KEY=your-very-secure-secret-key-here
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# External Services (configure with your actual service URLs)
GEMINI_SERVICE_URL=https://your-gemini-service.com
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password

# Email (configure with your email service)
EMAIL_HOST=smtp.youremailprovider.com
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=your-secure-email-password
```

### Backend Deployment

1. **Using Docker** (Recommended)
   ```bash
   docker build -t pickbd-backend .
   docker run -p 8000:8000 --env-file .env pickbd-backend
   ```

2. **Using Gunicorn**
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
   ```

3. **Using Uvicorn**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

### Frontend Deployment

1. **Build for production**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Vercel** (Recommended)
   ```bash
   vercel --prod
   ```

3. **Deploy to Netlify**
   ```bash
   npm run build
   # Upload dist folder to Netlify
   ```

### Database Migration

For production database setup:

```bash
# Run migrations
alembic upgrade head

# Load production data
python scripts/load_data.py --csv production_data.csv
```

### Monitoring and Logging

The application includes production-ready logging configuration:
- Structured logging with appropriate levels
- Error tracking and monitoring
- Performance metrics collection

### Security Considerations

- Use HTTPS in production
- Configure proper CORS origins
- Set secure session cookies
- Use environment variables for sensitive data
- Regular security updates