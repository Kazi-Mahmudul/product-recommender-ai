# 🛡️ Supabase Security Setup Guide

This guide will help you resolve the database connectivity issues and security warnings in your Supabase setup.

## 🚨 Current Issues

1. **DNS Resolution Error**: Cannot resolve "aws-0-ap-southeast-1.pooler.supabase.com"
2. **RLS Security Warnings**: Row Level Security not enabled on public tables

## 🔧 Step-by-Step Solution

### Step 1: Diagnose Connection Issues

Run the connection diagnostic script:

```bash
python fix_supabase_connection.py
```

This will test:
- DNS resolution
- Port connectivity  
- HTTP connectivity
- Alternative DNS servers

### Step 2: Fix Security Issues

Run the security setup script:

```bash
python setup_supabase_security.py
```

This will:
- Enable RLS on all tables
- Create appropriate security policies
- Grant necessary permissions
- Verify the setup

### Step 3: Alternative - Use Local Database

If Supabase connection continues to fail, switch to local PostgreSQL:

1. **Install PostgreSQL locally**
2. **Create database and user**:
   ```sql
   CREATE DATABASE product_recommender;
   CREATE USER product_user1 WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE product_recommender TO product_user1;
   ```

3. **Update .env file**:
   ```env
   DATABASE_URL=postgresql://product_user1:secure_password@localhost:5432/product_recommender
   ```

4. **Run migrations**:
   ```bash
   alembic upgrade head
   ```

5. **Create comparison tables**:
   ```bash
   python create_comparison_tables.py
   ```

## 🛡️ Security Policies Explained

### Phones Table
- **Policy**: Public read access
- **Reason**: Product catalog should be publicly accessible

### Users Table  
- **Policy**: Users can only access their own data
- **Reason**: Privacy protection

### Email Verifications Table
- **Policy**: Users can only access their own verifications
- **Reason**: Security for email verification process

### Comparison Sessions Table
- **Policy**: Anonymous access allowed
- **Reason**: Sessions are temporary and anonymous

### Comparison Items Table
- **Policy**: Session-based or user-based access
- **Reason**: Users/sessions can only access their own comparisons

### Alembic Version Table
- **Policy**: Restricted access
- **Reason**: System table, no public access needed

## 🔍 Verification

After running the setup scripts, verify everything works:

1. **Check RLS Status**:
   ```sql
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. **Test API Endpoints**:
   ```bash
   python test_comparison_system.py
   ```

3. **Check Supabase Dashboard**:
   - Go to your Supabase project dashboard
   - Check the "Database" section
   - Verify no security warnings remain

## 🚀 Testing Your Setup

1. **Start the server**:
   ```bash
   uvicorn app.main:app --reload
   ```

2. **Test session creation**:
   ```bash
   curl -X GET "http://localhost:8000/api/v1/comparison/session"
   ```

3. **Test adding items**:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/comparison/items/samsung-galaxy-a15" \
        -H "Cookie: comparison_session_id=YOUR_SESSION_ID"
   ```

## 🆘 Troubleshooting

### DNS Issues
- Try different DNS servers (8.8.8.8, 1.1.1.1)
- Check firewall settings
- Try connecting via VPN or mobile hotspot
- Contact your ISP if issues persist

### Connection Timeouts
- Check if your firewall blocks port 5432
- Verify Supabase project is active
- Try connecting from different network

### RLS Policy Errors
- Ensure you have proper permissions in Supabase
- Check if you're using the correct database URL
- Verify your Supabase project settings

### Application Errors
- Check logs for specific error messages
- Verify environment variables are set correctly
- Test with local database first

## 📞 Support

If you continue experiencing issues:

1. **Check Supabase Status**: https://status.supabase.com/
2. **Review Supabase Docs**: https://supabase.com/docs
3. **Check Network Connectivity**: Try from different location/network
4. **Use Local Development**: Switch to local PostgreSQL for development

## 🎯 Next Steps

Once everything is working:

1. **Test all API endpoints**
2. **Verify frontend integration**
3. **Monitor application logs**
4. **Set up proper monitoring**
5. **Consider backup strategies**

Your session-based comparison system should now be secure and fully functional! 🎉