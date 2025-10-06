import React, { useState, useEffect } from "react";

function Debug() {
  const [logs, setLogs] = useState([]);
  const [databaseStats, setDatabaseStats] = useState({
    sessions: 0,
    frames: 0,
    analysis: 0,
    dbPath: "",
    unanalyzedSessions: 0,
    unanalyzedSessionIds: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null);

  useEffect(() => {
    const loadDebugData = async () => {
      try {
        if (window.electronAPI) {
          const logsData = await window.electronAPI.getLogs();
          setLogs(logsData || []);

          const stats = await window.electronAPI.getDatabaseStats();
          setDatabaseStats(stats);
        }
      } catch (error) {
        console.error("Error loading debug data:", error);
      }
    };

    loadDebugData();

    // Listen for analysis status updates
    if (window.electronAPI) {
      window.electronAPI.onAnalysisStatus((event, status) => {
        setAnalysisStatus(status);
        if (status.status === "completed" || status.status === "error") {
          setIsLoading(false);
          setTimeout(() => {
            loadDebugData();
          }, 1000);
        }
      });
    }
  }, []);

  const handleAnalyzeNow = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.triggerAnalysis();
      }
    } catch (error) {
      console.error("Error triggering analysis:", error);
    }
  };

  const handleCreateTestSession = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.createSampleSession();
        if (result.success) {
          alert(`Test session created: ${result.sessionId}`);
          // Refresh debug data
          const loadDebugData = async () => {
            const logsData = await window.electronAPI.getLogs();
            setLogs(logsData || []);
            const stats = await window.electronAPI.getDatabaseStats();
            setDatabaseStats(stats);
          };
          loadDebugData();
        } else {
          alert("Failed to create test session: " + result.message);
        }
      }
    } catch (error) {
      console.error("Error creating test session:", error);
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm("This will delete ALL data. Are you sure?")) {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.clearAllData();
          if (result.success) {
            alert("All data cleared successfully!");
            // Refresh debug data
            const loadDebugData = async () => {
              const logsData = await window.electronAPI.getLogs();
              setLogs(logsData || []);
              setDatabaseStats({
                sessions: 0,
                frames: 0,
                analysis: 0,
                dbPath: "",
              });
            };
            loadDebugData();
          } else {
            alert("Failed to clear data: " + result.message);
          }
        }
      } catch (error) {
        console.error("Error clearing all data:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900">Debug & Utilities</h2>
        <p className="text-slate-600 mt-1">
          Monitor application health and manage data
        </p>
      </div>

      {/* Database Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🗄️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Sessions
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {databaseStats.sessions}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🖼️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Total Frames</p>
              <p className="text-2xl font-bold text-green-600">
                {databaseStats.frames}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🧠</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">AI Analyses</p>
              <p className="text-2xl font-bold text-purple-600">
                {databaseStats.analysis}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">
                Unanalyzed Sessions
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {databaseStats.unanalyzedSessions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">System Logs</h3>
        </div>
        <div className="p-6 max-h-80 overflow-y-auto font-mono text-xs bg-slate-50">
          {logs.length === 0 ? (
            <p className="text-slate-500">No logs available.</p>
          ) : (
            logs.map((log, index) => (
              <p
                key={index}
                className={`mb-1 ${
                  log.level === "error"
                    ? "text-red-600"
                    : log.level === "warning"
                    ? "text-yellow-600"
                    : "text-slate-800"
                }`}
              >
                <span className="text-slate-500">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>{" "}
                <span className="uppercase font-bold">{log.level}</span>:{" "}
                {log.message}
              </p>
            ))
          )}
        </div>
      </div>

      {/* Manual Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Manual Actions
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <div className="font-medium text-slate-900">
                Create Test Session
              </div>
              <div className="text-sm text-slate-600">
                Create a sample session for testing
              </div>
            </div>
            <button
              onClick={handleCreateTestSession}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Test
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
            <div>
              <div className="font-medium text-slate-900">Clear All Data</div>
              <div className="text-sm text-slate-600">
                Delete all sessions, frames, and analysis
              </div>
            </div>
            <button
              onClick={handleClearAllData}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Debug;
