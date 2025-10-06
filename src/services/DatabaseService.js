const Database = require("better-sqlite3");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment");

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(process.cwd(), "data", "timelens.db");
    this.initDatabase();
  }

  async initDatabase() {
    try {
      // Ensure data directory exists
      await fs.ensureDir(path.dirname(this.dbPath));

      // Initialize database
      this.db = new Database(this.dbPath);

      // Enable foreign keys
      this.db.pragma("foreign_keys = ON");

      // Run migrations
      await this.runMigrations();

      console.log(`Database initialized: ${this.dbPath}`);
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  async runMigrations() {
    console.log("Running database migrations...");

    // Create sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        frame_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create frames table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS frames (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        frame_number INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        metadata_path TEXT,
        timestamp DATETIME NOT NULL,
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        format TEXT DEFAULT 'png',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
      )
    `);

    // Create analysis table (for future AI analysis)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        frame_id INTEGER,
        analysis_type TEXT NOT NULL,
        result TEXT,
        confidence REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE,
        FOREIGN KEY (frame_id) REFERENCES frames (id) ON DELETE CASCADE
      )
    `);

    // Create settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_frames_session_id ON frames(session_id);
      CREATE INDEX IF NOT EXISTS idx_frames_timestamp ON frames(timestamp);
      CREATE INDEX IF NOT EXISTS idx_analysis_session_id ON analysis(session_id);
    `);

    console.log("Database migrations completed");
  }

  // Session operations
  createSession(sessionId, startTime) {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (session_id, start_time, status)
      VALUES (?, ?, 'active')
    `);

    return stmt.run(sessionId, startTime);
  }

  updateSession(sessionId, updates) {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);
    values.push(sessionId);

    const stmt = this.db.prepare(`
      UPDATE sessions 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);

    return stmt.run(...values);
  }

  getSession(sessionId) {
    const stmt = this.db.prepare("SELECT * FROM sessions WHERE session_id = ?");
    return stmt.get(sessionId);
  }

  getAllSessions(limit = 50, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT s.*, 
             COUNT(f.id) as actual_frame_count,
             MIN(f.timestamp) as first_frame_time,
             MAX(f.timestamp) as last_frame_time
      FROM sessions s
      LEFT JOIN frames f ON s.session_id = f.session_id
      GROUP BY s.id
      ORDER BY s.start_time DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset);
  }

  // Frame operations
  createFrame(frameData) {
    const stmt = this.db.prepare(`
      INSERT INTO frames (
        session_id, frame_number, file_path, metadata_path,
        timestamp, file_size, width, height, format
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      frameData.sessionId,
      frameData.frameNumber,
      frameData.filePath,
      frameData.metadataPath,
      frameData.timestamp,
      frameData.fileSize,
      frameData.width,
      frameData.height,
      frameData.format
    );
  }

  getFramesForSession(sessionId) {
    const stmt = this.db.prepare(`
      SELECT * FROM frames 
      WHERE session_id = ? 
      ORDER BY frame_number ASC
    `);

    return stmt.all(sessionId);
  }

  deleteFramesForSession(sessionId) {
    const stmt = this.db.prepare(`
      DELETE FROM frames 
      WHERE session_id = ?
    `);

    const result = stmt.run(sessionId);
    return result.changes;
  }

  // Settings operations
  setSetting(key, value) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);

    return stmt.run(key, value);
  }

  getSetting(key, defaultValue = null) {
    const stmt = this.db.prepare("SELECT value FROM settings WHERE key = ?");
    const result = stmt.get(key);
    return result ? result.value : defaultValue;
  }

  getAllSettings() {
    const stmt = this.db.prepare("SELECT key, value FROM settings");
    const rows = stmt.all();

    const settings = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return settings;
  }

  // Analysis operations (for future use)
  createAnalysis(analysisData) {
    const stmt = this.db.prepare(`
      INSERT INTO analysis (session_id, frame_id, analysis_type, result, confidence)
      VALUES (?, ?, ?, ?, ?)
    `);

    return stmt.run(
      analysisData.sessionId,
      analysisData.frameId,
      analysisData.analysisType,
      analysisData.result,
      analysisData.confidence
    );
  }

  getAnalysisForSession(sessionId) {
    const stmt = this.db.prepare(`
      SELECT * FROM analysis 
      WHERE session_id = ? 
      ORDER BY created_at ASC
    `);

    return stmt.all(sessionId);
  }

  // Utility methods
  getDatabaseStats() {
    const sessionsCount = this.db
      .prepare("SELECT COUNT(*) as count FROM sessions")
      .get();
    const framesCount = this.db
      .prepare("SELECT COUNT(*) as count FROM frames")
      .get();
    const analysisCount = this.db
      .prepare("SELECT COUNT(*) as count FROM analysis")
      .get();

    return {
      sessions: sessionsCount.count,
      frames: framesCount.count,
      analysis: analysisCount.count,
      dbPath: this.dbPath,
    };
  }

  // Data cleanup methods
  async cleanupOldData(retentionDays = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete old sessions and their associated data
      const stmt = this.db.prepare(`
        DELETE FROM sessions 
        WHERE start_time < ?
      `);

      const result = stmt.run(cutoffDate.toISOString());
      console.log(`Cleaned up ${result.changes} old sessions`);

      return { success: true, deletedSessions: result.changes };
    } catch (error) {
      console.error("Failed to cleanup old data:", error);
      return { success: false, error: error.message };
    }
  }

  async deleteSessionData(sessionId) {
    try {
      // Delete frames first (due to foreign key constraints)
      const framesStmt = this.db.prepare(
        "DELETE FROM frames WHERE session_id = ?"
      );
      const framesResult = framesStmt.run(sessionId);

      // Delete analysis
      const analysisStmt = this.db.prepare(
        "DELETE FROM analysis WHERE session_id = ?"
      );
      const analysisResult = analysisStmt.run(sessionId);

      // Delete session
      const sessionStmt = this.db.prepare(
        "DELETE FROM sessions WHERE session_id = ?"
      );
      const sessionResult = sessionStmt.run(sessionId);

      console.log(
        `Deleted session ${sessionId}: ${sessionResult.changes} sessions, ${framesResult.changes} frames, ${analysisResult.changes} analyses`
      );

      return {
        success: true,
        deletedSessions: sessionResult.changes,
        deletedFrames: framesResult.changes,
        deletedAnalyses: analysisResult.changes,
      };
    } catch (error) {
      console.error("Failed to delete session data:", error);
      return { success: false, error: error.message };
    }
  }

  async keepOnlyProcessedData() {
    try {
      // Get all sessions with analysis
      const analyzedSessions = this.db
        .prepare(
          `
        SELECT DISTINCT s.session_id 
        FROM sessions s 
        INNER JOIN analysis a ON s.session_id = a.session_id
      `
        )
        .all();

      const analyzedSessionIds = analyzedSessions.map((s) => s.session_id);

      // Delete frames for analyzed sessions (keep only the analysis results)
      if (analyzedSessionIds.length > 0) {
        const placeholders = analyzedSessionIds.map(() => "?").join(",");
        const framesStmt = this.db.prepare(
          `DELETE FROM frames WHERE session_id IN (${placeholders})`
        );
        const framesResult = framesStmt.run(...analyzedSessionIds);

        console.log(
          `Cleaned up ${framesResult.changes} frames for ${analyzedSessionIds.length} analyzed sessions`
        );

        return {
          success: true,
          cleanedSessions: analyzedSessionIds.length,
          deletedFrames: framesResult.changes,
        };
      }

      return { success: true, cleanedSessions: 0, deletedFrames: 0 };
    } catch (error) {
      console.error("Failed to cleanup processed data:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = DatabaseService;
