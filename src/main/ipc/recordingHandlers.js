const { ipcMain } = require("electron");
const RecordingService = require("../../services/RecordingService");

class RecordingHandlers {
  constructor() {
    console.log("RecordingHandlers: Constructor called");
    this.recordingService = new RecordingService();
    this.setupHandlers();
    console.log("RecordingHandlers: Handlers setup complete");
  }

  setupHandlers() {
    // Start recording
    ipcMain.handle("capture:start", async () => {
      console.log("IPC: capture:start called");
      try {
        const result = await this.recordingService.startRecording();
        console.log("IPC: capture:start result:", result);
        return result;
      } catch (error) {
        console.error("IPC: Failed to start recording:", error);
        return { success: false, message: "IPC Error: " + error.message };
      }
    });

    // Stop recording
    ipcMain.handle("capture:stop", async () => {
      try {
        const result = await this.recordingService.stopRecording();
        return result;
      } catch (error) {
        console.error("IPC: Failed to stop recording:", error);
        return { success: false, message: "IPC Error: " + error.message };
      }
    });

    // Get recording status
    ipcMain.handle("capture:status", async () => {
      try {
        return this.recordingService.getRecordingStatus();
      } catch (error) {
        console.error("IPC: Failed to get recording status:", error);
        return { isRecording: false, captureCount: 0 };
      }
    });

    // Trigger analysis
    ipcMain.handle("analysis:trigger", async () => {
      try {
        // Get the most recent completed session
        const sessions = await this.recordingService.getSessions();
        const completedSessions = sessions.filter(
          (s) => s.status === "completed"
        );

        if (completedSessions.length === 0) {
          return {
            success: false,
            message: "No completed sessions to analyze",
          };
        }

        // Get unanalyzed sessions
        const unanalyzedSessions =
          await this.recordingService.getUnanalyzedSessions();

        if (unanalyzedSessions.length === 0) {
          return {
            success: false,
            message: "All completed sessions have already been analyzed",
          };
        }

        const sessionToAnalyze = unanalyzedSessions[0]; // Get the oldest unanalyzed session
        console.log(
          `Found unanalyzed session: ${sessionToAnalyze.id} (${unanalyzedSessions.length} total unanalyzed)`
        );

        // Send processing status to renderer
        const mainWindow = require("electron").BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send("analysis:status", {
            status: "processing",
            message: "Analyzing video chunk...",
            progress: 0,
          });
        }

        const result = await this.recordingService.analyzeSession(
          sessionToAnalyze.id
        );

        if (result.success) {
          console.log("Analysis triggered successfully");

          // Send completion status
          if (mainWindow) {
            mainWindow.webContents.send("analysis:status", {
              status: "completed",
              message: "Analysis completed successfully",
              progress: 100,
            });
          }

          return {
            success: true,
            message: "Analysis completed successfully",
            sessionId: sessionToAnalyze.id,
            analysis: result.analysis,
          };
        } else {
          // Send error status
          if (mainWindow) {
            mainWindow.webContents.send("analysis:status", {
              status: "error",
              message: result.message,
              progress: 0,
            });
          }

          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error("IPC: Failed to trigger analysis:", error);

        // Send error status
        const mainWindow = require("electron").BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send("analysis:status", {
            status: "error",
            message: "Analysis failed",
            progress: 0,
          });
        }

        return { success: false, message: "Analysis failed" };
      }
    });

