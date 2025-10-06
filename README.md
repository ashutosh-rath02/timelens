# Timelens - AI-Powered Activity Tracker

A modern Electron application that automatically tracks and analyzes your computer usage patterns using AI.

## 🚀 Features

- **Automatic Screen Recording**: Captures screenshots at 1 FPS for activity tracking
- **AI-Powered Analysis**: Uses Gemini AI to analyze activities and generate summaries
- **Smart Processing**: Background processing every 5 minutes with 30-minute display intervals
- **Modern Timeline UI**: Beautiful card-based timeline with detailed activity breakdowns
- **Real-time Updates**: Live status updates and automatic data processing
- **Data Management**: Automatic cleanup of processed frames to save space

## 🛠️ Technology Stack

- **Frontend**: React 19.1.0, TailwindCSS 3.4.17
- **Backend**: Electron 32.0.0, Node.js
- **Database**: SQLite (better-sqlite3)
- **AI**: Google Gemini API (@google/generative-ai)
- **Build**: Webpack 5.97.1, Babel 7.26.0

## 📁 Project Structure

```
timelens/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.js         # Main entry point
│   │   └── ipc/             # IPC handlers
│   ├── preload/             # Preload scripts
│   ├── renderer/            # React frontend
│   │   ├── src/
│   │   │   ├── App.jsx      # Main app component
│   │   │   ├── pages/       # Page components
│   │   │   └── index.css    # Global styles
│   │   ├── index.html       # HTML template
│   │   └── index.js         # Renderer entry point
│   ├── services/            # Core services
│   │   ├── AIService.js     # AI analysis service
│   │   ├── DatabaseService.js # Database operations
│   │   └── RecordingService.js # Screen recording
│   └── shared/              # Shared utilities
├── data/                    # Database files
├── recordings/              # Screenshot recordings
├── package.json            # Dependencies and scripts
├── webpack.config.js       # Build configuration
├── tailwind.config.js      # TailwindCSS config
└── babel.config.js         # Babel configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd timelens
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   - Open the app and go to Settings
   - Enter your Google Gemini API key
   - Save settings

4. **Build the application**
   ```bash
   npm run build
   ```

5. **Start the application**
   ```bash
   npm start
   ```

## 📊 How It Works

### Recording Process
1. **Start Recording**: Click "Start Recording" to begin capturing screenshots
2. **Background Processing**: Every 5 minutes, AI analyzes recent frames
3. **Timeline Display**: Every 30 minutes, results are displayed in timeline
4. **Auto Cleanup**: Processed frames are automatically deleted to save space

### AI Analysis
- **Frame Analysis**: Screenshots are analyzed using Gemini Vision API
- **Activity Detection**: Identifies applications, websites, and user activities
- **Summary Generation**: Creates brief summaries and detailed descriptions
- **Timeline Segmentation**: Breaks down activities into time segments

### Data Flow
```
Screenshots → AI Analysis → Database Storage → Timeline Display → Frame Cleanup
```

## 🎨 UI Features

### Timeline View
- **Card-based Design**: Modern, clean activity cards
- **Color Coding**: Different colors for different activity types
- **Smart Summaries**: Brief summaries with detailed bullet points
- **Interactive Details**: Click cards to see full activity breakdown

### Settings
- **API Configuration**: Gemini API key management
- **Recording Settings**: Interval and retention preferences
- **Analysis Modes**: Fast, Balanced, or Accurate processing

### Debug Tools
- **System Logs**: Real-time application logs
- **Database Stats**: Storage and processing statistics
- **Data Management**: Cleanup and maintenance tools

## 🔧 Configuration

### Recording Settings
- **Interval**: Screenshot capture frequency (default: 1 second)
- **Retention**: How long to keep data (default: 7 days)
- **Analysis Mode**: Processing speed vs accuracy trade-off

### AI Settings
- **Provider**: Currently supports Google Gemini
- **API Key**: Required for AI analysis
- **Sampling**: Frame sampling strategy for analysis

## 📈 Performance

### Optimizations
- **Smart Sampling**: Analyzes only key frames, not every screenshot
- **Background Processing**: Non-blocking AI analysis
- **Immediate Cleanup**: Deletes frames after processing
- **Efficient Storage**: Only stores analysis results, not raw data

### Resource Usage
- **CPU**: Minimal impact during recording
- **Memory**: Efficient frame processing and cleanup
- **Storage**: Automatic cleanup prevents storage bloat
- **Network**: Only API calls for AI analysis

## 🛡️ Privacy & Security

- **Local Storage**: All data stored locally on your machine
- **No Cloud Upload**: Screenshots never leave your computer
- **API Key Security**: Keys stored securely in local database
- **Data Control**: Full control over data retention and cleanup

## 🚀 Development

### Available Scripts
- `npm run build` - Build the application
- `npm start` - Start development server
- `npm run dev` - Development mode with hot reload

### Building for Production
```bash
npm run build
npm run dist
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the Debug page for system logs
- Review the Settings page for configuration
- Ensure API key is properly configured

---

**Timelens** - Track your productivity with AI-powered insights! 🎯
