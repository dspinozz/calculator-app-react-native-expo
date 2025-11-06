# Architecture Documentation

## System Architecture

```mermaid
graph TB
    subgraph "Client Applications"
        Web[Web Browser]
        iOS[iOS App]
        Android[Android App]
    end
    
    subgraph "React Native Expo App"
        App[App.tsx]
        Auth[AuthContext]
        Nav[React Navigation]
        Screens[Screen Components]
        API[API Service]
        DB[Database Layer]
    end
    
    subgraph "Database Layer"
        WebDB[sql.js<br/>WebAssembly]
        MobileDB[expo-sqlite<br/>Native SQLite]
        Drizzle[Drizzle ORM]
    end
    
    subgraph "Backend API"
        Flask[Flask Server]
        AuthAPI[Auth Endpoints]
        CalcAPI[Calculator API]
        JWT[JWT Validation]
    end
    
    subgraph "Storage"
        LocalStorage[localStorage<br/>Web]
        AsyncStorage[AsyncStorage<br/>Mobile]
        SQLiteDB[(SQLite Database)]
    end
    
    Web --> App
    iOS --> App
    Android --> App
    
    App --> Auth
    App --> Nav
    Nav --> Screens
    Screens --> API
    Screens --> DB
    
    DB --> Drizzle
    Drizzle --> WebDB
    Drizzle --> MobileDB
    
    WebDB --> LocalStorage
    MobileDB --> SQLiteDB
    
    API --> Flask
    Flask --> AuthAPI
    Flask --> CalcAPI
    AuthAPI --> JWT
    
    Auth --> AsyncStorage
    API --> AsyncStorage
```

## Component Architecture

```mermaid
graph LR
    subgraph "App Entry"
        App[App.tsx]
    end
    
    subgraph "Navigation"
        Nav[NavigationContainer]
        Stack[Stack Navigator]
    end
    
    subgraph "Screens"
        Login[LoginScreen]
        Calc[CalculatorScreen]
        NoTenant[NoTenantScreen]
    end
    
    subgraph "Services"
        APIService[API Service]
        AuthService[Auth Context]
    end
    
    subgraph "Components"
        DBComp[DatabaseComponent]
    end
    
    subgraph "Database"
        Schema[Schema]
        DBInit[DB Init]
    end
    
    App --> Nav
    Nav --> Stack
    Stack --> Login
    Stack --> Calc
    Stack --> NoTenant
    
    Login --> AuthService
    Calc --> APIService
    Calc --> DBComp
    NoTenant --> AuthService
    
    AuthService --> APIService
    DBComp --> Schema
    DBComp --> DBInit
    DBInit --> Schema
```

## Data Flow

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant LoginScreen
    participant AuthContext
    participant APIService
    participant Backend
    participant AsyncStorage
    
    User->>LoginScreen: Enter credentials
    LoginScreen->>AuthContext: login(username, password)
    AuthContext->>APIService: login(username, password)
    APIService->>Backend: POST /login
    Backend-->>APIService: JWT Token
    APIService->>AsyncStorage: Store token
    APIService-->>AuthContext: Success
    AuthContext->>AuthContext: Update user state
    AuthContext-->>LoginScreen: Navigate to Calculator
```

### Calculation Flow

```mermaid
sequenceDiagram
    participant User
    participant CalculatorScreen
    participant APIService
    participant Backend
    participant DatabaseComponent
    participant Database
    
    User->>CalculatorScreen: Enter expression
    User->>CalculatorScreen: Press =
    CalculatorScreen->>APIService: calculate(expression)
    APIService->>Backend: POST /calculate
    Backend-->>APIService: Result
    APIService-->>CalculatorScreen: Display result
    CalculatorScreen->>DatabaseComponent: Save to history
    DatabaseComponent->>Database: Insert record
    Database-->>DatabaseComponent: Success
```

### Database Initialization Flow

```mermaid
flowchart TD
    Start[App Starts] --> Check{Platform?}
    Check -->|Web| WebInit[Initialize sql.js]
    Check -->|Mobile| MobileInit[Initialize expo-sqlite]
    
    WebInit --> WebSQL[Create SQL.js Database]
    WebSQL --> WebTables[Create Tables]
    WebTables --> WebDrizzle[Initialize Drizzle sql-js]
    WebDrizzle --> WebStorage[Setup localStorage persistence]
    
    MobileInit --> MobileSQL[Open SQLite Database]
    MobileSQL --> MobileTables[Create Tables]
    MobileTables --> MobileDrizzle[Initialize Drizzle expo-sqlite]
    
    WebStorage --> Ready[Database Ready]
    MobileDrizzle --> Ready
    
    Ready --> Component[DatabaseComponent]
    Component --> Test[Run Tests]
    Test --> Display[Display Results]
