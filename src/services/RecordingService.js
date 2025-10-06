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

    // Auto-analysis settings
    this.analysisInterval = 30 * 60 * 1000; // 30 minutes in milliseconds
    this.processingInterval = 5 * 60 * 1000; // 5 minutes for background processing
    this.analysisTimer = null;
    this.processingTimer = null;
    this.lastAnalysisTime = null;
    this.lastDisplayTime = null;

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

      // Start auto-analysis timer
      this.startSmartProcessing();

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

      // Stop smart processing timers
      this.stopSmartProcessing();

      // Update database session
      if (this.currentSessionId) {
        this.db.updateSession(this.currentSessionId, {
          end_time: moment().toISOString(),
          frame_count: this.captureCount,
          status: "completed",
        });

        // Process any remaining frames that weren't analyzed
        await this.processRemainingFrames();
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

  async getUnanalyzedSessions() {
    try {
      console.log("RecordingService: Getting unanalyzed sessions...");
      const sessions = this.db.getAllSessions();
      const unanalyzedSessions = [];

      for (const session of sessions) {
        if (session.status === "completed") {
          const hasAnalysis = this.db.getAnalysisForSession(session.session_id);
          if (hasAnalysis.length === 0) {
            unanalyzedSessions.push({
              id: session.session_id,
              startTime: session.start_time,
              endTime: session.end_time,
              frameCount: session.actual_frame_count || session.frame_count,
              status: session.status,
              path: path.join(this.storageDir, session.session_id),
              firstFrameTime: session.first_frame_time,
              lastFrameTime: session.last_frame_time,
            });
          }
        }
      }

      console.log(
        `RecordingService: Found ${unanalyzedSessions.length} unanalyzed sessions`
      );
      return unanalyzedSessions;
    } catch (error) {
      console.error(
        "RecordingService: Failed to get unanalyzed sessions:",
        error
      );
      return [];
    }
  }

  async analyzeSession(sessionId) {
    try {
      console.log(`Starting AI analysis for session: ${sessionId}`);

      // Check if session already has analysis
      const existingAnalysis = this.db.getAnalysisForSession(sessionId);
      if (existingAnalysis.length > 0) {
        console.log(`Session ${sessionId} already has analysis, skipping...`);
        return {
          success: false,
          message: "Session already analyzed",
          alreadyAnalyzed: true,
        };
      }

      // Get frames for this session
      const frames = this.db.getFramesForSession(sessionId);

      if (frames.length === 0) {
        console.log(`No frames found for session: ${sessionId}`);
        return { success: false, message: "No frames to analyze" };
      }

      console.log(
        `Found ${frames.length} frames to analyze for session: ${sessionId}`
      );

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

      // Automatically clean up raw frames after successful analysis
      if (analysisResult.timing) {
        console.log(
          `Analysis timing: Total ${analysisResult.timing.totalTime}ms, Summary ${analysisResult.timing.summaryTime}ms, Title ${analysisResult.timing.titleTime}ms, Description ${analysisResult.timing.descriptionTime}ms`
        );
        console.log(
          `Processed ${analysisResult.timing.processedFrames} frames from ${analysisResult.timing.frameCount} total frames`
        );
      }

      // Clean up raw frames and files after successful analysis
      await this.cleanupAfterAnalysis(sessionId);

      console.log(`AI analysis completed for session: ${sessionId}`);
      return { success: true, analysis: analysisResult };
    } catch (error) {
      console.error(`AI analysis failed for session ${sessionId}:`, error);
      return { success: false, message: error.message };
    }
  }

  async cleanupAfterAnalysis(sessionId) {
    try {
      console.log(`Cleaning up raw data for session: ${sessionId}`);

      // Delete frames from database
      const framesDeleted = this.db.deleteFramesForSession(sessionId);
      console.log(`Deleted ${framesDeleted} frame records from database`);

      // Delete actual frame files
      const sessionDir = path.join(this.storageDir, sessionId);
      if (fs.existsSync(sessionDir)) {
        const files = fs.readdirSync(sessionDir);
        let filesDeleted = 0;

        for (const file of files) {
          if (file.endsWith(".png") || file.endsWith(".json")) {
            try {
              fs.unlinkSync(path.join(sessionDir, file));
              filesDeleted++;
            } catch (error) {
              console.error(`Failed to delete file ${file}:`, error);
            }
          }
        }

        console.log(`Deleted ${filesDeleted} frame files from disk`);

        // Remove empty session directory
        try {
          fs.rmdirSync(sessionDir);
          console.log(`Removed session directory: ${sessionDir}`);
        } catch (error) {
          console.log(
            `Session directory not empty or already removed: ${sessionDir}`
          );
        }
      }

      console.log(`Cleanup completed for session: ${sessionId}`);
    } catch (error) {
      console.error(`Cleanup failed for session ${sessionId}:`, error);
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

  // Smart processing methods
  startSmartProcessing() {
    console.log("Starting smart processing (5min background + 30min display)");
    this.lastAnalysisTime = Date.now();
    this.lastDisplayTime = Date.now();

    // Background processing every 5 minutes
    this.processingTimer = setInterval(async () => {
      await this.performBackgroundProcessing();
    }, this.processingInterval);

    // Display results every 30 minutes
    this.analysisTimer = setInterval(async () => {
      await this.display30MinuteResults();
    }, this.analysisInterval);
  }

  stopSmartProcessing() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    console.log("Smart processing timers stopped");
  }

  async performBackgroundProcessing() {
    try {
      console.log("Performing background processing (5-minute chunks)...");

      if (!this.currentSessionId) {
        console.log("No active session for background processing");
        return;
      }

      // Get frames from the last 5 minutes
      const frames = this.db.getFramesForSession(this.currentSessionId);

      if (frames.length === 0) {
        console.log("No frames to process in background");
        return;
      }

      // Filter frames from the last 5 minutes
      const fiveMinutesAgo = Date.now() - this.processingInterval;
      const recentFrames = frames.filter((frame) => {
        const frameTime = new Date(frame.timestamp).getTime();
        return frameTime >= fiveMinutesAgo;
      });

      if (recentFrames.length === 0) {
        console.log("No recent frames for background processing");
        return;
      }

      console.log(
        `Background processing ${recentFrames.length} frames from last 5 minutes`
      );

      // Perform quick analysis
      const analysisResult = await this.ai.analyzeSession(
        this.currentSessionId,
        recentFrames
      );

      // Store analysis as background processing
      this.db.createAnalysis({
        sessionId: this.currentSessionId,
        frameId: null,
        analysisType: "background_5min",
        result: JSON.stringify(analysisResult),
        confidence: 0.85,
      });

      // Clean up processed frames immediately
      await this.cleanupProcessedFrames(recentFrames);

      console.log("Background processing completed successfully");

      // Update last processing time
      this.lastAnalysisTime = Date.now();
    } catch (error) {
      console.error("Background processing failed:", error);
    }
  }

  async display30MinuteResults() {
    try {
      console.log("Displaying 30-minute results...");

      if (!this.currentSessionId) {
        console.log("No active session for 30-minute display");
        return;
      }

      // Get all background analyses from the last 30 minutes
      const analyses = this.db.getAnalysisForSession(this.currentSessionId);
      const thirtyMinutesAgo = Date.now() - this.analysisInterval;

      const recentAnalyses = analyses.filter((analysis) => {
        const analysisTime = new Date(analysis.created_at).getTime();
        return analysisTime >= thirtyMinutesAgo;
      });

      if (recentAnalyses.length === 0) {
        console.log("No analyses to display for 30-minute period");
        return;
      }

      // Combine all background analyses into a 30-minute summary
      const combinedAnalysis = await this.combineAnalyses(recentAnalyses);

      // Store as 30-minute display result
      this.db.createAnalysis({
        sessionId: this.currentSessionId,
        frameId: null,
        analysisType: "display_30min",
        result: JSON.stringify(combinedAnalysis),
        confidence: 0.9,
      });

      console.log("30-minute results ready for display");

      // Update last display time
      this.lastDisplayTime = Date.now();
    } catch (error) {
      console.error("30-minute display failed:", error);
    }
  }

  async combineAnalyses(analyses) {
    try {
      // Parse all analysis results
      const parsedAnalyses = analyses
        .map((analysis) => {
          try {
            return JSON.parse(analysis.result);
          } catch (error) {
            console.error("Failed to parse analysis:", error);
            return null;
          }
        })
        .filter((analysis) => analysis !== null);

      if (parsedAnalyses.length === 0) {
        return {
          summary: "No analysis data available",
          description: ["Unable to generate description"],
          title: "Recording Session",
          segments: [],
        };
      }

      // Combine summaries
      const combinedSummary = parsedAnalyses.map((a) => a.summary).join(" ");

      // Combine descriptions
      const combinedDescription = parsedAnalyses
        .flatMap((a) => a.description || [])
        .filter((item, index, arr) => arr.indexOf(item) === index); // Remove duplicates

      // Generate final title
      const finalTitle = await this.ai.providers[
        this.ai.currentProvider
      ].generateTitle(combinedSummary);

      return {
        summary: combinedSummary,
        description: combinedDescription,
        title: finalTitle.title || "Recording Session",
        segments: parsedAnalyses.flatMap((a) => a.segments?.segments || []),
        combinedFrom: parsedAnalyses.length,
        period: "30 minutes",
      };
    } catch (error) {
      console.error("Failed to combine analyses:", error);
      return {
        summary: "Analysis combination failed",
        description: ["Unable to combine analysis data"],
        title: "Recording Session",
        segments: [],
      };
    }
  }

  async cleanupProcessedFrames(frames) {
    try {
      console.log(`Cleaning up ${frames.length} processed frames...`);

      // Delete frame records from database
      const frameIds = frames.map((f) => f.id);
      if (frameIds.length > 0) {
        const placeholders = frameIds.map(() => "?").join(",");
        const stmt = this.db.db.prepare(
          `DELETE FROM frames WHERE id IN (${placeholders})`
        );
        stmt.run(...frameIds);
      }

      // Delete actual frame files
      let filesDeleted = 0;
      for (const frame of frames) {
        try {
          if (fs.existsSync(frame.file_path)) {
            fs.unlinkSync(frame.file_path);
            filesDeleted++;
          }
          if (frame.metadata_path && fs.existsSync(frame.metadata_path)) {
            fs.unlinkSync(frame.metadata_path);
          }
        } catch (error) {
          console.error(
            `Failed to delete frame file ${frame.file_path}:`,
            error
          );
        }
      }

      console.log(`Deleted ${filesDeleted} frame files from disk`);
    } catch (error) {
      console.error("Failed to cleanup processed frames:", error);
    }
  }

  async processRemainingFrames() {
    try {
      console.log("Processing remaining frames after recording stopped...");

      if (!this.currentSessionId) {
        console.log("No session ID for processing remaining frames");
        return;
      }

      // Get all remaining frames
      const remainingFrames = this.db.getFramesForSession(
        this.currentSessionId
      );

      if (remainingFrames.length === 0) {
        console.log("No remaining frames to process");
        return;
      }

      console.log(`Processing ${remainingFrames.length} remaining frames`);

      // Perform analysis on remaining frames
      const analysisResult = await this.ai.analyzeSession(
        this.currentSessionId,
        remainingFrames
      );

      // Store analysis
      this.db.createAnalysis({
        sessionId: this.currentSessionId,
        frameId: null,
        analysisType: "final_analysis",
        result: JSON.stringify(analysisResult),
        confidence: 0.85,
      });

      // Clean up all remaining frames
      await this.cleanupProcessedFrames(remainingFrames);

      console.log("Remaining frames processed successfully");
    } catch (error) {
      console.error("Failed to process remaining frames:", error);
    }
  }
}

module.exports = RecordingService;