    // Get timeline data
    ipcMain.handle("timeline:get", async () => {
      try {
        console.log("IPC: timeline:get called");
        const sessions = await this.recordingService.getSessions();
        console.log("IPC: Got sessions:", sessions.length, sessions);

        // Transform sessions into timeline format
        const timelineData = await Promise.all(
          sessions.map(async (session) => {
            console.log("IPC: Processing session:", session.id);
            // Get AI analysis for this session
            const analysis = this.recordingService.db.getAnalysisForSession(
              session.id
            );
            console.log(
              "IPC: Got analysis for session",
              session.id,
              ":",
              analysis.length,
              "entries"
            );
            let aiSummary = null;
            let aiTitle = null;
            let aiSegments = [];

            if (analysis.length > 0) {
              try {
                const analysisData = JSON.parse(analysis[0].result);
                aiSummary = analysisData.summary;
                aiTitle = analysisData.title?.title || analysisData.title;
                aiSegments = analysisData.segments || [];
                console.log(
                  "IPC: Parsed analysis for session",
                  session.id,
                  ":",
                  {
                    summary: aiSummary,
                    title: aiTitle,
                    segments: aiSegments.length,
                  }
                );
              } catch (error) {
                console.error(
                  `Failed to parse analysis for session ${session.id}:`,
                  error
                );
              }
            }

            const timelineItem = {
              id: session.id,
              title: aiTitle || `Recording Session: ${session.id}`,
              description: aiSummary || `Captured ${session.frameCount} frames`,
              timeRange: `${session.startTime} - ${
                session.endTime || "Active"
              }`,
              productivityScore: "N/A",
              focusLevel:
                session.status === "completed"
                  ? aiSummary
                    ? "Analyzed"
                    : "Analysis Pending"
                  : "Recording",
              frameCount: session.frameCount,
              startTime: session.startTime,
              endTime: session.endTime,
              status: session.status,
              duration: session.endTime
                ? Math.round(
                    (new Date(session.endTime) - new Date(session.startTime)) /
                      1000
                  )
                : null,
              aiSummary: aiSummary,
              aiSegments: aiSegments,
              hasAnalysis: !!aiSummary,
            };

            console.log("IPC: Created timeline item:", timelineItem);
            return timelineItem;
          })
        );

        console.log(
          "IPC: Returning timeline data:",
          timelineData.length,
          "items"
        );
        return timelineData;
      } catch (error) {
        console.error("IPC: Failed to get timeline:", error);
        return [];
      }
    });

    // Settings handlers
    ipcMain.handle("settings:save", async (event, settings) => {
      try {
        console.log("Settings saved:", settings);

        // Save settings to database
        Object.entries(settings).forEach(([key, value]) => {
          // Convert boolean values to strings for SQLite storage
          const stringValue =
            typeof value === "boolean" ? value.toString() : value;
          this.recordingService.db.setSetting(key, stringValue);
        });

        // Update AI provider if changed
        if (settings.aiProvider) {
          this.recordingService.setAIProvider(settings.aiProvider);
        }

        // Update API key if provided
        if (settings.geminiApiKey) {
          this.recordingService.setAIApiKey(settings.geminiApiKey);
        }

        return { success: true };
      } catch (error) {
        console.error("IPC: Failed to save settings:", error);
        return { success: false, message: error.message };
      }
    });

    ipcMain.handle("settings:get", async () => {
      try {
        // Get settings from database
        const settings = this.recordingService.db.getAllSettings();

        // Convert string boolean values back to actual booleans
        const convertedSettings = {};
        Object.entries(settings).forEach(([key, value]) => {
          if (value === "true") {
            convertedSettings[key] = true;
          } else if (value === "false") {
            convertedSettings[key] = false;
          } else {
            convertedSettings[key] = value;
          }
        });

        return convertedSettings;
      } catch (error) {
        console.error("IPC: Failed to get settings:", error);
        return {};
      }
    });

    // Debug handlers
    ipcMain.handle("debug:getLogs", async () => {
      try {
        // Simple log simulation
        return [
          {
            timestamp: new Date().toISOString(),
            level: "info",
            message: "Application started",
          },
          {
            timestamp: new Date(Date.now() + 1000).toISOString(),
            level: "info",
            message: `Recording service initialized with ${
              this.recordingService.getRecordingStatus().captureCount
            } frames`,
          },
        ];
      } catch (error) {
        console.error("IPC: Failed to get logs:", error);
        return [];
      }
    });

