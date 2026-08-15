# Deployment Guide - Local and Aiven MySQL

## Security Notice

⚠️ **CRITICAL SECURITY ISSUE**: Your database password was previously committed to Git in `server1.js`. The password `Sql@3306` was exposed in the repository history. You should:

1. **Immediately rotate your local MySQL password**
2. **Update your `.env` file with the new password**
3. **Consider this password compromised** - do not use it for production

## Local Development Setup

### Prerequisites
- Node.js installed
- Local MySQL server running on port 3306
- Database `leave_db` created

### Local Configuration

The `.env` file is already configured for local development:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Sql@3306  # Change this after rotating!
DB_NAME=leave_db
PORT=3001
NODE_ENV=development
```

### Running Locally

```bash
npm install
npm start
```

The application will:
- Connect to local MySQL at 127.0.0.1:3306
- Run on port 3001
- Serve frontend from the same directory

## Production Deployment with Aiven

### Aiven Configuration

When you deploy to production, you'll need to set these environment variables in your deployment platform (Render):

```env
DB_HOST=<your-aiven-host>
DB_PORT=<your-aiven-port>
DB_USER=<your-aiven-user>
DB_PASSWORD=<your-aiven-password>
DB_NAME=leave_db
PORT=<platform-provided-port>
NODE_ENV=production
FRONTEND_URL=<your-deployed-frontend-url>
DB_SSL=true
```

### Aiven SSL Configuration

The application is configured to automatically use SSL when connecting to Aiven:
- If `DB_SSL=true` is set, SSL will be enabled
- If the host contains "aiven", SSL will be automatically enabled
- Current SSL configuration: `rejectUnauthorized: false` (adjust based on Aiven requirements)

### Database Schema Setup

Before deploying, ensure your Aiven database has the required schema:

1. Create the `leave_db` database in Aiven
2. Import the schema using `leave_db.sql`:
   ```bash
   mysql -h <aiven-host> -P <aiven-port> -u <aiven-user> -p leave_db < leave_db.sql
   ```

### Frontend Configuration

The frontend automatically detects the environment:
- **Local**: Uses `http://localhost:3001`
- **Production**: Uses the same host as the frontend (adjust in `config.js` if needed)

### CORS Configuration

The backend allows requests from:
- `http://localhost:3000` and `http://127.0.0.1:3000`
- `http://localhost:3001` and `http://127.0.0.1:3001`
- Any URL set in `FRONTEND_URL` environment variable

## Deployment Platforms

### Option 1: Render
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables in Render dashboard
4. Deploy

### Option 2: Heroku
1. Create a new Heroku app
2. Set Config Vars:
   ```bash
   heroku config:set DB_HOST=<aiven-host> DB_PORT=<aiven-port> ...
   ```
3. Deploy using GitHub integration

## Verification Checklist

After deployment, verify:

- [ ] Application starts without errors
- [ ] Database connection succeeds
- [ ] Login functionality works
- [ ] Student dashboard loads
- [ ] Admin dashboard loads
- [ ] Leave requests can be submitted
- [ ] Leave requests can be approved/rejected
- [ ] Database operations complete successfully

## Troubleshooting

### Database Connection Issues

Check the server logs for specific error messages:
- **Host/port errors**: Verify Aiven endpoint configuration
- **Authentication errors**: Verify username/password
- **SSL errors**: Adjust `DB_SSL` and SSL configuration
- **Network errors**: Check firewall rules and Aiven IP allowlist

### CORS Issues

If you see CORS errors:
1. Verify `FRONTEND_URL` is set correctly
2. Check the backend logs for blocked origins
3. Ensure the frontend URL is in the allowed origins list

### Environment Variable Issues

The application will fail to start if required environment variables are missing:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` are required
- Check deployment platform logs for specific missing variables

## Files to Commit

✅ **Safe to commit:**
- `.env.example` (contains only placeholders)
- `.gitignore` (ensures `.env` is not committed)
- `config.js` (frontend configuration)
- Modified source files (no credentials)

❌ **Never commit:**
- `.env` (contains actual credentials)
- Any files with real passwords or API keys
- Aiven credentials

## Next Steps

1. **Rotate your local MySQL password** (it was exposed in Git history)
2. **Update `.env` with new password**
3. **Provide Aiven credentials** when ready for deployment
4. **Choose a deployment platform**
5. **Configure environment variables** in the platform
6. **Deploy and test**
7. **After successful deployment, rotate Aiven password** if you shared it directly
