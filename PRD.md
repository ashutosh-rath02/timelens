# Dayflow for Windows - Electron Implementation Plan

**A native Windows app that records your screen at 1 FPS, analyzes it with AI, and generates a timeline of your activities with summaries.**

[Tech Stack](#tech-stack) •
[Project Structure](#project-structure) •
[Implementation Phases](#implementation-phases) •
[Core Components](#core-components) •
[Data & Privacy](#data--privacy) •
[Development Timeline](#development-timeline)

---

## Tech Stack

### Frontend

- **React** - UI framework
- **TailwindCSS** - Styling
- **React Router** - Navigation (Timeline, Settings, Debug)
- **Recharts** - Activity charts and visualizations

### Backend (Electron Main Process)

- **Electron 28+** - Desktop framework
- **better-sqlite3** - Local database (same as macOS version)
- **fluent-ffmpeg** - Video encoding/processing
- **node-cron** - Scheduled analysis tasks

### Screen Capture

- **Electron desktopCapturer** - Screen recording API
- **MediaRecorder** - WebRTC-based video encoding

### AI Integration

- **Gemini API** (via fetch) - Cloud analysis option
- **Ollama/LM Studio** - Local model support (HTTP endpoints)

### Auto-Updates

- **electron-updater** - Automatic app updates
- **electron-builder** - Building and packaging

---

## Project Structure

```
dayflow-windows/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.js            # Main entry point
│   │   ├── captureService.js   # Screen recording at 1 FPS
│   │   ├── analysisService.js  # AI analysis every 15 minutes
│   │   ├── storageService.js   # Video chunk & DB management
│   │   ├── trayManager.js      # System tray integration
│   │   └── ipcHandlers.js      # IPC communication handlers
│   │
│   ├── renderer/                # React frontend
│   │   ├── pages/
│   │   │   ├── Timeline.jsx    # Main timeline view
│   │   │   ├── Settings.jsx    # AI provider, preferences
│   │   │   └── Debug.jsx       # Developer tools
│   │   ├── components/
│   │   │   ├── TimelineCard.jsx
│   │   │   ├── VideoPlayer.jsx
│   │   │   └── DistractionHighlight.jsx
│   │   ├── App.jsx
│   │   └── index.html
│   │
│   ├── shared/
│   │   ├── database.js         # SQLite schema & queries
│   │   └── constants.js        # Config (FPS, intervals, retention)
│   │
│   └── preload/
│       └── preload.js          # Secure IPC bridge
│
├── resources/                   # App icons, assets
├── scripts/                     # Build and release automation
│   ├── build.js                # Electron-builder config
│   └── release.js              # GitHub releases automation
│
├── package.json
├── electron-builder.json       # Windows installer config
└── README.md
```

---

## Implementation Phases

### Phase 1: Core Capture (Week 1-2)

**Goal**: Record screen at 1 FPS and save 15-second chunks

- Set up Electron + React boilerplate
- Implement `captureService.js`:
  - Use `desktopCapturer` to get screen source
  - Capture frames at 1 FPS using `MediaRecorder`
  - Save chunks as .webm files every 15 seconds
  - Store in `%APPDATA%/Dayflow/recordings/`
- Create SQLite database schema:
  - `chunks` table: id, timestamp, filepath, duration, analyzed
  - `timeline_cards` table: id, chunk_ids, start_time, end_time, title, summary, category
- Basic tray icon with Start/Stop recording

### Phase 2: AI Analysis Pipeline (Week 3-4)

**Goal**: Analyze recordings every 15 minutes with AI

- Implement `analysisService.js`:
  - Every 15 minutes, batch unanalyzed chunks
  - For **Gemini**: Upload video, send to Gemini API, parse response
  - For **Local (Ollama/LM Studio)**:
    - Extract frames from video (ffmpeg)
    - Send each frame to local model for description
    - Merge descriptions into timeline card
  - Save results to `timeline_cards` table
- Add retry logic and error handling
- Implement scheduled cleanup (delete recordings > 3 days old)

### Phase 3: Timeline UI (Week 5)

**Goal**: Display activities as a visual timeline

- Create Timeline page:
  - Vertical timeline with time markers
  - Timeline cards showing:
    - Time range (e.g., "9:30 AM - 10:15 AM")
    - Activity title
    - AI-generated summary
    - Thumbnail from video
  - Click card to watch timelapse
  - Distraction highlights (color-coded)
- Video playback modal with controls
- Filter by date/category

### Phase 4: Settings & Configuration (Week 6)

**Goal**: Let users configure AI provider and preferences

- Settings page:
  - AI Provider selection:
    - Gemini (API key input)
    - Ollama (endpoint URL + model selection)
    - LM Studio (endpoint URL)
  - Capture preferences:
    - Recording quality (720p, 1080p)
    - Storage retention (3/7/14 days)
    - Analysis interval (15/30/60 minutes)
  - Privacy options:
    - Pause recording toggle
    - Exclude specific apps/windows
- Validation and connection testing

### Phase 5: Debug & Developer Tools (Week 7)

**Goal**: Help users troubleshoot and verify data

- Debug page:
  - List all recorded chunks with metadata
  - View raw video files
  - Manual analysis trigger button
  - Logs viewer (capture errors, API errors)
  - Database stats (total recordings, disk usage)
- Export timeline as JSON/CSV
- Clear all data button

### Phase 6: Polish & Distribution (Week 8)

**Goal**: Prepare for release

- System tray enhancements:
  - Quick actions menu
  - Status indicators (recording, analyzing)
  - Open at login option
- Auto-updates with electron-updater:
  - Check for updates on launch
  - Background download + install on restart
- Windows installer (NSIS):
  - Silent install option
  - Desktop shortcut
  - Add to PATH
- Code signing (optional but recommended)
- Create GitHub releases with installers

---

## Core Components

### 1. Capture Service

**File**: `src/main/captureService.js`

**Responsibilities**:

- Get screen source via `desktopCapturer`
- Start MediaRecorder at 1 FPS
- Save 15-second chunks to disk
- Update database with chunk metadata
- Handle errors (screen permission denied, disk full)

**Key APIs**:

- `desktopCapturer.getSources({ types: ['screen'] })`
- `navigator.mediaDevices.getUserMedia()`
- `MediaRecorder` with `videoBitsPerSecond` config

### 2. Analysis Service

**File**: `src/main/analysisService.js`

**Responsibilities**:

- Run every 15 minutes via `node-cron`
- Fetch unanalyzed chunks from database
- Send to AI provider (Gemini or Local)
- Parse AI response into timeline cards
- Update database with results
- Merge adjacent similar activities

**Gemini Flow** (2 API calls):

1. Upload video + transcribe (1 call)
2. Generate timeline cards (1 call)

**Local Flow** (33+ API calls):

1. Extract 30 frames from video
2. Describe each frame (30 calls)
3. Merge descriptions (1 call)
4. Generate title (1 call)
5. Check if should merge with previous card (1 call)

### 3. Storage Service

**File**: `src/main/storageService.js`

**Responsibilities**:

- Manage `%APPDATA%/Dayflow/` directory structure
- SQLite database operations
- Auto-cleanup old recordings (> 3 days)
- Export/import functionality
- Disk space monitoring

**Directory Structure**:

```
%APPDATA%/Dayflow/
├── recordings/           # Video chunks
│   ├── 2025-10-03/
│   │   ├── chunk_143000.webm
│   │   └── chunk_143015.webm
│   └── 2025-10-04/
├── chunks.db            # SQLite database
└── logs/                # Error logs
    └── dayflow.log
```

### 4. IPC Communication

**File**: `src/main/ipcHandlers.js`

**Channels**:

- `capture:start` - Start recording
- `capture:stop` - Stop recording
- `capture:status` - Get current status
- `analysis:trigger` - Manual analysis
- `timeline:get` - Fetch timeline cards
- `settings:save` - Save user preferences
- `debug:getLogs` - Get debug logs
- `storage:clear` - Clear all data

---

## Data & Privacy

### Local Storage

All data stays on your machine by default:

- **Recordings**: `%APPDATA%\Dayflow\recordings\`
- **Database**: `%APPDATA%\Dayflow\chunks.db`
- **Logs**: `%APPDATA%\Dayflow\logs\dayflow.log`

### AI Provider Options

#### Gemini (Cloud)

- Video sent to Google's Gemini API
- Bring your own API key
- **Privacy**: Enable Cloud Billing on your Gemini project to prevent Google from training on your data (see Paid Services terms)

#### Local Models (Ollama / LM Studio)

- All processing stays on your machine
- No data leaves your device
- **Trade-off**: Slower analysis, higher battery usage, but complete privacy

### Permissions

Windows requires:

- User consent to capture screen (built into `desktopCapturer`)
- No system-level permissions needed
- Can be revoked anytime through app settings

### Data Retention

- Auto-delete recordings older than 3 days (configurable)
- Manual purge: Delete `%APPDATA%\Dayflow\` folder

---

## Development Timeline

### Setup (Week 0)

- Initialize Electron + React project
- Set up development environment
- Configure hot reload and debugging

### Core Development (Weeks 1-7)

- **Weeks 1-2**: Capture service + database
- **Weeks 3-4**: AI analysis pipeline
- **Week 5**: Timeline UI
- **Week 6**: Settings & configuration
- **Week 7**: Debug tools

### Testing & Polish (Week 8)

- End-to-end testing
- Performance optimization
- UI/UX refinements
- Documentation

### Release (Week 9)

- Build Windows installer
- Create GitHub release
- Write installation guide
- Set up auto-update server

---

## Key Differences from macOS Version

| Feature        | macOS (SwiftUI)                  | Windows (Electron)              |
| -------------- | -------------------------------- | ------------------------------- |
| UI Framework   | SwiftUI                          | React + TailwindCSS             |
| Screen Capture | AVFoundation                     | desktopCapturer + MediaRecorder |
| Menu Bar       | NSStatusBar                      | System Tray (Tray API)          |
| Storage Path   | `~/Library/Application Support/` | `%APPDATA%/`                    |
| Auto-Updates   | Sparkle                          | electron-updater                |
| Packaging      | DMG                              | NSIS Installer (.exe)           |
| App Size       | ~25MB                            | ~120MB (includes Chromium)      |
| Memory Usage   | ~100MB                           | ~150-200MB                      |

---

## Next Steps

1. **Set up project**: `npm create electron-app dayflow-windows`
2. **Install dependencies**: React, better-sqlite3, fluent-ffmpeg, electron-updater
3. **Start with Phase 1**: Build capture service first
4. **Test incrementally**: Verify each component works before moving on
5. **Join the community**: Consider upstreaming Windows support to original repo

---

## Resources

- **Electron desktopCapturer**: https://www.electronjs.org/docs/latest/api/desktop-capturer
- **electron-updater**: https://www.electron.build/auto-update
- **better-sqlite3**: https://github.com/WiseLibs/better-sqlite3
- **Gemini API**: https://ai.google.dev/gemini-api/docs
- **Ollama**: https://ollama.com/
- **LM Studio**: https://lmstudio.ai/

---

## Contributing

This is a community-driven Windows port of the original macOS Dayflow. PRs welcome!

**Priority Areas**:

- Performance optimization for video encoding
- Improved local model prompts
- Windows-specific UI patterns
- Multi-monitor support

AIzaSyCrkRUpoZA10hIGbKK7wHQ_traQh3t4TaM
