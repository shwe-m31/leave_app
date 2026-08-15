# Render Deployment Guide

## 🔐 Security Notice

**⚠️ IMPORTANT**: The Aiven credentials are included in this document for setup purposes only. After successful deployment, you should:
1. Remove the credentials from this document
2. Rotate your Aiven password if you shared it through an insecure channel

## 📋 Render Environment Variables

Set these environment variables in your Render Dashboard for the `leave-management-system` service:

### Database Configuration (Aiven MySQL)
```
DB_HOST=<your-aiven-host>
DB_PORT=<your-aiven-port>
DB_USER=<your-aiven-user>
DB_PASSWORD=<your-aiven-password>
DB_NAME=defaultdb
DB_SSL=true
```

### Application Configuration
```
NODE_ENV=production
FRONTEND_URL=https://your-app-name.onrender.com
```

**Note**: `PORT` is automatically set by Render, so you don't need to set it manually.

## 🚀 Deployment Steps

### Option 1: Using Render Dashboard (Recommended)

1. **Create a new Web Service on Render**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `leave` directory/repository

2. **Configure the Service**
   - **Name**: `leave-management-system`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Branch**: `main`

3. **Set Environment Variables**
   - Scroll to "Environment" section
   - Add all the variables listed above
   - Make sure to set `DB_SSL=true` for Aiven

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your application

### Option 2: Using render.yaml

1. **Push your code to GitHub**
2. **Go to Render Dashboard** → "New" → "Blueprint"
3. **Connect your repository** and select `render.yaml`
4. **Set environment variables** in the service after creation
5. **Deploy**

## 🗄️ Database Migration

Since your local network cannot connect to Aiven, the database migration will happen **after deployment**:

### Method 1: Automatic Migration (Recommended)

Add this to your `package.json` scripts:
```json
"scripts": {
  "start": "node server1.js",
  "migrate": "node migrate-on-deploy.js"
}
```

Then in Render Dashboard:
1. Go to your service settings
2. Add a "Deploy Hook" or run the migration manually
3. Set the start command to: `npm run migrate && npm start`

### Method 2: Manual Migration

1. Deploy the application first
2. Use Render's "Shell" access to run:
   ```bash
   node migrate-on-deploy.js
   ```

### Method 3: Aiven Console

1. Log in to your Aiven Console
2. Navigate to your MySQL service
3. Use the "SQL Editor" or web interface
4. Copy and paste the contents of `leave_db_aiven.sql`
5. Execute the SQL commands

## 🔍 Troubleshooting

### Application fails to start
- Check Render logs for specific error messages
- Verify all environment variables are set correctly
- Ensure `DB_SSL=true` is set for Aiven

### Database connection fails
- Verify Aiven service is running
- Check if the host and port are correct
- Ensure SSL is enabled (`DB_SSL=true`)
- Check Aiven service logs for connection attempts

### Migration fails
- Ensure the database exists in Aiven
- Check if tables already exist (idempotent migration)
- Verify SQL syntax is compatible with Aiven's MySQL version

### CORS issues
- Set `FRONTEND_URL` to your deployed Render URL
- Check backend logs for blocked origins
- Ensure frontend is making requests to the correct backend URL

## ✅ Verification Checklist

After deployment, verify:

- [ ] Application starts without errors
- [ ] Database connection succeeds (check logs)
- [ ] Tables are created in Aiven database
- [ ] Seed data is imported (31 users, 9 leave requests)
- [ ] Login functionality works
- [ ] Student dashboard loads and displays data
- [ ] Admin dashboard loads and displays data
- [ ] Leave requests can be submitted
- [ ] Leave requests can be approved/rejected
- [ ] Database operations complete successfully

## 🌐 Accessing Your Deployed Application

After successful deployment:
- **Backend URL**: `https://your-app-name.onrender.com`
- **Frontend URL**: Same as backend (served statically)
- **API Base URL**: `https://your-app-name.onrender.com`

## 🔄 Continuous Deployment

Your application is set up for automatic deployment:
- Push changes to the `main` branch
- Render automatically detects and deploys
- No manual intervention needed

## 📊 Monitoring

- View real-time logs in Render Dashboard
- Monitor database performance in Aiven Console
- Set up alerts for errors and performance issues

## 🚨 Post-Deployment Security Steps

1. **Remove credentials from this document**
2. **Rotate Aiven password** if shared through insecure channel
3. **Set up proper SSL certificate** for production (replace `rejectUnauthorized: false`)
4. **Enable additional security features** in Aiven (firewall, IP allowlist)
5. **Regular security updates** for dependencies

## 📞 Support

If you encounter issues:
1. Check Render logs first
2. Check Aiven service logs
3. Review this troubleshooting guide
4. Consult Render and Aiven documentation
