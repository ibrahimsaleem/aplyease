# AplyEase - Flow Diagrams

## 🔄 **Application Workflow**

```mermaid
graph TD
    A[User Opens App] --> B{User Logged In?}
    B -->|No| C[Login Page]
    B -->|Yes| D[Role-Based Dashboard]
    
    C --> E[Enter Credentials]
    E --> F[Authentication]
    F -->|Success| G[Redirect to Dashboard]
    F -->|Failure| H[Show Error]
    H --> C
    
    D --> I{User Role}
    I -->|Admin| J[Admin Dashboard]
    I -->|Employee| K[Employee Dashboard]
    I -->|Client| L[Client Dashboard]
    
    J --> M[User Management]
    J --> N[All Applications]
    J --> O[Analytics]
    J --> P[Export Data]
    
    K --> Q[Submit Applications]
    K --> R[My Applications]
    K --> S[Earnings Tracking]
    
    L --> T[View Applications]
    L --> U[Update Status]
    L --> V[Applications Left]
```

## 🔐 **Authentication Flow**

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant S as Server
    participant D as Database
    
    U->>C: Enter Email/Password
    C->>S: POST /api/auth/login
    S->>D: Query user by email
    D->>S: Return user data
    S->>S: Verify password hash
    S->>S: Generate JWT token
    S->>C: Return user + token
    C->>C: Store token in localStorage
    C->>C: Redirect to dashboard
    
    Note over C,S: Subsequent Requests
    C->>S: API Request + Authorization Header
    S->>S: Verify JWT token
    S->>D: Database query
    D->>S: Return data
    S->>C: API Response
```

## 📝 **Application Submission Flow**

```mermaid
graph TD
    A[Employee Dashboard] --> B[Click Add Application]
    B --> C[Application Form]
    C --> D[Select Client]
    C --> E[Fill Job Details]
    C --> F[Submit Form]
    
    F --> G[API Validation]
    G -->|Valid| H[Create Application]
    G -->|Invalid| I[Show Errors]
    I --> C
    
    H --> J[Decrement Client Quota]
    J --> K[Update Database]
    K --> L[Success Response]
    L --> M[Update UI]
    M --> N[Show Success Message]
```

## 👥 **User Management Flow (Admin)**

```mermaid
graph TD
    A[Admin Dashboard] --> B[User Management]
    B --> C{Action}
    
    C -->|Create User| D[Add User Form]
    C -->|Edit User| E[Edit User Form]
    C -->|Disable User| F[Disable Confirmation]
    
    D --> G[Fill User Details]
    G --> H[Set Role]
    H --> I{Is Client?}
    I -->|Yes| J[Set Applications Left]
    I -->|No| K[Skip Quota]
    J --> L[Create User]
    K --> L
    L --> M[Success]
    
    E --> N[Load User Data]
    N --> O[Modify Fields]
    O --> P[Save Changes]
    P --> Q[Success]
    
    F --> R[Confirm Disable]
    R --> S[Disable User]
    S --> T[Success]
```

## 📊 **Dashboard Data Flow**

```mermaid
graph TD
    A[Dashboard Load] --> B[Check User Role]
    B --> C{Role}
    
    C -->|Admin| D[Admin Stats API]
    C -->|Employee| E[Employee Stats API]
    C -->|Client| F[Client Stats API]
    
    D --> G[Total Applications]
    D --> H[Active Employees]
    D --> I[Hired This Month]
    D --> J[Pending Review]
    
    E --> K[My Applications]
    E --> L[In Progress]
    E --> M[Success Rate]
    E --> N[Earnings]
    
    F --> O[Total Applications]
    F --> P[Applications Left]
    F --> Q[In Progress]
    F --> R[Interviews]
    F --> S[Hired]
    
    G --> T[Render Stats Cards]
    H --> T
    I --> T
    J --> T
    K --> T
    L --> T
    M --> T
    N --> T
    O --> T
    P --> T
    Q --> T
    R --> T
    S --> T