```

## Database Architecture

### Unified Database Interface

```mermaid
graph TB
    subgraph "Application Layer"
        Component[DatabaseComponent]
        Screens[Screen Components]
    end
    
    subgraph "Database Abstraction"
        DBInterface[db.ts<br/>Unified Interface]
        DrizzleORM[Drizzle ORM]
    end
    
    subgraph "Platform Implementation"
        WebImpl[sql.js<br/>WebAssembly]
        MobileImpl[expo-sqlite<br/>Native]
    end
    
    subgraph "Storage"
        LocalStorage[(localStorage<br/>Web)]
        SQLiteFile[(SQLite File<br/>Mobile)]
    end
    
    Component --> DBInterface
    Screens --> DBInterface
    DBInterface --> DrizzleORM
    DrizzleORM --> WebImpl
    DrizzleORM --> MobileImpl
    WebImpl --> LocalStorage
    MobileImpl --> SQLiteFile
```

### Schema Structure

```mermaid
erDiagram
    CALCULATOR_HISTORY {
        int id PK
        string expression
        string result
        int timestamp
    }
    
    USER_PREFERENCES {
        int id PK
        string key UK
        string value
    }
```

## Technology Stack

### Frontend Stack

```
┌─────────────────────────────────────┐
│     React Native Expo               │
│  ┌───────────────────────────────┐  │
│  │  TypeScript (Strict Mode)     │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  React Navigation             │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  React Context API            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Database Stack

```
┌─────────────────────────────────────┐
│     Drizzle ORM                     │
│  ┌──────────────┐  ┌──────────────┐ │
│  │  sql.js      │  │ expo-sqlite  │ │
│  │  (Web)       │  │ (Mobile)     │ │
│  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────┘
```

### Backend Integration

```
┌─────────────────────────────────────┐
│     Flask REST API                  │
│  ┌───────────────────────────────┐  │
│  │  JWT Authentication           │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Calculator Endpoints         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Platform-Specific Implementation

### Web Platform

```
Browser
  ↓
React Native Web
  ↓
sql.js (WebAssembly)
  ↓
localStorage (Persistence)
```

### Mobile Platform

```
iOS/Android
  ↓
React Native
  ↓
expo-sqlite (Native)
  ↓
SQLite File (Persistence)
```

## Security Architecture

```mermaid
graph TB
    User[User] --> Login[Login Screen]
    Login --> API[API Service]
    API --> Token[JWT Token]
    Token --> Storage[AsyncStorage]
    Storage --> Header[Authorization Header]
    Header --> Backend[Flask Backend]
    Backend --> Validate[JWT Validation]
    Validate --> Response[API Response]
```

## File Structure

```
mobile-app/
├── App.tsx                    # Entry point, navigation setup
├── src/
│   ├── screens/              # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── CalculatorScreen.tsx
│   │   └── NoTenantScreen.tsx
│   ├── services/             # External services
│   │   └── api.ts           # API client, token management
│   ├── utils/               # Utilities
│   │   └── AuthContext.tsx  # Authentication state management
│   ├── components/          # Reusable components
│   │   └── DatabaseComponent.tsx
│   └── db/                  # Database layer
│       ├── schema.ts        # Drizzle schema definitions
│       └── db.ts            # Database initialization
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.js            # ESLint configuration
└── package.json            # Dependencies
```

## Key Design Decisions

### 1. Unified Database Interface
- **Decision**: Use Drizzle ORM with platform-specific implementations
- **Rationale**: Single codebase, platform-specific optimizations
- **Benefits**: Code reuse, type safety, consistent API

### 2. TypeScript Strict Mode
- **Decision**: Enable strict type checking
- **Rationale**: Catch errors at compile time, better IDE support
- **Benefits**: Type safety, self-documenting code

### 3. Context API for State
- **Decision**: Use React Context instead of Redux
- **Rationale**: Simpler for this project size, less boilerplate
- **Benefits**: Built-in React, easier to understand

### 4. Token-Based Authentication
- **Decision**: JWT tokens stored in AsyncStorage
- **Rationale**: Works across all platforms, stateless
- **Benefits**: No server-side sessions, mobile-friendly

### 5. Platform Detection
- **Decision**: Runtime platform detection for database
- **Rationale**: Single codebase, platform-specific optimizations
- **Benefits**: Code reuse, optimal performance per platform
