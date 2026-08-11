# Development Guide

This guide covers the development standards and practices for the Priority Compass project.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint
```

## 🔧 Code Quality Standards

### ESLint Enforcement
- **Pre-commit hook**: Blocks commits with ESLint errors OR warnings
- **CI/CD**: Fails builds on any ESLint issues
- **Goal**: Zero ESLint warnings in the codebase

### Common ESLint Issues & Fixes

#### 1. React Hook Dependencies
**Warning:** `React Hook useEffect has a missing dependency`

**Fix:** Add missing dependencies or use `useCallback`:
```typescript
// ❌ Bad
const loadData = async () => { /* ... */ };
useEffect(() => loadData(), [loadData]);

// ✅ Good  
const loadData = useCallback(async () => { /* ... */ }, [user]);
useEffect(() => loadData(), [loadData]);
```

#### 2. Unused Imports/Variables
**Warning:** `'Badge' is defined but never used`

**Fix:** Remove unused code:
```typescript
// ❌ Bad
import { Badge, Button } from "@/components/ui";

// ✅ Good
import { Button } from "@/components/ui";
```

#### 3. Image Optimization
**Warning:** `Using <img> could result in slower LCP`

**Fix:** Use Next.js Image:
```typescript
// ❌ Bad
<img src="/image.jpg" alt="Description" />

// ✅ Good
import Image from "next/image";
<Image src="/image.jpg" alt="Description" fill />
```

#### 4. Empty TypeScript Interfaces
**Warning:** `An interface declaring no members is equivalent to its supertype`

**Fix:** Use type alias:
```typescript
// ❌ Bad
interface Props extends React.HTMLAttributes<HTMLDivElement> {}

// ✅ Good
type Props = React.HTMLAttributes<HTMLDivElement>;
```

#### 5. Unescaped Apostrophes
**Error:** `'` can be escaped with `&apos;`

**Fix:** Escape in JSX:
```typescript
// ❌ Bad
<p>You're all set!</p>

// ✅ Good
<p>You&apos;re all set!</p>
```

## 📦 Project Structure

```
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   └── [feature]/      # Feature-specific components
├── lib/                # Utilities and configurations
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── docs/               # Documentation
└── tests/              # Test files
```

## 🎯 Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes
- Follow ESLint standards
- Write tests for new features
- Update documentation

### 3. Run Quality Checks
```bash
# Lint (will fail on warnings)
pnpm lint

# Type check
pnpm typecheck

# Test
pnpm test

# Build
pnpm build
```

### 4. Commit Changes
Pre-commit hook will automatically run ESLint and block on issues.

### 5. Push & Create PR
- CI will run full quality checks
- PR should pass all checks before merge

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Test Structure
```
tests/
├── lib/              # Library function tests
├── components/        # Component tests
└── [feature]/        # Feature-specific tests
```

## 🎨 UI Components

### Using shadcn/ui Components
```typescript
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
```

### Creating New Components
- Follow existing patterns
- Use TypeScript
- Include proper props interface
- Add responsive design

## 🔐 Authentication & Authorization

### Supabase Auth
```typescript
import { useAuth } from "@/lib/auth-context";

const { user, signIn, signOut } = useAuth();
```

### Protected Routes
```typescript
import AuthGuard from "@/components/auth-guard";

<AuthGuard>
  <ProtectedComponent />
</AuthGuard>
```

## 📊 Database (Supabase)

### Migrations
```bash
# Create new migration
supabase db diff --use-migra -f new_feature

# Apply migrations
supabase db push
```

### Database Functions
```typescript
import { getUserOnboarding } from "@/lib/onboarding";
```

## 🎵 Spotify Integration

### Authentication
```typescript
import { useSpotify } from "@/lib/spotify-context";

const { user, login, playTrack } = useSpotify();
```

### API Routes
- `/api/spotify/search` - Search tracks
- `/api/spotify/playlist` - Get playlists
- `/api/spotify/callback` - OAuth callback

## 📝 State Management

### React Context
- `useAuth()` - Authentication state
- `useSpotify()` - Spotify state
- `useOnboarding()` - Onboarding state

### Local State
```typescript
import { useState, useCallback } from "react";
```

## 🎯 Performance

### useCallback for Functions
```typescript
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### useMemo for Expensive Calculations
```typescript
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);
```

### Image Optimization
```typescript
import Image from "next/image";
```

## 🚀 Deployment

### Vercel (Production)
- Auto-deploys from main branch
- Environment variables in Vercel dashboard

### Supabase (Database)
- Remote database for production
- Local database for development

## 🐛 Troubleshooting

### ESLint Issues
1. Run `pnpm lint` to see all issues
2. Fix each warning/error
3. Commit will be blocked until fixed

### Build Issues
1. Check TypeScript errors: `npx tsc --noEmit`
2. Check build: `pnpm build`
3. Check environment variables

### Test Issues
1. Run tests: `pnpm test`
2. Check test coverage
3. Mock external dependencies

## 📋 Code Review Checklist

- [ ] ESLint passes (no errors or warnings)
- [ ] TypeScript compiles without errors
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] Performance considerations addressed
- [ ] Security implications considered

## 🤝 Contributing

1. Follow this development guide
2. Maintain code quality standards
3. Write tests for new features
4. Update documentation
5. Be considerate in PR reviews

---

**Remember:** Quality code is maintainable code. Take pride in your work! 🚀
