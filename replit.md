# AplyEase Portal

## Overview

AplyEase Portal is a multi-tenant web application designed for tracking job applications across different user roles. The system follows a role-based access control (RBAC) pattern with three distinct user types: Admin, Client, and Employee. Built as a full-stack TypeScript application, it provides a comprehensive dashboard interface for managing job applications with features like filtering, sorting, pagination, and CSV export capabilities.

The application implements a minimal two-table database design (users and job_applications) while maintaining full CRUD functionality and proper role-based permissions. The architecture emphasizes simplicity and performance while providing a production-ready solution for job application tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack React Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Wouter for client-side routing
- **Component Structure**: Modular component architecture with separate pages for each user role

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with bcrypt password hashing
- **Session Storage**: PostgreSQL-backed session storage using connect-pg-simple
- **API Design**: RESTful API with role-based middleware protection
- **File Structure**: Separation of concerns with dedicated modules for auth, storage, and routing

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle migrations with push-based deployment
- **Core Tables**: 
  - Users table with RBAC (ADMIN, CLIENT, EMPLOYEE roles)
  - Job applications table with foreign key relationships
  - Sessions table for authentication state
- **Indexing Strategy**: Optimized indexes on frequently queried fields (email, role, foreign keys)

### Authentication & Authorization
- **Authentication Method**: Email/password with bcrypt hashing (12 rounds)
- **Session Management**: Express sessions with PostgreSQL backing store
- **Role-Based Access Control**: Three-tier permission system:
  - Admin: Full CRUD access to all resources
  - Employee: Can create applications for any client, edit own applications
  - Client: Read-only access to applications where they are the client
- **Security Features**: HTTP-only cookies, CSRF protection, session expiration

### Development & Build Process
- **Development**: Vite dev server with HMR and TypeScript checking
- **Build Process**: Dual build system - Vite for client, esbuild for server
- **Code Quality**: TypeScript strict mode, path mapping for clean imports
- **Development Tools**: Replit-specific plugins for enhanced development experience

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle Kit**: Database migration and schema management tool

### UI & Styling
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **Shadcn/ui**: Pre-built component library with consistent design system
- **Lucide React**: Icon library for consistent iconography

### Development & Build Tools
- **Vite**: Frontend build tool with React plugin and development server
- **esbuild**: Fast JavaScript bundler for server-side code
- **TypeScript**: Type checking and compilation
- **Replit Plugins**: Development environment enhancements for Replit platform

### Authentication & Security
- **bcrypt**: Password hashing library for secure password storage
- **express-session**: Session management middleware
- **connect-pg-simple**: PostgreSQL session store adapter

### Data Management
- **TanStack React Query**: Server state management with caching and synchronization
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation and schema definition
- **date-fns**: Date manipulation and formatting utilities

### Runtime & Server
- **Express.js**: Web application framework for Node.js
- **ws**: WebSocket client for Neon database connections
- **tsx**: TypeScript execution environment for development