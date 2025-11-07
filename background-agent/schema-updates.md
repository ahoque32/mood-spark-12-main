# Recommended Schema Updates for System Usage Agent

## Current Implementation

The background agent currently stores system events in the existing `MoodEntry` table using:
- `source: 'ANALYZED'` (since `SYSTEM` doesn't exist yet)
- `note` field containing JSON with system event details
- `mood` field mapped from event types (1-5 scale)

## Recommended Schema Enhancements

### 1. Add SYSTEM Entry Source

```prisma
enum EntrySource {
  SELF
  ANALYZED
  SYSTEM     // Add this new source type
}
```

### 2. Optional: Add Dedicated SystemEvent Table

For better data separation and querying performance:

```prisma
model SystemEvent {
  id        String   @id @default(cuid())
  userId    String
  deviceId  String
  eventType String   // 'device_active', 'app_switch', etc.
  data      Json?    // Event-specific data
  timestamp DateTime @default(now())
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, timestamp])
  @@index([deviceId, timestamp])
  @@index([eventType, timestamp])
}
```

### 3. Add System Events Relation to User

```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  passwordHash     String
  name             String?
  tokenVersion     Int       @default(0)
  resetToken       String?   @unique
  resetTokenExpiry DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  moods        MoodEntry[]
  settings     UserSettings?
  sessions     Session[]
  systemEvents SystemEvent[]  // Add this relation

  @@index([email])
  @@index([resetToken])
}
```

## Migration Steps

1. **Phase 1 (Current)**: Use existing MoodEntry table with `ANALYZED` source
2. **Phase 2**: Add `SYSTEM` to EntrySource enum
3. **Phase 3**: Optionally create dedicated SystemEvent table
4. **Phase 4**: Migrate existing system data from MoodEntry to SystemEvent

## SQL Migration Script

```sql
-- Add SYSTEM to EntrySource enum
ALTER TYPE "EntrySource" ADD VALUE 'SYSTEM';

-- Update existing system entries
UPDATE "MoodEntry" 
SET source = 'SYSTEM' 
WHERE note LIKE '%"systemEvent"%';
```

## Benefits of Schema Updates

- **Better Data Separation**: System events distinct from user mood entries
- **Improved Performance**: Dedicated indexes for system event queries
- **Enhanced Analytics**: Direct querying of usage patterns without JSON parsing
- **Scalability**: Separate table can be optimized for high-frequency system events
- **Data Integrity**: Proper typing for system event fields