# Testing the Background Agent

## Prerequisites

1. **Start Mood Spark backend:**
   ```bash
   cd ..
   npm run dev
   ```

2. **Install agent dependencies:**
   ```bash
   cd background-agent
   npm install
   ```

## Test Scenarios

### 1. Anonymous Mode Testing

**Start agent without user login:**
```bash
npm start
```

**Expected Output:**
```
🚀 System Usage Agent initializing...
📱 Device ID: a1b2c3d4...
ℹ️  No active user session detected
👻 Using anonymous tracking mode
ℹ️  System usage will be stored anonymously until user logs in
🖱️  Activity monitoring started
✅ System Usage Agent started successfully
👤 User ID: anonymous_a1b2c3d4...
🔄 Polling every 30s

📝 [ANONYMOUS] device_active (not sent to API)
📝 [ANONYMOUS] app_switch (not sent to API)
```

### 2. User Login Detection

**While agent is running:**

1. **Open browser** → `http://localhost:3000`
2. **Login to Mood Spark** with existing account
3. **Wait 2 minutes** for session check

**Expected Output:**
```
🔑 User logged in, switching to authenticated mode
✅ Detected logged-in user: user@example.com
💾 User session saved
📊 user_login: {
  "userId": "clu123456789",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
✅ user_login sent to API
```

### 3. System Activity Tracking

**Test different activities:**

1. **Move mouse/type** → Should log `device_active`
2. **Switch applications** → Should log `app_switch` 
3. **Leave idle for 5+ minutes** → Should log `device_idle`
4. **Lock screen** (macOS: Cmd+Ctrl+Q) → Should log `screen_lock`

**Expected Output:**
```
📊 device_active: {
  "previousState": "idle",
  "activityType": "mouse"
}
✅ device_active sent to API

📊 app_switch: {
  "from": "Terminal",
  "to": "Visual Studio Code",
  "windowTitle": "background-agent - mood-spark"
}
✅ app_switch sent to API
```

### 4. Database Verification

**Check data in database:**

1. **Open Mood Spark app** → View mood entries
2. **Check database directly:**
   ```sql
   SELECT * FROM "MoodEntry" 
   WHERE source = 'ANALYZED' 
   AND note LIKE '%systemEvent%'
   ORDER BY timestamp DESC;
   ```

**Expected Data:**
```sql
| id | userId | mood | note | source | timestamp |
|----|--------|------|------|--------|-----------|
| clu... | clu123... | 3 | {"systemEvent":"app_switch","deviceId":"abc..."} | ANALYZED | 2024-01-15... |
```

## Verification Steps

### 1. User Association Test

```bash
# Terminal 1: Start agent
npm start

# Terminal 2: Check session file
cat .session.json

# Should show:
{
  "userId": "actual-user-id-here",
  "userEmail": "user@example.com", 
  "deviceId": "device-id",
  "lastLogin": "2024-01-15T10:30:00.000Z"
}
```

### 2. API Integration Test

```bash
# Check if data reaches API
curl -X GET "http://localhost:3000/api/moods" \
  -H "Cookie: accessToken=your-token"

# Should include system events with source: "ANALYZED"
```

### 3. Login/Logout Flow Test

**Test switching between users:**

1. **Login as User A** → Agent detects, switches to User A
2. **Logout** → Agent switches to anonymous mode  
3. **Login as User B** → Agent detects, switches to User B
4. **Check database** → Events tagged with correct user IDs

## Troubleshooting

### Permission Issues

**macOS - Accessibility Permissions:**
```
System Preferences → Security & Privacy → Privacy → Accessibility
→ Add Terminal/Node.js
```

**Linux - X11 Headers Missing:**
```bash
sudo apt-get install libx11-dev libxtst-dev libxrandr-dev
npm install
```

### No Activity Detected

```bash
# Check if iohook is working
node -e "const io = require('iohook'); io.start(); console.log('Move mouse...'); io.on('mousemove', () => console.log('✅ Mouse detected'));"
```

### API Connection Issues

```bash
# Verify backend is running
curl http://localhost:3000/api/auth/me

# Check for cookie/session issues
curl -v http://localhost:3000/api/auth/me
```

### High CPU Usage

```bash
# Increase polling interval
export POLL_INTERVAL=60000  # 1 minute
npm start
```

## Expected Performance

- **CPU Usage**: < 1% when idle
- **Memory Usage**: < 50MB typical
- **API Calls**: ~2-10 per minute (depending on activity)
- **Data Volume**: ~100-500 events per day per user

## Success Criteria

✅ **Anonymous tracking** when no user logged in  
✅ **User detection** within 2 minutes of login  
✅ **Data association** with correct user ID  
✅ **Activity monitoring** captures keyboard/mouse/apps  
✅ **API integration** stores data in MoodEntry table  
✅ **Session persistence** survives agent restarts  
✅ **Graceful degradation** when API unavailable