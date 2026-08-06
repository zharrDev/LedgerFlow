# Implementation Plan

## Issues Addressed

### 1. Content Security Policy (CSP) Violation
- **Problem**: CSP connect-src directive blocks connection to `https://ledgerflow-backend-02vs.onrender.com`
- **Solution**: Add backend domain to CSP connect-src policy
- **Files**: frontend/index.html, frontend/_headers (for Render hosting)

### 2. Login Error Visibility
- **Problem**: Login errors appear as generic "error" signs without clear messages
- **Root Cause**: 
  - API interceptor redirects to `/login` on 401 for all routes including auth endpoints
  - Error messages not properly displayed in LoginPage and AuthCallback
- **Solution**: 
  - Update API interceptor to exclude auth routes from 401 redirect
  - Enhance error handling in LoginPage to display backend error messages
  - Ensure AuthCallback shows detailed error messages for authentication failures

### 3. Footer Responsive Issues
- **Problem**: Landing page footer has poor mobile layout (single column, causes excessive vertical space)
- **Solution**: 
  - Update HomePage inline Footer component to use 2-column mobile layout
  - Ensure Footer component matches the same responsive pattern
  - Synchronize component to maintain consistency across the application

### 4. Backend Environment Configuration
- **Problem**: Login failures due to permission denied when creating company records
- **Root Cause**: Environment variable inheritance issues in the Node.js process
- **Solution**: 
  - Fix .env loading to ensure correct environment variables are used
  - Override dotenv configuration to ensure proper environment setup

## Implementation Steps

### Phase 1: CSP Fix
1. Update `frontend/index.html` to include updated CSP meta tag with backend domain
2. Create `frontend/_headers` file if using Render static hosting
3. Deploy changes and verify CSP no longer blocks API calls

### Phase 2: Error Handling Improvements
1. Modify `frontend/src/lib/api.ts` API interceptor to exclude auth routes from 401 redirect
2. Update `frontend/src/pages/LoginPage.tsx` to display backend error messages
3. Enhance `frontend/src/pages/AuthCallback.tsx` error handling to show detailed messages
4. Ensure error messages display for both Google OAuth and email/password authentication

### Phase 3: Footer Responsive Fix
1. Update `frontend/src/pages/HomePage.tsx` Footer component to use `grid grid-cols-2 lg:grid-cols-5`
2. Remove duplicate inline Footer function and import the shared Footer component
3. Update `frontend/src/components/Footer.tsx` to match the same responsive pattern if needed
4. Test responsive behavior on mobile and desktop

### Phase 4: Backend Configuration
1. Verify backend .env file configuration
2. Ensure proper environment variables are being used
3. Test login functionality with corrected environment

## Validation

### Manual Testing
- [ ] Verify CSP no longer blocks API calls in production
- [ ] Test login with Google OAuth (shows appropriate error/redirect for unregistered accounts)
- [ ] Test login with email/password (display clear error messages)
- [ ] Test login with registered accounts (successful authentication)
- [ ] Verify footer layout on mobile (375px) and desktop

### Technical Validation
- [ ] Code lints and type checks pass
- [ ] Changes are minimal and focused on specific issues
- [ ] No breaking changes to existing functionality
- [ ] Application still passes automated tests

## Risks and Mitigation

### CSP Changes
- **Risk**: Overly restrictive CSP blocks necessary functionality
- **Mitigation**: Test all authentication flows after CSP update

### Error Handling
- **Risk**: Poor error visibility during authentication
- **Mitigation**: Enhance error messages across all auth endpoints

### Responsive Design
- **Risk**: Layout issues on different screen sizes
- **Mitigation**: Test responsive behavior on multiple devices

## Dependencies

This plan requires:
- Access to `frontend/index.html` and related configuration files
- Access to `frontend/src/lib/api.ts`, `LoginPage.tsx`, `AuthCallback.tsx`
- Access to `HomePage.tsx` and `Footer.tsx`
- Backend .env configuration
- Development environment to test authentication flows

## Rollback Plan

If any issue occurs:
1. Revert CSP changes to previous version
2. Restore original error handling code
3. Revert Footer component to previous layout
4. Revert backend environment changes

## Approval

All necessary changes have been reviewed and are ready for implementation.