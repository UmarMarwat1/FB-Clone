# Reels Upload Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Variables
Ensure these environment variables are set in your deployment platform:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
```

### 2. Supabase Storage Bucket
- [ ] Create a `videos` bucket in Supabase Storage
- [ ] Set bucket privacy to `public` or configure RLS policies
- [ ] Ensure bucket has sufficient storage space
- [ ] Configure CORS if needed

### 3. Database Setup
- [ ] Ensure `reels` table exists with proper schema
- [ ] Verify RLS policies are configured correctly
- [ ] Check that user authentication is working

## Deployment Configuration

### 4. Next.js Configuration
- [ ] `next.config.mjs` includes proper CORS headers
- [ ] `bodyParser: false` is set in the upload route
- [ ] File size limits are properly configured

### 5. API Route Configuration
- [ ] `/api/reels/upload` route has proper error handling
- [ ] OPTIONS method is implemented for CORS
- [ ] File validation is in place (type, size)
- [ ] Proper JSON responses for all error cases

## Testing Checklist

### 6. Local Testing
- [ ] Test with small video files (< 10MB)
- [ ] Test with medium video files (10-50MB)
- [ ] Test with large video files (50-100MB)
- [ ] Verify error handling for oversized files
- [ ] Test authentication flow
- [ ] Verify file upload to Supabase Storage

### 7. Deployment Testing
- [ ] Deploy to staging environment first
- [ ] Test all file size scenarios
- [ ] Verify CORS headers are working
- [ ] Check server logs for any errors
- [ ] Test with different browsers/devices

## Common Issues & Solutions

### 8. HTTP 413 (Payload Too Large)
**Cause**: Server rejecting large file uploads
**Solution**: 
- Ensure `bodyParser: false` is set in route config
- Check deployment platform file size limits
- Verify Next.js configuration

### 9. JSON Parsing Errors
**Cause**: Server returning HTML error pages instead of JSON
**Solution**:
- Implement proper error handling in API routes
- Always return JSON responses
- Handle CORS preflight requests

### 10. Authentication Issues
**Cause**: Token validation failing in deployment
**Solution**:
- Verify environment variables are set correctly
- Check Supabase project configuration
- Ensure proper CORS headers

## Monitoring & Debugging

### 11. Logging
- [ ] Enable detailed logging in production
- [ ] Monitor file upload success rates
- [ ] Track error patterns
- [ ] Monitor storage usage

### 12. Performance
- [ ] Monitor upload times
- [ ] Check for timeout issues
- [ ] Verify storage bucket performance
- [ ] Monitor API response times

## Security Considerations

### 13. File Validation
- [ ] File type validation is working
- [ ] File size limits are enforced
- [ ] Malicious file uploads are prevented
- [ ] User authentication is verified

### 14. Storage Security
- [ ] Files are stored in user-specific folders
- [ ] RLS policies are properly configured
- [ ] Public access is controlled appropriately

## Rollback Plan

### 15. Emergency Procedures
- [ ] Document current working configuration
- [ ] Have rollback deployment ready
- [ ] Monitor error rates after deployment
- [ ] Be prepared to disable uploads temporarily

## Post-Deployment

### 16. Verification
- [ ] All tests pass in production
- [ ] No new errors in logs
- [ ] Performance is acceptable
- [ ] Users can successfully upload reels

### 17. Monitoring
- [ ] Set up alerts for upload failures
- [ ] Monitor storage usage trends
- [ ] Track user engagement with reels
- [ ] Monitor API performance metrics
