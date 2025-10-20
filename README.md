# Peyechi - AI-Powered Smartphone Discovery Platform

Peyechi is a cutting-edge mobile phone recommendation platform engineered specifically for the Bangladesh market. Leveraging advanced AI algorithms and comprehensive device databases, Peyechi empowers users to discover their perfect smartphone through intelligent recommendations, real-time price tracking, and in-depth comparisons.

**Live Site**: [peyechi.com](https://peyechi.com)

## 🚀 Key Features

### 📱 Core Features

#### **AI-Powered Chat Assistant**
- Natural language processing for smartphone queries with contextual understanding
- Context-aware conversations with conversation history tracking
- Intelligent query parsing and phone name extraction with brand/model recognition
- Multiple response types:
  - Text-based conversational answers with rich formatting
  - Personalized phone recommendations with relevance scoring
  - Visual phone comparisons with feature highlighting
  - Drill-down options for refined searches
  - Follow-up suggestions for continued exploration
- AI-generated match reasons explaining why specific phones are recommended
- Relevance scoring system showing confidence levels for recommendations
- Interactive phone cards with key specs highlighting and semantic coloring
- Rich response formatting with automatic number and currency highlighting
- Loading indicators and error handling for smooth user experience

#### **Smart Recommendations Engine**
- AI-driven phone suggestions based on user preferences and budget
- Multiple matching algorithms:
  - Price proximity matching
  - Specification similarity analysis
  - Purpose-based score matching
  - AI-powered similarity engine
- Personalized recommendations based on specific requirements

#### **Advanced Phone Comparison Tools**
- Side-by-side phone comparison functionality
- Visual comparison charts and tables
- Detailed specification comparison
- Session-based comparison management

#### **Comprehensive Phone Database**
- Extensive collection of mobile phones with detailed specifications
- Rich data model including display, camera, battery, performance, and connectivity specs
- Price information with Bangladesh-specific currency support (BDT, Taka, Tk, ৳)
- Regular data updates through automated scraping pipelines

#### **Advanced Search and Filtering**
- Multi-criteria search functionality
- Price range filtering with local currency support
- Brand, chipset, operating system filtering
- Technical specifications filtering (RAM, storage, camera, battery, display)
- Sorting options for various attributes

#### **Price Tracking and Analysis**
- Real-time price monitoring across different models
- Price range visualization
- Bangladesh market-specific pricing (BDT)
- Price trend analysis

### 🎨 User Interface Features

#### **Homepage Dashboard**
- AI-powered search with dynamic placeholder suggestions
- Trending phones section
- Top searched phones display
- Brand showcase
- Value proposition highlights

#### **AI-Enhanced Phone Detail Pages**
- Comprehensive specification tables with organized categorization
- AI-generated taglines highlighting key selling points
- AI-generated summary of the phone
- Smart pros and cons analysis with natural language generation
- Device performance scores visualization with radar charts
- Automated review aggregation and sentiment analysis
- AI-powered smart recommendations based on viewed device
- Interactive specification accordions for easy navigation
- High-quality images with optimized loading
- One-click comparison functionality with persistent state management

#### **Dedicated Chat Interface**
- Conversational AI experience with contextual memory
- Rich response formatting with AI-generated cards, charts, and tables
- Interactive visualization components with semantic coloring
- Loading indicators and comprehensive error handling
- Intelligent suggested follow-up queries based on conversation context
- Mobile-responsive design with touch-optimized interactions
- Dark/light mode support with theme-consistent styling

#### **Intelligent Comparison Interface**
- Interactive comparison tools with sticky product cards
- Visual metric charts with normalized feature scoring
- AI-generated verdict summaries with strengths/weaknesses analysis
- Side-by-side specification tables with highlighting
- Smart phone picker with search and filtering
- Comparison history tracking with session persistence
- Add/remove phones from comparison with real-time URL updates
- Responsive design optimized for mobile and desktop
- Performance metrics radar visualization
- Automated data validation and error handling

### 🌏 Bangladesh-Specific Features

#### **Local Pricing Support**
- Native support for Bangladeshi currency (BDT, Taka, Tk, ৳)
- Price filtering with k-suffix notation (e.g., 30k = 30,000)
- Local terminology recognition in queries (hazar, hajar, lakh)
- Support for various price query patterns (under X, below X, within X)

#### **Regional Query Processing**
- Bangla numeral and term recognition
- Regional brand and model recognition
- Context-aware query interpretation for local market

### 🔧 Technical Features

#### **Backend Architecture**
- **Framework**: FastAPI - High-performance Python web framework with automatic API documentation
- **Database**: PostgreSQL with SQLAlchemy ORM, deployed on Supabase for cloud database management with automatic backups and scaling
- **Caching**: Redis for response caching and session storage to improve performance
- **Task Scheduling**: APScheduler for background jobs like session cleanup and data updates
- **API Design**: RESTful endpoints with comprehensive health monitoring and validation
- **Security**: JWT-based authentication, CORS protection, input sanitization, and Row Level Security (RLS) policies for database access control
- **Error Handling**: Centralized error management with detailed logging
- **Database Security**: Supabase RLS policies with fine-grained access control for different user roles and data isolation

#### **AI Integration**
- **AI Service**: Gemini AI integration for natural language processing and generation
- **RAG Pipeline**: Retrieval-Augmented Generation implementation with contextual knowledge retrieval
- **Query Processing**: Advanced natural language understanding with contextual query processing
- **Phone Recognition**: Sophisticated phone name resolution system with brand/model extraction
- **Response Management**: Intelligent response formatting and validation with multiple output types
- **Context Management**: Conversation history tracking and session-based context retention

#### **Frontend Architecture**
- **Framework**: React with TypeScript for type-safe, component-based UI development
- **State Management**: Context API for authentication, comparison, and global state management
- **Routing**: React Router for SPA navigation with dynamic URL handling
- **UI Components**: Custom component library with responsive design patterns
- **Data Visualization**: Recharts for interactive charts and data visualization
- **Styling**: Tailwind CSS for utility-first responsive design
- **Animations**: Framer Motion for smooth UI transitions and micro-interactions
- **Performance**: Lazy loading, code splitting, and image optimization techniques

#### **Authentication System**
- **Token Management**: JWT-based authentication with secure token handling
- **Social Login**: Google OAuth 2.0 integration for seamless user onboarding
- **Session Handling**: Cookie-based session management with secure flags
- **Admin Panel**: Role-based access control with dedicated admin interfaces
- **Security**: Password hashing with bcrypt and secure credential storage

#### **Data Pipeline**
- **Web Scraping**: BeautifulSoup and Requests for automated data collection
- **Data Processing**: Python-based ETL pipeline with data cleaning and transformation
- **Database Updates**: Automated synchronization with PostgreSQL database
- **Analytics Integration**: Google Trends API for market analysis and trending phone identification
- **Validation**: Comprehensive data validation and quality assurance checks

#### **DevOps & Infrastructure**
- **Containerization**: Multi-stage Docker configuration with optimized production images
- **Cloud Deployment**: Google Cloud Platform (GCP) with Cloud Run for fully managed, auto-scaling container deployment
- **CI/CD**: GitHub Actions for automated testing, data pipeline execution, and deployment
- **Infrastructure as Code**: Dockerfile configurations for both development and GCP Cloud Run deployment
- **Environment Management**: Dotenv for secure configuration management across environments
- **Health Monitoring**: Comprehensive health check endpoints with service-specific status reporting
- **Performance Monitoring**: Integrated logging and performance metrics with request tracking
- **Scalability**: Auto-scaling configuration for handling variable traffic with zero-downtime deployments
- **Security**: HTTPS enforcement, CORS protection, secure header implementation, input sanitization, and Supabase Row Level Security (RLS) policies
- **Data Pipeline Automation**: Scheduled GitHub Actions workflows for weekly data updates and processor rankings
- **Database Migrations**: Alembic integration for database schema versioning and migration management
- **Database Management**: Supabase PostgreSQL with automated backups, point-in-time recovery, and connection diagnostics

#### **Testing & Quality Assurance**
- **Backend Testing**: Pytest for unit and integration testing
- **Frontend Testing**: Jest and React Testing Library for component testing
- **End-to-End Testing**: Comprehensive test suites for critical user flows
- **Performance Testing**: Load testing and optimization validation
- **Code Quality**: ESLint and Prettier for code formatting and linting

### 🔐 Security and Performance

#### **Security Features**
- HTTPS enforcement
- CORS protection
- Input validation and sanitization
- SQL injection prevention

#### **Performance Optimization**
- Database indexing
- Response caching
- Lazy loading components
- Image optimization
- Background processing

## 🏗️ Architecture

Peyechi is built with a modern, scalable architecture:

- **Backend**: FastAPI with PostgreSQL database hosted on Supabase
- **Frontend**: React with TypeScript
- **AI Integration**: Gemini AI for intelligent recommendations
- **Caching**: Redis for performance optimization
- **Authentication**: JWT-based user authentication with Supabase RLS security policies

## 📞 Contact

For questions, feedback, or collaboration opportunities, please reach out to us.

## 📄 License

This project is proprietary and confidential. All rights reserved.
