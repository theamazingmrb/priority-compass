# OAuth Setup Guide

This guide explains how to configure Google and Spotify OAuth for Priority Compass.

## Google OAuth Setup

### 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Google+ API" (or "People API" for newer versions)
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Select "Web application"
6. Add authorized redirect URIs:
   - Production: `https://pulse.vibe.vercel.app/auth/callback`
   - Local: `http://localhost:3000/auth/callback`
7. Copy the **Client ID** and **Client Secret**

### 2. Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Add your Google Client ID and Client Secret
5. Set the redirect URL to: `https://[your-project-ref].supabase.co/auth/v1/callback`

## Spotify OAuth Setup

### 1. Spotify Developer Dashboard

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Set app name and description
4. Add redirect URIs:
   - Production: `https://pulse.vibe.vercel.app/auth/callback`
   - Local: `http://localhost:3000/auth/callback`
5. Copy the **Client ID** and **Client Secret**

### 2. Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Spotify** provider
4. Add your Spotify Client ID and Client Secret
5. Set the redirect URL to: `https://[your-project-ref].supabase.co/auth/v1/callback`
6. Add scopes: `user-read-email user-read-private user-read-playback-state user-modify-playback-state streaming`

## Environment Variables

Update your `.env` file with the OAuth credentials:

```env
# Google OAuth (optional - can be set in Supabase dashboard)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Spotify OAuth (optional - can be set in Supabase dashboard)  
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

## Testing

1. Start your local development server
2. Go to `/signin` or `/signup`
3. Click "Continue with Google" or "Continue with Spotify"
4. You should be redirected to the OAuth provider
5. After authentication, you'll be redirected back to the app

## Features Enabled

### Google OAuth
- ✅ Sign in with Google account
- ✅ Automatic profile creation
- ✅ Email verification handled by Google

### Spotify OAuth  
- ✅ Sign in with Spotify account
- ✅ Access to user profile and playback controls
- ✅ Integration with Spotify Web Playback SDK
- ✅ Music streaming in the app

## Security Notes

- OAuth credentials are stored securely in Supabase
- Redirect URIs must match exactly (no trailing slashes)
- Use HTTPS in production
- Enable PKCE (Supabase handles this automatically)
- Consider adding domain verification for Google OAuth

## Troubleshooting

### Common Issues

1. **"Invalid redirect_uri"**
   - Check that redirect URIs match exactly
   - Ensure no trailing slashes
   - Verify HTTPS vs HTTP

2. **"Provider not enabled"**
   - Enable the provider in Supabase Auth settings
   - Check that credentials are correctly entered

3. **"Scope not granted"**
   - Verify required scopes are requested
   - Check Spotify dashboard for scope permissions

4. **Local development issues**
   - Use `http://localhost:3000` for local redirects
   - Ensure both Google/Spotify and Supabase have local URIs

### Debug Mode

Enable debug logging in Supabase:
```sql
-- Enable auth logging
alter system set auth.log_level = 'debug';
```

Check browser console for OAuth flow errors.
