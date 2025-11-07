# ML Feature Generation from System Usage Data

## Feature Categories for Mood Prediction

### 1. Activity Intensity Features
```python
# Real-time features (last 30 minutes)
activity_rate = keyboard_events + mouse_events / time_window
idle_ratio = idle_time / total_time
engagement_score = active_minutes / 30

# Aggregated features (hourly/daily)
total_active_hours = sum(active_minutes) / 60
avg_session_length = mean(session_durations)
max_continuous_work = max(active_periods)
```

### 2. Context Switching Features
```python
# App switching behavior
app_switch_rate = app_switches / hour
focus_duration = mean(time_in_single_app)
context_switches = count(app_changes)
multitasking_index = unique_apps_per_hour / total_switches

# Productivity indicators
productive_app_ratio = time_in_work_apps / total_time
distraction_score = leisure_app_switches / total_switches
```

### 3. Temporal Pattern Features
```python
# Time-based patterns
hour_of_day = current_hour (0-23)
day_of_week = current_day (0-6)
is_weekend = day in [5, 6]
time_since_start = minutes_since_first_activity
time_until_end = predicted_end_time - current_time

# Work rhythm features
breaks_taken = count(idle_periods > 5min)
avg_break_duration = mean(idle_durations)
work_burst_pattern = std(active_period_lengths)
```

### 4. Behavioral Change Features
```python
# Compare to baseline
activity_vs_avg = current_activity / weekly_avg_activity
focus_vs_usual = current_focus / personal_avg_focus
earlier_than_usual = usual_start_time - today_start_time
working_overtime = current_duration > avg_daily_duration

# Trend features
activity_trend_1h = activity_now - activity_1h_ago
productivity_slope = linear_regression(productivity_scores)
fatigue_indicator = declining_activity_rate
```

## Feature Vector Example

```json
{
  "timestamp": "2024-01-15T14:30:00Z",
  "user_id": "clu123456",
  
  // Activity features
  "activity_rate_30m": 142.5,
  "idle_ratio_1h": 0.15,
  "engagement_score": 0.85,
  "keyboard_vs_mouse": 0.6,
  
  // App usage features
  "current_app": "vscode",
  "app_category": "development",
  "app_switches_1h": 12,
  "focus_duration_min": 18.5,
  "productive_app_ratio": 0.75,
  
  // Temporal features
  "hour_of_day": 14,
  "day_of_week": 1,
  "time_since_start_hrs": 5.5,
  "breaks_taken": 3,
  
  // Behavioral changes
  "activity_vs_baseline": 1.15,
  "focus_vs_yesterday": 0.92,
  "productivity_trend": -0.08,
  
  // Target variable
  "mood_score": 3  // From mood entry
}
```

## ML Pipeline Integration

### 1. Real-time Feature Extraction
```javascript
class FeatureExtractor {
  extractFeatures(events, timeWindow) {
    const features = {
      // Activity intensity
      activityRate: this.calculateActivityRate(events),
      idleRatio: this.calculateIdleRatio(events),
      
      // App usage
      appSwitches: this.countAppSwitches(events),
      topApps: this.getTopApplications(events),
      focusDuration: this.calculateFocusDuration(events),
      
      // Temporal
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      
      // Behavioral
      comparedToBaseline: this.compareToBaseline(events)
    };
    
    return features;
  }
}
```

### 2. Feature Store Schema
```sql
CREATE TABLE ml_features (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Activity features
  activity_rate_30m FLOAT,
  idle_ratio_1h FLOAT,
  engagement_score FLOAT,
  
  -- App features  
  current_app VARCHAR,
  app_switches_1h INT,
  focus_duration_min FLOAT,
  productive_ratio FLOAT,
  
  -- Temporal features
  hour_of_day INT,
  day_of_week INT,
  is_weekend BOOLEAN,
  
  -- Behavioral features
  activity_vs_baseline FLOAT,
  productivity_trend FLOAT,
  
  -- Target
  mood_score INT,
  
  INDEX idx_user_time (user_id, timestamp)
);
```

### 3. Model Training Pipeline
```python
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

# Load features
features_df = pd.read_sql("""
  SELECT * FROM ml_features 
  WHERE user_id = %s 
  ORDER BY timestamp
""", params=[user_id])

# Feature engineering
X = features_df[[
    'activity_rate_30m', 'idle_ratio_1h', 'engagement_score',
    'app_switches_1h', 'focus_duration_min', 'productive_ratio',
    'hour_of_day', 'day_of_week', 'activity_vs_baseline'
]]

y = features_df['mood_score']

# Train model
model = RandomForestRegressor(n_estimators=100)
model.fit(X, y)

# Feature importance
importance = pd.DataFrame({
    'feature': X.columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)
```

## Key ML Use Cases

### 1. Mood Prediction
- Predict mood based on current activity patterns
- Alert when behavior indicates declining mood
- Suggest breaks when fatigue detected

### 2. Productivity Analysis
- Identify optimal focus times
- Detect burnout patterns
- Recommend work schedule adjustments

### 3. Behavioral Insights
- Discover mood-activity correlations
- Identify triggers for mood changes
- Personalized recommendations

### 4. Anomaly Detection
- Detect unusual behavior patterns
- Alert on significant routine changes
- Early warning for mental health changes

## Feature Importance (Example)

| Feature | Importance | Interpretation |
|---------|------------|----------------|
| `engagement_score` | 0.18 | High activity correlates with mood |
| `productive_ratio` | 0.15 | Work app usage affects mood |
| `focus_duration` | 0.12 | Longer focus = better mood |
| `breaks_taken` | 0.11 | Regular breaks improve mood |
| `hour_of_day` | 0.10 | Time of day affects mood |
| `activity_vs_baseline` | 0.09 | Deviations signal mood changes |
| `app_switches_1h` | 0.08 | Context switching impacts mood |
| `idle_ratio_1h` | 0.07 | Too much idle time lowers mood |

## Implementation Steps

1. **Data Collection** ✅ (Current background agent)
2. **Feature Extraction** (Add to agent)
3. **Feature Store** (PostgreSQL table)
4. **Model Training** (Python service)
5. **Real-time Inference** (API endpoint)
6. **Feedback Loop** (User validates predictions)

## Privacy Considerations

- All features are computed locally
- No raw keystrokes or screen content stored
- Aggregated metrics only
- User controls data sharing
- Option to disable tracking
- Data retention policies