# Mood Spark - System Usage Background Agent

A Node.js background service that tracks system-wide laptop usage and integrates with the Mood Spark API to store usage data alongside mood entries.

## Features

🖱️ **Activity Monitoring**
- Detects keyboard and mouse input
- Tracks device active/idle states
- Monitors screen lock/unlock events

📱 **Application Tracking**
- Identifies currently focused applications
- Logs application switching behavior
- Tracks window titles and usage patterns

📊 **Usage Analytics**
- Generates hourly usage summaries
- Calculates active screen time
- Identifies top applications used

🔄 **API Integration**
- Stores data via existing Mood Spark API endpoints
- Uses existing database schema (MoodEntry table)
- Automatic retry logic for failed API calls

## Installation

### Prerequisites

- Node.js 16+ 
- Mood Spark backend running on `http://localhost:3000`
- Platform-specific permissions for system monitoring

### Quick Start

1. **Install dependencies:**
   ```bash
   cd background-agent
   npm install
   ```

2. **Run the agent:**
   ```bash
   npm start
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

### Platform-Specific Setup

#### macOS
```bash
# Grant accessibility permissions when prompted
# The app needs to monitor keyboard/mouse input
sudo npm install
```

#### Linux
```bash
# Install X11 development headers (Ubuntu/Debian)
sudo apt-get install libx11-dev libxtst-dev libxrandr-dev

# Or for Red Hat/CentOS
sudo yum install libX11-devel libXtst-devel libXrandr-devel

npm install
```

#### Windows
```bash
# Run as Administrator for system monitoring
npm install
```

### Global Installation

Install globally to run from anywhere:

```bash
npm run install-global
mood-agent  # Run from anywhere
```

## Configuration

### Environment Variables

```bash
# API endpoint (default: http://localhost:3000/api)
export API_BASE_URL=http://localhost:3000/api

# Polling interval in milliseconds (default: 30000)
export POLL_INTERVAL=30000

# Idle threshold in milliseconds (default: 300000 = 5 minutes)
export IDLE_THRESHOLD=300000
```

### Session Management

The agent automatically creates a device-specific user session:
- Creates unique device ID using machine hardware
- Registers with Mood Spark API as system user
- Stores session in `.session.json` for persistence

## Data Storage

The agent leverages the existing Mood Spark database schema:

### MoodEntry Table Integration
```sql
-- System events stored as mood entries
INSERT INTO MoodEntry (
  userId,     -- Device-specific user ID
  mood,       -- Mapped from event type (1-5 scale)  
  note,       -- JSON with system event details
  source,     -- 'ANALYZED' (since 'SYSTEM' doesn't exist yet)
  timestamp   -- Event occurrence time
);
```

### Event Type Mapping
| System Event | Mood Value | Description |
|-------------|------------|-------------|
| `device_active` | 4 | User returns to device |
| `device_idle` | 2 | Device becomes inactive |
| `screen_lock` | 1 | Screen locked |
| `screen_unlock` | 3 | Screen unlocked |
| `app_switch` | 3 | Application changed |
| `hourly_summary` | 3 | Hourly statistics |

## Usage Examples

### Basic Usage
```bash
# Start monitoring
node index.js

# With custom API endpoint
API_BASE_URL=http://production.api.com/api node index.js
```

### Monitoring Output
```
🚀 System Usage Agent initializing...
📱 Device ID: a1b2c3d4...
🔐 Using cached user session
🖱️  Activity monitoring started
✅ System Usage Agent started successfully
👤 User ID: clu123456789
🔄 Polling every 30s

📊 device_active: {
  "previousState": "idle",
  "activityType": "keyboard"
}

📊 app_switch: {
  "from": "Terminal",
  "to": "Visual Studio Code",
  "windowTitle": "README.md - mood-spark"
}
```

## API Integration

### Authentication Flow
1. Generate unique device ID from machine hardware
2. Register device as system user via `/api/auth/register`
3. Cache session credentials in `.session.json`
4. Validate session on startup via `/api/auth/me`

### Data Submission
Events sent to `/api/moods` endpoint:
```javascript
{
  "mood": 3,
  "note": "{\"systemEvent\":\"app_switch\",\"deviceId\":\"abc123\",\"data\":{\"from\":\"Chrome\",\"to\":\"VSCode\"}}",
  "source": "ANALYZED",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Service Installation

### Run as System Service

#### macOS (LaunchAgent)
```bash
npm run service-install
```

#### Linux (systemd)
```bash
sudo npm run service-install
```

#### Windows (Windows Service)
```bash
npm run service-install
```

## Development

### Project Structure
```
background-agent/
├── index.js           # Main agent implementation
├── package.json       # Dependencies and scripts
├── README.md         # This documentation
├── .session.json     # Auto-generated session cache
└── scripts/          # Service installation scripts
    ├── install-service.js
    └── uninstall-service.js
```

### Key Classes and Methods

#### SystemUsageAgent
- `initialize()` - Setup device ID, session, monitoring
- `setupActivityMonitoring()` - Start keyboard/mouse hooks
- `pollActiveWindow()` - Check active application
- `logSystemEvent()` - Send events to API
- `generateHourlyStats()` - Create usage summaries

### Error Handling
- Automatic retry logic for API failures
- Graceful degradation when system APIs unavailable
- Session recovery on startup
- Clean shutdown on SIGINT/SIGTERM

## Troubleshooting

### Permission Issues
```bash
# macOS: Grant accessibility permissions in System Preferences
# Linux: Ensure X11 development headers installed
# Windows: Run as Administrator
```

### API Connection Issues
```bash
# Check Mood Spark backend is running
curl http://localhost:3000/api/auth/me

# Verify API_BASE_URL environment variable
echo $API_BASE_URL
```

### High CPU Usage
```bash
# Increase polling interval
export POLL_INTERVAL=60000  # 1 minute instead of 30 seconds
```

## Future Enhancements

- [ ] Add `SYSTEM` entry source to schema
- [ ] Implement local SQLite fallback storage
- [ ] Add ML feature extraction for usage patterns
- [ ] Create dashboard for usage analytics
- [ ] Add productivity scoring algorithms
- [ ] Implement privacy controls and data anonymization

## License

MIT License - see LICENSE file for details.