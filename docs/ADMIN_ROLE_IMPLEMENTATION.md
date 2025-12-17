# Admin Role Implementation

## Overview
Added role-based access control to distinguish between ADMIN and regular USER accounts, with frontend validation to ensure only ADMIN users can access the admin dashboard.

## Changes Made

### Backend Changes

#### 1. User Entity (`backend/src/entities/user.entity.ts`)
- Added `UserRole` enum with values: `ADMIN` and `USER`
- Added `role` column to User entity with default value `USER`
- Column type: PostgreSQL enum

```typescript
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@Column({
  type: 'enum',
  enum: UserRole,
  default: UserRole.USER,
})
role: UserRole;
```

#### 2. Auth Service (`backend/src/modules/auth/auth.service.ts`)
- Updated `AuthResponse` interface to include `role` field
- Modified `login()` method to return user role in response

```typescript
export interface AuthResponse {
  access_token: string;
  user: {
    // ... other fields
    role: string;
  };
}
```

#### 3. Database Migration
- Generated migration: `1765814876144-AddRoleToUsers.ts`
- Creates PostgreSQL enum type `users_role_enum`
- Adds `role` column to `users` table with default value `'USER'`
- Migration successfully executed ✅

### Frontend Changes

#### 1. API Service (`admin-dashboard/src/services/api.service.ts`)
- Added `UserData` interface to type user information including role
- Added `userData` field to ApiService class
- Updated `setTokens()` to accept and store user data
- Updated `clearTokens()` to clear user data
- Updated `loadTokens()` to load user data from localStorage
- Added `isAdmin()` method to check if current user is an admin
- Added `getCurrentUser()` method to retrieve current user data

```typescript
public isAdmin(): boolean {
  return this.userData?.role === 'ADMIN';
}
```

#### 2. Login Page (`admin-dashboard/src/pages/auth/LoginPage.tsx`)
- Updated login success handler to pass user data to `setTokens()`

```typescript
apiService.setTokens({
  accessToken: response.data.access_token,
  refreshToken: response.data.refresh_token,
}, response.data.user);
```

#### 3. Protected Route (`admin-dashboard/src/components/ProtectedRoute.tsx`)
- Added admin role validation
- Shows "Access Denied" message for authenticated non-admin users
- Provides "Return to Login" button for non-admin users

```typescript
const isAuthenticated = apiService.isAuthenticated();
const isAdmin = apiService.isAdmin();

if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}

if (!isAdmin) {
  // Show access denied message
}
```

## How It Works

1. **User Registration/Login**: All new users are created with `role = 'USER'` by default
2. **Authentication**: When users log in, the backend returns their role in the auth response
3. **Frontend Storage**: The frontend stores user data (including role) in localStorage
4. **Route Protection**: The `ProtectedRoute` component checks both authentication AND admin role
5. **Access Control**: Only users with `role = 'ADMIN'` can access the admin dashboard

## Setting Admin Users

To make a user an admin, manually update the database:

```sql
UPDATE users 
SET role = 'ADMIN' 
WHERE phone_number = '+1234567890';
```

Or create a user directly with admin role:

```sql
INSERT INTO users (phone_number, role, verified_at) 
VALUES ('+1234567890', 'ADMIN', NOW());
```

## Testing

1. **Test regular user access**:
   - Create/login with a regular user (default role = USER)
   - Should see "Access Denied" message when trying to access dashboard

2. **Test admin user access**:
   - Set a user's role to ADMIN in database
   - Login with that user
   - Should successfully access admin dashboard

3. **Test authentication**:
   - Try accessing dashboard without login
   - Should redirect to login page

## Security Notes

- Role is stored in JWT token payload (immutable until re-login)
- Role is also stored in localStorage for quick frontend checks
- Backend should validate admin role for sensitive API endpoints (future enhancement)
- Consider adding backend guards/decorators to protect admin-only API routes

## Future Enhancements

1. Add backend guard/decorator for admin-only API endpoints
2. Add role management UI for super admins
3. Add more granular roles (e.g., MODERATOR, VIEWER)
4. Add permissions system for fine-grained access control
5. Add audit logging for admin actions
