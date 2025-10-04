// Application constants
module.exports = {
  VERSION: "1.0.0",

  // Recording settings
  DEFAULT_FPS: 1,
  DEFAULT_RETENTION_DAYS: 7,

  // AI Providers
  AI_PROVIDERS: {
    GEMINI: "gemini",
    OLLAMA: "ollama",
    LM_STUDIO: "lmstudio",
  },

  // Capture quality options
  QUALITY_OPTIONS: {
    "480p": { width: 854, height: 480 },
    "720p": { width: 1280, height: 720 },
    "1080p": { width: 1920, height: 1080 },
  },

  // Analysis intervals (in minutes)
  ANALYSIS_INTERVALS: {
    QUICK: 15,
    DEFAULT: 30,
    DETAILED: 60,
    EXTENSIVE: 120,
  },

  // Storage paths
  PATHS: {
    RECORDINGS: "recordings",
    SCREENSHOTS: "screenshots",
    ANALYSIS: "analysis",
    EXPORTS: "exports",
  },
};
