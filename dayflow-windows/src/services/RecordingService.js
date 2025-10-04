const fs = require("fs-extra");
const path = require("path");
const moment = require("moment");
const screenshot = require("screenshot-desktop");
const DatabaseService = require("./DatabaseService");
const AIService = require("./AIService");

class RecordingService {
  constructor() {
    console.log("RecordingService: Constructor called");
    this.isRecording = false;
    this.recordingInterval = null;
    this.captureCount = 0;
    this.storageDir = path.join(process.cwd(), "recordings");
    this.lastFrameTime = null;
    this.currentSessionId = null;

    // Initialize database
    this.db = new DatabaseService();

    // Initialize AI service
    this.ai = new AIService();

    // Initialize storage directory
    this.initStorage();

    // Load saved settings and initialize AI after database is ready
    setTimeout(() => {
      this.initializeAIFromSettings();
    }, 1000);

    console.log("RecordingService: Initialized");
  }

  async initStorage() {
    try {
      await fs.ensureDir(this.storageDir);
      console.log(`Storage directory initialized: ${this.storageDir}`);
    } catch (error) {
      console.error("Failed to initialize storage directory:", error);
    }
  }

  async startRecording() {
    if (this.isRecording) {
      console.log("Recording is already active");
      return { success: false, message: "Recording already active" };
    }

    try {
      this.isRecording = true;
      this.captureCount = 0;

      // Create a new session directory
      const sessionId = moment().format("YYYY-MM-DD_HH-mm-ss");
      this.sessionDir = path.join(this.storageDir, sessionId);
      this.currentSessionId = sessionId;

      await fs.ensureDir(this.sessionDir);

      // Create database session record
      const startTime = moment().toISOString();
      this.db.createSession(sessionId, startTime);

      // Start capturing frames at 1 FPS
      this.scheduleCapture();

      console.log("Recording started - session:", sessionId);
      return {
        success: true,
        message: "Recording started successfully",
        sessionId: sessionId,
      };
    } catch (error) {
      console.error("Failed to start recording:", error);
      this.isRecording = false;
      return { success: false, message: "Failed to start recording" };
    }
  }

  async stopRecording() {
    if (!this.isRecording) {
      console.log("No active recording to stop");
      return { success: false, message: "No active recording" };
    }

    try {
      this.isRecording = false;

      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      // Update database session
      if (this.currentSessionId) {
        this.db.updateSession(this.currentSessionId, {
          end_time: moment().toISOString(),
          frame_count: this.captureCount,
          status: "completed",
        });
      }

      console.log(`Recording stopped - captured ${this.captureCount} frames`);
      return {
        success: true,
        message: "Recording stopped successfully",
        frameCount: this.captureCount,
      };
    } catch (error) {
      console.error("Failed to stop recording:", error);
      return { success: false, message: "Failed to stop recording" };
    }
  }

  scheduleCapture() {
    // Capture every second (1 FPS)
    this.recordingInterval = setInterval(async () => {
      if (this.isRecording) {
        await this.captureFrame();
      }
    }, 1000);
  }

  async captureFrame() {
    try {
      const framePath = path.join(
        this.sessionDir,
        `frame_${this.captureCount.toString().padStart(6, "0")}.png`
      );

      // Capture actual screenshot
      const img = await screenshot({ format: "png" });

      // Save the screenshot
      await fs.writeFile(framePath, img);

      // Get screenshot dimensions
      const stats = await fs.stat(framePath);
      const metadataPath = framePath.replace(".png", ".json");

      // Save metadata
      await this.saveFrameMetadata(framePath, {
        width: 1920, // Default, could be detected
        height: 1080,
        fileSize: stats.size,
        format: "png",
      });

      // Store frame in database
      this.db.createFrame({
        sessionId: this.currentSessionId,
        frameNumber: this.captureCount,
        filePath: framePath,
        metadataPath: metadataPath,
        timestamp: moment().toISOString(),
        fileSize: stats.size,
        width: 1920,
        height: 1080,
        format: "png",
      });

      this.captureCount++;
      console.log(`Captured frame ${this.captureCount} (${stats.size} bytes)`);
    } catch (error) {
      console.error("Failed to capture frame:", error);
    }
  }

  async saveFrameMetadata(framePath, metadata) {
    // Save metadata for the captured screenshot
    const frameData = {
      timestamp: moment().toISOString(),
      path: framePath,
      metadata: metadata,
      sessionDir: this.sessionDir,
      frameNumber: this.captureCount,
      sessionId: path.basename(this.sessionDir),
    };

    const metadataPath = framePath.replace(".png", ".json");
    await fs.writeJson(metadataPath, frameData, { spaces: 2 });
  }

  getRecordingStatus() {
    return {
      isRecording: this.isRecording,
      captureCount: this.captureCount,
      sessionDir: this.sessionDir || null,
      frameCount: this.captureCount,
    };
  }

  async getSessions() {
    try {
      console.log("RecordingService: Getting sessions...");
      const sessions = this.db.getAllSessions();
      console.log("RecordingService: Raw sessions from DB:", sessions);

      // Transform database sessions into the expected format
      const transformedSessions = sessions.map((session) => ({
        id: session.session_id,
        startTime: session.start_time,
        endTime: session.end_time,
        frameCount: session.actual_frame_count || session.frame_count,
        status: session.status,
        path: path.join(this.storageDir, session.session_id),
        firstFrameTime: session.first_frame_time,
        lastFrameTime: session.last_frame_time,
      }));

      console.log(
        "RecordingService: Transformed sessions:",
        transformedSessions
      );
      return transformedSessions;
    } catch (error) {
      console.error("RecordingService: Failed to get sessions:", error);
      return [];
    }
  }

  async analyzeSession(sessionId) {
    try {
      console.log(`Starting AI analysis for session: ${sessionId}`);

      // Get frames for this session
      const frames = this.db.getFramesForSession(sessionId);

      if (frames.length === 0) {
        console.log(`No frames found for session: ${sessionId}`);
        return { success: false, message: "No frames to analyze" };
      }

      // Run AI analysis
      const analysisResult = await this.ai.analyzeSession(sessionId, frames);

      // Store analysis in database
      this.db.createAnalysis({
        sessionId: sessionId,
        frameId: null, // Session-level analysis
        analysisType: "session_summary",
        result: JSON.stringify(analysisResult),
        confidence: 0.85, // Mock confidence
      });

      console.log(`AI analysis completed for session: ${sessionId}`);
      return { success: true, analysis: analysisResult };
    } catch (error) {
      console.error(`AI analysis failed for session ${sessionId}:`, error);
      return { success: false, message: error.message };
    }
  }

  setAIProvider(provider) {
    this.ai.setProvider(provider);
  }

  setAIApiKey(apiKey) {
    this.ai.setApiKey(apiKey);
  }

  async initializeAIFromSettings() {
    try {
      const settings = this.db.getAllSettings();

      if (settings.aiProvider) {
        this.ai.setProvider(settings.aiProvider);
      }

      if (settings.geminiApiKey) {
        this.ai.setApiKey(settings.geminiApiKey);
      }

      console.log("AI service initialized from saved settings");
    } catch (error) {
      console.error("Failed to initialize AI from settings:", error);
    }
  }
}

module.exports = RecordingService;
