# Auth0 Setup Guide for AI Video Studio

This guide will help you set up Auth0 authentication for the AI Video Studio platform.

## Prerequisites

- Auth0 account (free tier available)
- Node.js and npm/pnpm installed
- Supabase project set up
- Redis instance running

## Auth0 Configuration

### 1. Create Auth0 Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Click "Applications" in the sidebar
3. Click "Create Application"
4. Choose "Single Page Web Applications"
5. Select "React" as the technology

### 2. Configure Application Settings

In your Auth0 application settings:

**Allowed Callback URLs:**
```
http://localhost:5173, https://your-domain.com
```

**Allowed Logout URLs:**
```
http://localhost:5173, https://your-domain.com
```

**Allowed Web Origins:**
```
http://localhost:5173, https://your-domain.com
```

**Allowed Origins (CORS):**
```
http://localhost:5173, https://your-domain.com
```

### 3. Create Auth0 API

1. Go to "APIs" in the Auth0 dashboard
2. Click "Create API"
3. Set the identifier to: `https://api.aivideostudio.com`
4. Choose "RS256" as the signing algorithm

### 4. Configure Social Connections

#### Google OAuth Setup:
1. Go to "Authentication" > "Social" in Auth0 dashboard
2. Click on "Google"
3. Enable the connection
4. Add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs: `https://YOUR_AUTH0_DOMAIN/login/callback`

### 5. Set Up Custom Claims

Create a Rule or Action to add custom claims to tokens:

```javascript
// Auth0 Rule/Action to add custom claims
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://aivideostudio.com/';
  
  // Add user role (you'll need to store this in user metadata)
  const role = event.user.app_metadata?.role || 'user';
  const permissions = event.user.app_metadata?.permissions || [];
  
  api.idToken.setCustomClaim(`${namespace}role`, role);
  api.accessToken.setCustomClaim(`${namespace}role`, role);
  api.accessToken.setCustomClaim(`${namespace}permissions`, permissions);
};
```

### 6. Environment Variables

Update your environment files with Auth0 configuration:

**Frontend (.env.local):**
```env
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://api.aivideostudio.com
```

**Backend (.env.local):**
```env
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=https://api.aivideostudio.com
```

## Role-Based Access Control

### User Roles

The system supports three roles:
- `user`: Regular users (default)
- `moderator`: Community moderators
- `admin`: Full system administrators

### Setting User Roles

You can set user roles through Auth0 Management API or manually in the Auth0 dashboard:

1. Go to "User Management" > "Users"
2. Select a user
3. Go to "Metadata" tab
4. Add to `app_metadata`:
```json
{
  "role": "admin",
  "permissions": ["read:users", "write:users", "delete:users"]
}
```

## Testing the Integration

### 1. Start the Development Servers

```bash
# Start Supabase (if using local)
supabase start

# Start Redis (if using local)
redis-server

# Start backend
cd apps/backend
npm run dev

# Start frontend
cd apps/frontend
npm run dev
```

### 2. Test Authentication Flow

1. Visit `http://localhost:5173`
2. Click "Sign In"
3. Test both email and Google OAuth login
4. Verify user profile creation
5. Test role-based access (admin routes)

### 3. Verify Token Claims

Check browser developer tools > Application > Local Storage to see the Auth0 tokens and verify custom claims are present.

## Security Considerations

### Production Setup

1. **Use HTTPS**: Always use HTTPS in production
2. **Secure Secrets**: Store Auth0 secrets securely (environment variables, not in code)
3. **Token Validation**: Ensure proper JWT validation on the backend
4. **Rate Limiting**: Implement rate limiting for auth endpoints
5. **CORS**: Configure CORS properly for your domain

### Auth0 Security Settings

1. Enable "Require authentication for all users"
2. Set up proper logout URLs
3. Configure session timeout
4. Enable anomaly detection
5. Set up monitoring and alerts

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check allowed origins in Auth0 settings
2. **Token Validation Fails**: Verify audience and issuer settings
3. **Social Login Issues**: Check social connection configuration
4. **Role Claims Missing**: Verify custom claims rule/action is active

### Debug Mode

Enable debug mode in development:

```env
# Frontend
VITE_NODE_ENV=development

# Backend
NODE_ENV=development
LOG_LEVEL=debug
```

## Additional Resources

- [Auth0 React SDK Documentation](https://auth0.com/docs/libraries/auth0-react)
- [Auth0 Node.js API Documentation](https://auth0.com/docs/quickstart/backend/nodejs)
- [JWT.io](https://jwt.io/) - For debugging JWT tokens
- [Auth0 Community](https://community.auth0.com/) - For support and questions

## Support

If you encounter issues with the Auth0 integration:

1. Check the Auth0 logs in the dashboard
2. Review browser console for errors
3. Check backend logs for authentication failures
4. Verify environment variables are set correctly
5. Test with a fresh browser session (clear cache/cookies)