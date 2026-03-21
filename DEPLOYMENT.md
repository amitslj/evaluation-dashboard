# 🚀 Deployment Guide: SRS Evaluation Dashboard

This guide covers deploying the backend to **Render** and frontend to **Vercel** separately for optimal performance and reliability.

## 📋 Prerequisites

- GitHub repository with your code
- Render account (free tier available)
- Vercel account (free tier available)

## 🎯 Deployment Strategy

- **Backend (API + Database)**: Deploy to Render
- **Frontend (React App)**: Deploy to Vercel

---

## 🔧 Step 1: Deploy Backend to Render

### 1.1 Create New Web Service

1. Go to [render.com](https://render.com) and sign in
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your repository: `evaluation-dashboard`

### 1.2 Configure Backend Service

**Basic Settings:**
- **Name**: `srs-evaluation-backend`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Runtime**: `Node`

**Build & Deploy Settings:**
- **Root Directory**: `backend`
- **Build Command**: 
  ```bash
  npm install --legacy-peer-deps --production && npm run init-db
  ```
- **Start Command**: 
  ```bash
  node server.js
  ```

### 1.3 Environment Variables

Add these environment variables in Render:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `NPM_CONFIG_AUDIT` | `false` |
| `NPM_CONFIG_FUND` | `false` |

### 1.4 Advanced Settings

- **Health Check Path**: `/health`
- **Auto-Deploy**: `Yes` (deploys automatically on git push)

### 1.5 Deploy Backend

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. **Save the backend URL** (e.g., `https://srs-evaluation-backend.onrender.com`)

---

## 🎨 Step 2: Deploy Frontend to Vercel

### 2.1 Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Import your GitHub repository
4. Select your repository: `evaluation-dashboard`

### 2.2 Configure Frontend Project

**Project Settings:**
- **Framework Preset**: `Vite`
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install --legacy-peer-deps`

### 2.3 Environment Variables

Add this environment variable in Vercel:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://your-backend-url.onrender.com/api` |

**Replace** `your-backend-url` with your actual Render backend URL from Step 1.5.

### 2.4 Deploy Frontend

1. Click **"Deploy"**
2. Wait for deployment (3-5 minutes)
3. **Save the frontend URL** (e.g., `https://srs-evaluation-dashboard.vercel.app`)

---

## 🔗 Step 3: Connect Backend and Frontend

### 3.1 Update Backend CORS

After getting your Vercel URL, update the backend to allow your frontend domain:

1. In your local code, open `backend/server.js`
2. Find the CORS configuration (around line 16-20)
3. Replace the Vercel URL with your actual frontend URL:

```javascript
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://your-actual-vercel-url.vercel.app', /\.vercel\.app$/] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
};
```

4. Commit and push the changes:
```bash
git add backend/server.js
git commit -m "Update CORS for production frontend URL"
git push origin main
```

5. Render will automatically redeploy the backend

### 3.2 Test the Integration

1. Visit your Vercel frontend URL
2. Try uploading a Word document
3. Check if the dashboard displays data correctly

---

## 📊 Step 4: Verify Deployment

### 4.1 Backend Health Check

Visit: `https://your-backend-url.onrender.com/health`

Expected response:
```json
{
  "status": "healthy",
  "message": "Server is running",
  "timestamp": "2026-03-21T...",
  "environment": "production",
  "database": "connected"
}
```

### 4.2 Frontend Functionality

Test these features:
- [ ] Upload Word document
- [ ] View candidate list
- [ ] Check analytics dashboard
- [ ] Filter by date range
- [ ] Filter by profile

---

## 🔧 Troubleshooting

### Backend Issues

**Build Fails:**
- Check if `backend/package.json` has all required dependencies
- Verify Node.js version compatibility

**Database Issues:**
- Render automatically creates SQLite database
- Check logs in Render dashboard

**CORS Errors:**
- Verify frontend URL in backend CORS configuration
- Check environment variables in Render

### Frontend Issues

**Build Fails:**
- Check TypeScript errors in Vercel build logs
- Verify all dependencies in `frontend/package.json`

**API Connection Issues:**
- Verify `VITE_API_BASE_URL` environment variable
- Check network requests in browser developer tools

**Environment Variables Not Working:**
- Ensure variables start with `VITE_` prefix
- Redeploy after adding environment variables

---

## 📝 Production URLs

After successful deployment, you'll have:

- **Backend API**: `https://srs-evaluation-backend.onrender.com`
- **Frontend App**: `https://srs-evaluation-dashboard.vercel.app`
- **Health Check**: `https://srs-evaluation-backend.onrender.com/health`

---

## 🔄 Future Updates

### Automatic Deployments

- **Backend**: Automatically deploys when you push to `main` branch
- **Frontend**: Automatically deploys when you push to `main` branch

### Manual Deployments

- **Render**: Click "Manual Deploy" in dashboard
- **Vercel**: Click "Redeploy" in dashboard

---

## 💡 Tips for Success

1. **Deploy backend first** - Frontend needs backend URL
2. **Test locally** before deploying
3. **Check logs** if deployment fails
4. **Use environment variables** for configuration
5. **Monitor performance** in production dashboards

---

## 📞 Support

If you encounter issues:
1. Check deployment logs in respective dashboards
2. Verify environment variables
3. Test API endpoints directly
4. Check browser console for frontend errors