# Finance Dashboard API

A clean, well-structured backend for a finance dashboard system with Role-Based Access Control (RBAC), financial records CRUD, and dashboard analytics.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js + Express** | REST API framework |
| **SQLite** (better-sqlite3) | File-based database — zero config required |
| **JWT** | Stateless token-based authentication |
| **bcryptjs** | Password hashing |
| **express-validator** | Input validation |
| **express-rate-limit** | API rate limiting |
| **Swagger/OpenAPI** | Auto-generated API documentation |
| **Jest + Supertest** | Integration testing |

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and set your JWT_SECRET
```

### 3. Seed Demo Data
```bash
npm run seed
```

### 4. Start the Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Open API Documentation
Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for the Swagger UI.

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@finance.com | admin123 |
| **Analyst** | analyst@finance.com | analyst123 |
| **Viewer** | viewer@finance.com | viewer123 |

## API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login & get JWT | Public |
| GET | `/api/auth/me` | Get current user profile | Authenticated |

### User Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | List all users | Admin |
| GET | `/api/users/:id` | Get user by ID | Admin |
| PUT | `/api/users/:id/role` | Update user role | Admin |
| PUT | `/api/users/:id/status` | Activate/deactivate user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |

### Financial Records
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/records` | Create record | Admin |
| GET | `/api/records` | List records (filtered & paginated) | All Roles |
| GET | `/api/records/:id` | Get single record | All Roles |
| PUT | `/api/records/:id` | Update record | Admin |
| DELETE | `/api/records/:id` | Soft delete record | Admin |

**Query Parameters**: `?type=income&category=salary&startDate=2026-01-01&endDate=2026-03-31&search=salary&page=1&limit=20&sort=date&order=desc`

### Dashboard
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/dashboard/summary` | Total income, expenses, net balance | Analyst, Admin |
| GET | `/api/dashboard/category-totals` | Category-wise breakdown | Analyst, Admin |
| GET | `/api/dashboard/trends` | Monthly/weekly trends | Analyst, Admin |
| GET | `/api/dashboard/recent` | Recent activity | All Roles |

## Access Control Matrix

| Action | Viewer | Analyst | Admin |
|--------|--------|---------|-------|
| View records | ✅ | ✅ | ✅ |
| View recent activity | ✅ | ✅ | ✅ |
| View dashboard summaries | ❌ | ✅ | ✅ |
| View trends & analytics | ❌ | ✅ | ✅ |
| Create records | ❌ | ❌ | ✅ |
| Update records | ❌ | ❌ | ✅ |
| Delete records | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npx jest tests/auth.test.js
```

Tests use in-memory SQLite databases, so no file cleanup is needed.

## Project Structure

```
zovyrn/
├── src/
│   ├── config/
│   │   └── database.js          # SQLite connection & schema init
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── rbac.js              # Role-based access control
│   │   ├── validate.js          # Input validation wrapper
│   │   └── errorHandler.js      # Global error handler
│   ├── models/
│   │   ├── User.js              # User data access layer
│   │   └── Record.js            # Financial record data access layer
│   ├── routes/
│   │   ├── auth.routes.js       # Auth endpoints
│   │   ├── user.routes.js       # User management endpoints
│   │   ├── record.routes.js     # Financial records CRUD
│   │   └── dashboard.routes.js  # Analytics endpoints
│   ├── services/
│   │   ├── auth.service.js      # Auth business logic
│   │   ├── user.service.js      # User business logic
│   │   ├── record.service.js    # Record business logic
│   │   └── dashboard.service.js # Dashboard analytics
│   ├── validators/
│   │   ├── auth.validator.js    # Auth validation rules
│   │   ├── user.validator.js    # User validation rules
│   │   └── record.validator.js  # Record validation rules
│   └── app.js                   # Express app setup
├── tests/
│   ├── auth.test.js             # Auth flow tests
│   ├── records.test.js          # Records CRUD tests
│   ├── dashboard.test.js        # Dashboard analytics tests
│   └── rbac.test.js             # RBAC enforcement tests
├── seed.js                      # Demo data seeder
├── server.js                    # Entry point
├── package.json
├── .env.example
└── .gitignore
```

## Design Decisions

- **SQLite**: Chosen for zero-config, file-based storage — no external database setup. Perfect for assessment scope.
- **Soft Delete**: Records use an `is_deleted` flag — data is never truly removed.
- **Layered Architecture**: Routes → Services → Models — clean separation of concerns.
- **Rate Limiting**: 100 requests per 15-minute window per IP (disabled in test environment).

## Error Response Format

All errors follow a consistent format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "amount", "message": "Amount must be a positive number" }
    ]
  }
}
```

## License

ISC