```

## 🔄 **Application Status Update Flow**

```mermaid
graph TD
    A[Application Table] --> B[Click Status Dropdown]
    B --> C[Select New Status]
    C --> D[API Request]
    D --> E{User Permission}
    
    E -->|Employee| F[Own Application?]
    E -->|Client| G[Own Company?]
    E -->|Admin| H[Allow Update]
    
    F -->|Yes| I[Update Allowed]
    F -->|No| J[Permission Denied]
    
    G -->|Yes| K[Status Only Update]
    G -->|No| J
    
    I --> L[Update Database]
    K --> L
    H --> L
    
    L --> M[Success Response]
    M --> N[Update UI]
    N --> O[Show Success]
    
    J --> P[Show Error]
```

## 📈 **Earnings Calculation Flow**

```mermaid
graph TD
    A[Employee Dashboard] --> B[Load Stats]
    B --> C[Get Applications Count]
    C --> D[Calculate Earnings]
    D --> E[Rate: $0.20 per app]
    E --> F[Display Earnings Card]
    
    G[New Application] --> H[Increment Count]
    H --> I[Recalculate Earnings]
    I --> J[Update Dashboard]
```

## 🎯 **Applications Left Tracking Flow**

```mermaid
graph TD
    A[Client Dashboard] --> B[Load Applications Left]
    B --> C[Display Quota Card]
    
    D[Employee Submits App] --> E[Get Client ID]
    E --> F[Check Current Quota]
    F --> G{Quota > 0?}
    
    G -->|Yes| H[Decrement by 1]
    G -->|No| I[Keep at 0]
    
    H --> J[Update Database]
    I --> J
    J --> K[Client Sees Updated Count]
```

## 🔒 **Role-Based Access Control Flow**

```mermaid
graph TD
    A[API Request] --> B[Check JWT Token]
    B --> C{Token Valid?}
    
    C -->|No| D[401 Unauthorized]
    C -->|Yes| E[Extract User Role]
    
    E --> F{Required Role}
    F -->|Admin Only| G{User is Admin?}
    F -->|Employee| H{User is Employee?}
    F -->|Client| I{User is Client?}
    F -->|Any| J[Allow Access]
    
    G -->|Yes| J
    G -->|No| K[403 Forbidden]
    
    H -->|Yes| J
    H -->|No| K
    
    I -->|Yes| J
    I -->|No| K
    
    J --> L[Process Request]
    L --> M[Return Response]
```

## 📤 **Data Export Flow**

```mermaid
graph TD
    A[Admin/Employee] --> B[Click Export]
    B --> C[Apply Filters]
    C --> D[Export API Request]
    D --> E[Query Database]
    E --> F[Format as CSV]
    F --> G[Set Headers]
    G --> H[Download File]
```

## 🏗️ **System Architecture Flow**

```mermaid
graph TD
    A[User Browser] --> B[React App]
    B --> C[Vite Dev Server]
    C --> D[Express API Server]
    D --> E[Neon PostgreSQL]
    
    F[Production] --> G[Static Files]
    G --> H[Express Server]
    H --> I[Neon PostgreSQL]
    
    J[Authentication] --> K[JWT Tokens]
    K --> L[Role-Based Access]
    
    M[Database] --> N[Drizzle ORM]
    N --> O[Zod Validation]
    O --> P[TypeScript Types]
```

## 🚀 **Deployment Flow**

```mermaid
graph TD
    A[Git Push] --> B[GitHub Repository]
    B --> C[Render.com Webhook]
    C --> D[Build Process]
    D --> E[npm install]
    E --> F[npm run build]
    F --> G[Deploy to Render]
    G --> H[Live Application]
    
    I[Database] --> J[Neon PostgreSQL]
    J --> K[Environment Variables]
    K --> L[Production Config]
```
