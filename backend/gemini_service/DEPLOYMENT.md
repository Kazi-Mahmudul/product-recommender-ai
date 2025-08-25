# Gemini Service - Simple GitHub to Cloud Run Deployment

This guide shows you how to deploy your Gemini service directly from GitHub to Google Cloud Run with automatic updates on every push.

## 🚀 Simple Continuous Deployment Setup

### What You Need:

- Google Cloud account with billing enabled
- GitHub repository with your code
- Google Gemini API Key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Step 1: Connect GitHub to Cloud Run

1. **Go to Google Cloud Console**: https://console.cloud.google.com/run
2. **Click "Create Service"**
3. **Select "Continuously deploy new revisions from a source repository"**
4. **Click "Set up with Cloud Build"**
5. **Connect your GitHub repository**:
   - Select GitHub as source
   - Authenticate and select your repository
   - Select branch (usually `main` or `master`)
   - Set build configuration:
     - **Build Type**: Dockerfile
     - **Source Location**: `/backend/gemini_service/Dockerfile`

### Step 2: Configure the Service

6. **Service Settings**:

   - **Service name**: `gemini-service`
   - **Region**: `us-central1` (or your preferred region)
   - **CPU allocation**: CPU is only allocated during request processing
   - **Ingress**: Allow all traffic
   - **Authentication**: Allow unauthenticated invocations

7. **Container Settings**:
   - **Container port**: `8080`
   - **Memory**: `512 MiB`
   - **CPU**: `1`
   - **Maximum requests per container**: `100`
   - **Minimum instances**: `0`
   - **Maximum instances**: `10`

### Step 3: Set Environment Variables

8. **Add Environment Variables**:
   - Click "Variables & Secrets" tab
   - Add these variables:
     - `GOOGLE_API_KEY`: Your Google Gemini API key
     - `NODE_ENV`: `production`

### Step 4: Deploy

9. **Click "Create"** - This will:
   - Build your Docker image from the repository
   - Deploy to Cloud Run
   - Set up automatic deployments for future pushes

## ✅ That's It!

Now every time you push to your GitHub repository:

1. Cloud Build automatically builds a new Docker image
2. Cloud Run deploys the new version
3. Your service is updated with zero downtime

## 🧪 Testing Your Deployment

After deployment completes, you'll get a service URL. Test it:

1. **Health Check**:

   ```bash
   curl https://YOUR_SERVICE_URL/health
   ```

2. **Parse Query Test**:

   ```bash
   curl -X POST https://YOUR_SERVICE_URL/parse-query \
     -H "Content-Type: application/json" \
     -d '{"query": "best phones under 30000 BDT"}'
   ```

3. **Summary Generation Test**:
   ```bash
   curl -X POST https://YOUR_SERVICE_URL/ \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Summarize the features of iPhone 14 Pro"}'
   ```

## 📊 Monitoring

- **View builds**: https://console.cloud.google.com/cloud-build/builds
- **Service logs**: https://console.cloud.google.com/run (select your service → Logs)
- **Metrics**: Cloud Run console → Metrics tab

## 🔧 Making Updates

Simply push changes to your GitHub repository:

```bash
git add .
git commit -m "Update Gemini service"
git push origin main
```

The service will automatically rebuild and deploy!

## 🛠️ Troubleshooting

### Common Issues:

1. **Build fails**: Check that your Dockerfile is in `backend/gemini_service/Dockerfile`
2. **Service won't start**: Verify `GOOGLE_API_KEY` environment variable is set
3. **API errors**: Check your Gemini API key is valid and has quota

### Debug Commands:

```bash
# View recent logs
gcloud logs read --service=gemini-service --region=us-central1 --limit=20

# Check service status
gcloud run services describe gemini-service --region=us-central1
```

## 🔐 Security Notes

- Your API key is stored securely in Cloud Run environment variables
- The service runs as a non-root user in the container
- All traffic is HTTPS by default
- Never commit API keys to your repository

## 💰 Cost Optimization

- **Minimum instances**: Set to 0 (no charges when idle)
- **Memory**: Start with 512Mi, adjust based on usage
- **CPU**: 1 CPU is sufficient for most workloads
- **Concurrency**: 100 requests per container is optimal

## 🔗 Integration with FastAPI Backend

After deployment, update your FastAPI backend to use the new Cloud Run URL:

1. Replace any Render URLs with your new Cloud Run service URL
2. Update environment variables in your FastAPI service
3. Test the integration between both services

Your Gemini service is now production-ready with automatic deployments!
