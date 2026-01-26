# Frontend-Backend Integration Guide

## Overview
The User Management frontend is now integrated with the backend API.

## API Base URL
The API base URL is configured in `.env.local`:
```
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## Authentication
The frontend automatically includes the authentication token from localStorage (`mw-auth-user`) in all API requests.

## Current Issues & Solutions

### 1. Company IDs
**Problem**: The frontend currently uses hardcoded company IDs ('1', '2', '3') which are not valid UUIDs.

**Solution**: 
- The code now validates UUIDs before making API calls
- Companies with invalid IDs are skipped
- You need to load companies from the API first (create a `companyService.ts`)

**Temporary Workaround**: 
- Use a real company UUID from your database
- Update the companies array with actual UUIDs:
```typescript
const [companies] = useState<Company[]>([
  {
    id: '4a654e58-4d22-432d-88c5-56f40d654a4f', // Real UUID from database
    companyCode: 'COMP001',
    companyName: 'Sample Company',
    status: 'Active',
  },
  // ... more companies
]);
```

### 2. Error Handling
The frontend now:
- Shows error messages in a dismissible banner
- Handles authentication errors (403/401) with helpful messages
- Validates company IDs before making API calls
- Shows loading states during API operations

### 3. Response Format
The backend now returns responses in the expected format:
```json
{
  "success": true,
  "data": { ... },
  "message": "User created successfully"
}
```

## Testing Checklist

1. ✅ Backend is running on `http://localhost:3000`
2. ✅ User is logged in (token in localStorage)
3. ✅ Companies have valid UUIDs
4. ✅ Backend API endpoints are accessible
5. ✅ CORS is configured correctly

## Next Steps

1. **Create Company Service**: Load companies from the API instead of hardcoding
2. **Add Role Service**: Load roles from the API
3. **Handle Employee Profile**: Implement API calls for Steps 2-4 of user creation
4. **Add Real-time Updates**: Consider WebSocket or polling for user list updates
