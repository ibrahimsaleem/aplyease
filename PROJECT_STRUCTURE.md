# AplyEase - Project Structure

## 📁 **Clean Project Structure**

```
AplyEase/
├── 📁 client/                    # Frontend React Application
│   ├── 📁 src/
│   │   ├── 📁 components/        # Reusable UI components
│   │   │   ├── 📁 ui/           # shadcn/ui components
│   │   │   ├── application-form.tsx
│   │   │   ├── application-table.tsx
│   │   │   ├── navigation-header.tsx
│   │   │   ├── stats-cards.tsx
│   │   │   └── user-management.tsx
│   │   ├── 📁 hooks/            # Custom React hooks
│   │   │   ├── use-auth.ts
│   │   │   ├── use-mobile.tsx
│   │   │   └── use-toast.ts
│   │   ├── 📁 lib/              # Utility libraries
│   │   │   ├── auth-utils.ts
│   │   │   ├── csv-export.ts
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── 📁 pages/            # Page components
│   │   │   ├── admin-dashboard.tsx
│   │   │   ├── client-dashboard.tsx
│   │   │   ├── employee-dashboard.tsx
│   │   │   ├── login.tsx
│   │   │   └── not-found.tsx
│   │   ├── 📁 types/            # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── App.tsx              # Main app component
│   │   ├── index.css            # Global styles
│   │   └── main.tsx             # App entry point
│   └── index.html               # HTML template
│
├── 📁 server/                   # Backend Express API
│   ├── 📁 tsconfig.json         # TypeScript config for server
│   ├── auth.ts                  # Authentication & authorization
│   ├── db.ts                    # Database connection
│   ├── main.ts                  # Server entry point
│   ├── routes.ts                # API route definitions
│   ├── storage.ts               # Database operations
│   └── vite.ts                  # Vite integration
│
├── 📁 shared/                   # Shared code between client & server
│   └── schema.ts                # Database schema & Zod validation
│
├── 📁 scripts/                  # Utility scripts
│   └── seed.ts                  # Database seeding script
│
├── 📄 Configuration Files
│   ├── package.json             # Dependencies & scripts
│   ├── package-lock.json        # Locked dependency versions
│   ├── tsconfig.json            # TypeScript configuration
│   ├── vite.config.ts           # Vite build configuration
│   ├── tailwind.config.ts       # Tailwind CSS configuration
│   ├── drizzle.config.ts        # Database ORM configuration
│   └── components.json          # shadcn/ui configuration
│
├── 📄 Deployment Configurations
│   ├── Dockerfile               # Docker container configuration
│   ├── render.yaml              # Render.com deployment
│   ├── vercel.json              # Vercel deployment
│   ├── railway.json             # Railway deployment
│   ├── railway.toml             # Railway configuration
│   ├── Procfile                 # Heroku deployment
│   ├── .dockerignore            # Docker ignore rules
│   └── .gitignore               # Git ignore rules
│
└── 📄 Documentation
    ├── README.md                # Main project documentation
    └── CREDENTIALS.md           # Login credentials
```

## 🏗️ **Architecture Overview**

### **Frontend (Client)**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Custom router with role-based access
- **Authentication**: JWT tokens with localStorage

### **Backend (Server)**
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Authentication**: JWT + express-session
- **Validation**: Zod schemas
- **File Structure**: Modular with separate concerns

### **Shared Layer**
- **Database Schema**: Drizzle schema definitions
- **Validation**: Zod schemas for API validation
- **Types**: Shared TypeScript interfaces

## 🔄 **Data Flow**

```
User Action → React Component → API Request → Express Route → Database → Response → UI Update
```

## 📊 **Key Features by Folder**

### **Client Components**
- `application-form.tsx` - Job application submission
- `application-table.tsx` - Application listing & management
- `stats-cards.tsx` - Dashboard statistics display
- `user-management.tsx` - Admin user management
- `ui/` - Reusable UI components (buttons, forms, etc.)

### **Server Routes**
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management (Admin only)
- `/api/applications/*` - Job application CRUD
- `/api/stats/*` - Dashboard statistics
- `/api/clients` - Client listing for employees

### **Database Schema**
- `users` - User accounts with roles
- `job_applications` - Job application records
- `applications_remaining` - Client quota tracking

## 🚀 **Development Commands**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npx drizzle-kit push    # Apply schema changes
npx tsx scripts/seed.ts # Seed demo data

# Type checking
npm run check
```

## 🔧 **Configuration Files Explained**

- **package.json**: Project metadata, dependencies, scripts
- **tsconfig.json**: TypeScript compiler options
- **vite.config.ts**: Build tool configuration
- **tailwind.config.ts**: CSS framework configuration
- **drizzle.config.ts**: Database ORM settings
- **render.yaml**: Render.com deployment configuration

## 📦 **Deployment Options**

1. **Render.com** (Recommended) - `render.yaml`
2. **Vercel** - `vercel.json`
3. **Railway** - `railway.json` & `railway.toml`
4. **Heroku** - `Procfile`
5. **Docker** - `Dockerfile`

## 🎯 **Best Practices**

- **Separation of Concerns**: Client, server, and shared code are clearly separated
- **Type Safety**: Full TypeScript coverage across the stack
- **Modular Design**: Components and routes are modular and reusable
- **Security**: JWT authentication with role-based access control
- **Performance**: Optimized builds with Vite and efficient database queries