    // Database stats handler
    ipcMain.handle("debug:getDatabaseStats", async () => {
      try {
        const stats = this.recordingService.db.getDatabaseStats();
        const unanalyzedSessions =
          await this.recordingService.getUnanalyzedSessions();
        return {
          ...stats,
          unanalyzedSessions: unanalyzedSessions.length,
          unanalyzedSessionIds: unanalyzedSessions.map((s) => s.id),
        };
      } catch (error) {
        console.error("IPC: Failed to get database stats:", error);
        return { sessions: 0, frames: 0, analysis: 0, unanalyzedSessions: 0 };
      }
    });

    ipcMain.handle("storage:clear", async () => {
      try {
        // Clear recordings directory
        const fs = require("fs-extra");
        const path = require("path");
        const recordingsDir = path.join(process.cwd(), "recordings");

        await fs.remove(recordingsDir);
        await fs.ensureDir(recordingsDir);

        console.log("Storage cleared");
        return { success: true, message: "All data cleared" };
      } catch (error) {
        console.error("IPC: Failed to clear storage:", error);
        return { success: false, message: error.message };
      }
    });

    // Data cleanup handlers
    ipcMain.handle(
      "storage:cleanupOldData",
      async (event, retentionDays = 7) => {
        try {
          const result = await this.recordingService.db.cleanupOldData(
            retentionDays
          );
          return result;
        } catch (error) {
          console.error("IPC: Failed to cleanup old data:", error);
          return { success: false, message: error.message };
        }
      }
    );

    ipcMain.handle("storage:keepOnlyProcessed", async () => {
      try {
        const result = await this.recordingService.db.keepOnlyProcessedData();
        return result;
      } catch (error) {
        console.error("IPC: Failed to keep only processed data:", error);
        return { success: false, message: error.message };
      }
    });

    ipcMain.handle("storage:deleteSession", async (event, sessionId) => {
      try {
        const result = await this.recordingService.db.deleteSessionData(
          sessionId
        );
        return result;
      } catch (error) {
        console.error("IPC: Failed to delete session:", error);
        return { success: false, message: error.message };
      }
    });

    // Test data creation
    ipcMain.handle("test:createSampleSession", async () => {
      try {
        console.log("IPC: Creating sample session...");
        const sessionId = `test-${Date.now()}`;
        const startTime = new Date().toISOString();

        // Create a test session
        this.recordingService.db.createSession(sessionId, startTime);

        // Add some test frames
        for (let i = 0; i < 5; i++) {
          this.recordingService.db.createFrame({
            sessionId: sessionId,
            frameNumber: i,
            filePath: `test/frame_${i}.png`,
            metadataPath: `test/frame_${i}.json`,
            timestamp: new Date(Date.now() + i * 1000).toISOString(),
            fileSize: 1024,
            width: 1920,
            height: 1080,
            format: "png",
          });
        }

        // Update session as completed
        this.recordingService.db.updateSession(sessionId, {
          end_time: new Date(Date.now() + 5000).toISOString(),
          frame_count: 5,
          status: "completed",
        });

        console.log("IPC: Sample session created:", sessionId);
        return { success: true, sessionId: sessionId };
      } catch (error) {
        console.error("IPC: Failed to create sample session:", error);
        return { success: false, message: error.message };
      }
    });

    // Clear all data for fresh testing
    ipcMain.handle("test:clearAllData", async () => {
      try {
        console.log("IPC: Clearing all data for fresh testing...");

        // Clear database
        await this.recordingService.db.cleanupOldData(0); // Delete all sessions

        // Clear recordings directory
        const fs = require("fs-extra");
        const path = require("path");
        const recordingsDir = path.join(process.cwd(), "recordings");

        await fs.remove(recordingsDir);
        await fs.ensureDir(recordingsDir);

        console.log("IPC: All data cleared for fresh testing");
        return { success: true, message: "All data cleared" };
      } catch (error) {
        console.error("IPC: Failed to clear all data:", error);
        return { success: false, message: error.message };
      }
    });
  }

  getRecordingService() {
    return this.recordingService;
  }
}

module.exports = RecordingHandlers;
