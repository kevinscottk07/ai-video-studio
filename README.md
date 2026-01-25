# AI Video Studio

A premium SaaS platform for creating AI-generated videos with world-class user experience, real-time collaboration, and credit-based monetization.

## 🚀 Features

- **Premium UI/UX**: Modern React 18 interface with smooth animations and real-time updates
- **AI-Powered Video Generation**: Integration with AWS Bedrock and SageMaker for professional video creation
- **Multi-Tier Subscriptions**: Flexible pricing with credit-based usage system
- **Real-Time Collaboration**: WebSocket-powered live updates and notifications
- **Global Accessibility**: Multi-language support with localized content generation
- **Community Features**: Social sharing, engagement tracking, and content discovery
- **Enterprise Security**: GDPR/CCPA compliance with secure content storage

## 🏗️ Architecture

This is a monorepo containing:

- **Frontend** (`apps/frontend`): React 18 + TypeScript + Vite + Tailwind CSS
- **Backend** (`apps/backend`): Node.js + Express + TypeScript + Supabase
- **Shared Packages** (`packages/*`): Common utilities and type definitions

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Docker (for local Supabase)
- AWS Account (for AI services)

### Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd ai-video-studio
   npm install
   ```

2. **Set up local database:**
   ```bash
   npx supabase start
   ```

3. **Configure environment variables:**
   ```bash
   cp apps/frontend/.env.example apps/frontend/.env.local
   cp apps/backend/.env.example apps/backend/.env.local
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

   This starts:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001
   - Supabase Studio: http://localhost:54323

## 📁 Project Structure

```
ai-video-studio/
├── apps/
│   ├── frontend/          # React frontend application
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── services/      # API and external service integrations
│   │   │   ├── stores/        # State management
│   │   │   ├── types/         # TypeScript type definitions
│   │   │   └── utils/         # Utility functions
│   │   ├── public/            # Static assets
│   │   └── package.json
│   │
│   └── backend/           # Node.js backend application
│       ├── src/
│       │   ├── controllers/   # Request handlers
│       │   ├── services/      # Business logic
│       │   ├── models/        # Database models
│       │   ├── middleware/    # Express middleware
│       │   ├── routes/        # API route definitions
│       │   ├── types/         # TypeScript type definitions
│       │   └── utils/         # Utility functions
│       ├── tests/             # Test files
│       └── package.json
│
├── packages/              # Shared packages
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Shared utility functions
│   └── config/            # Shared configuration
│
├── supabase/              # Database schema and migrations
│   ├── migrations/
│   └── seed.sql
│
└── docs/                  # Documentation
    ├── api/               # API documentation
    ├── deployment/        # Deployment guides
    └── development/       # Development guides
```

## 🧪 Testing

- **Unit Tests**: `npm run test`
- **Frontend Tests**: `npm run test:frontend`
- **Backend Tests**: `npm run test:backend`
- **Property-Based Tests**: Included in test suites with fast-check

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build:frontend
# Deploy to Vercel
```

### Backend (Railway/Render)
```bash
npm run build:backend
# Deploy to Railway or Render
```

## 📊 Monitoring

- **Performance**: Core Web Vitals tracking
- **Errors**: Comprehensive error boundaries
- **Analytics**: User behavior and system metrics
- **Costs**: AWS usage and credit system tracking

## 🔧 Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build all applications for production
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:
- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@aivideostudio.com