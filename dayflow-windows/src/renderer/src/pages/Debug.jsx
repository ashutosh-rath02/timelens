import React, { useState, useEffect } from "react";

function Debug() {
  const [logs, setLogs] = useState([]);
  const [databaseStats, setDatabaseStats] = useState({
    recordings: 0,
    diskUsage: "0 MB",
    processedSessions: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState("all");
  const [analysisStatus, setAnalysisStatus] = useState(null);

  useEffect(() => {
    // Load debug data from electron
    const loadDebugData = async () => {
      try {
        if (window.electronAPI) {
          const logsData = await window.electronAPI.getLogs();
          setLogs(logsData || []);

          // Mock database stats for now - would be replaced with actual electron API call
          setDatabaseStats({
            recordings: 0,
            diskUsage: "0 MB",
            processedSessions: 0,
          });
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
          // Refresh debug data after completion
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
        // Show success feedback
      }
    } catch (error) {
      console.error("Error triggering analysis:", error);
    } finally {
      setIsLoading(false);
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
    if (
      window.confirm(
        "This will delete ALL data including sessions, frames, and analysis. Are you sure?"
      )
    ) {
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

  const handleKeepOnlyProcessed = async () => {
    if (
      window.confirm(
        "This will delete all raw screenshot frames but keep AI analysis results. Continue?"
      )
    ) {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.keepOnlyProcessed();
          if (result.success) {
            alert(
              `Cleanup completed! Deleted ${result.deletedFrames} frames from ${result.cleanedSessions} sessions.`
            );
            // Refresh debug data
            const loadDebugData = async () => {
              const logsData = await window.electronAPI.getLogs();
              setLogs(logsData || []);
              const stats = await window.electronAPI.getDatabaseStats();
              setDatabaseStats(stats);
            };
            loadDebugData();
          } else {
            alert("Failed to cleanup data: " + result.message);
          }
        }
      } catch (error) {
        console.error("Error cleaning up processed data:", error);
      }
    }
  };

  const handleCleanupOldData = async () => {
    if (
      window.confirm(
        "This will delete all sessions older than 7 days. Continue?"
      )
    ) {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.cleanupOldData();
          if (result.success) {
            alert(
              `Cleanup completed! Deleted ${result.deletedSessions} old sessions.`
            );
            // Refresh debug data
            const loadDebugData = async () => {
              const logsData = await window.electronAPI.getLogs();
              setLogs(logsData || []);
              const stats = await window.electronAPI.getDatabaseStats();
              setDatabaseStats(stats);
            };
            loadDebugData();
          } else {
            alert("Failed to cleanup old data: " + result.message);
          }
        }
      } catch (error) {
        console.error("Error cleaning up old data:", error);
      }
    }
  };

  const handleClearData = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This action cannot be undone."
      )
    ) {
      try {
        if (window.electronAPI) {
          await window.electronAPI.clearData();
          // Reload debug data
          const loadDebugData = async () => {
            const logsData = await window.electronAPI.getLogs();
            setLogs(logsData || []);
            setDatabaseStats({
              recordings: 0,
              diskUsage: "0 MB",
              processedSessions: 0,
            });
          };
          loadDebugData();
        }
      } catch (error) {
        console.error("Error clearing data:", error);
      }
    }
  };

  const handleExport = () => {
    // Mock export functionality
    const exportData = {
      timestamp: new Date().toISOString(),
      logs: logs,
      databaseStats: databaseStats,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timelens-export-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter === "all") return true;
    if (logFilter === "error") return log.level === "error";
    if (logFilter === "warning") return log.level === "warning";
    if (logFilter === "info") return log.level === "info";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
            <span className="text-xl">🔧</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Debug & Developer Tools
            </h2>
            <p className="text-gray-600">
              Monitor system performance and troubleshoot issues
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Recordings
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {databaseStats.recordings}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <span className="text-2xl">💾</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Disk Usage</p>
              <p className="text-2xl font-bold text-green-600">
                {databaseStats.diskUsage}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <span className="text-2xl">⚙️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Processed Sessions
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {databaseStats.processedSessions}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
                <span className="text-xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                System Logs
              </h3>
            </div>
            <div className="flex space-x-2">
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:row focus:row-blue-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="error">Errors</option>
                <option value="warning">Warnings</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, index) => (
                <div key={index} className="mb-1">
                  <span className="text-gray-500">
                    [{new Date(log.timestamp).toLocaleString()}]
                  </span>{" "}
                  <span
                    className={
                      log.level === "error"
                        ? "text-red-400"
                        : log.level === "warning"
                        ? "text-yellow-400"
                        : "text-green-400"
                    }
                  >
                    [{log.level?.toUpperCase() || "INFO"}]
                  </span>{" "}
                  <span className="text-white">{log.message}</span>
                </div>
              ))
            ) : (
              <>
                <div className="text-gray-500">
                  [2025-10-03 16:30:00] [INFO] Application started
                </div>
                <div className="text-gray-500">
                  [2025-10-03 16:30:01] [INFO] Database initialized successfully
                </div>
                <div className="text-gray-500">
                  [2025-10-03 16:30:02] [DEBUG] Ready for screen recording
                </div>
                <div className="text-yellow-400">
                  [2025-10-03 16:30:05] [WARNING] No recordings found
                </div>
                <div className="text-green-400">
                  [2025-10-03 16:30:10] [INFO] System ready
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
            <span>Showing {filteredLogs.length} log entries</span>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Refresh Logs
            </button>
          </div>
        </div>

        {/* Manual Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg">
              <span className="text-xl">🎛️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Manual Actions
            </h3>
          </div>

          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 flex items-center space-x-2">
                    <span>🔍</span>
                    <span>Trigger Analysis</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Manually analyze unprocessed recordings
                  </div>
                </div>
                <button
                  onClick={handleAnalyzeNow}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{analysisStatus?.message || "Analyzing..."}</span>
                    </div>
                  ) : (
                    "Analyze Now"
                  )}
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 flex items-center space-x-2">
                    <span>💾</span>
                    <span>Export Timeline</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Export timeline data as JSON
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                >
                  Export
                </button>
              </div>
            </div>

            <div className="border border-green-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 flex items-center space-x-2">
                    <span>🧪</span>
                    <span>Create Test Session</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Create a sample session for testing timeline display
                  </div>
                </div>
                <button
                  onClick={handleCreateTestSession}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                >
                  Create Test
                </button>
              </div>
            </div>

            <div className="border border-red-200 rounded-lg p-4 hover:border-red-300 hover:bg-red-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 flex items-center space-x-2">
                    <span>🗑️</span>
                    <span>Clear All Data</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Delete all sessions, frames, and analysis for fresh testing
                  </div>
                </div>
                <button
                  onClick={handleClearAllData}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="border border-blue-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 flex items-center space-x-2">
                    <span>🧹</span>
                    <span>Keep Only Processed Data</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Delete raw frames, keep only AI analysis results
                  </div>
                </div>
                <button
                  onClick={handleKeepOnlyProcessed}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200"
                >
                  Cleanup
                </button>
              </div>
            </div>

            <div className="border border-yellow-200 rounded-lg p-4 hover:border-yellow-300 hover:bg-yellow-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 flex items-center space-x-2">
                    <span>⏰</span>
                    <span>Cleanup Old Data</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Delete sessions older than 7 days
                  </div>
                </div>
                <button
                  onClick={handleCleanupOldData}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200"
                >
                  Cleanup
                </button>
              </div>
            </div>

            <div className="border border-red-200 rounded-lg p-4 hover:border-red-300 hover:bg-red-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 flex items-center space-x-2">
                    <span>🗑️</span>
                    <span>Clear All Data</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Remove all recordings and database entries
                  </div>
                </div>
                <button
                  onClick={handleClearData}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200"
                >
                  Clear Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
              <span className="text-xl">📈</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Performance Metrics
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">CPU</div>
              <div className="text-sm text-blue-600 mt-1">Processing Usage</div>
              <div className="text-xl font-semibold text-blue-800 mt-2">
                12%
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-700">MEM</div>
              <div className="text-sm text-green-600 mt-1">Memory Usage</div>
              <div className="text-xl font-semibold text-green-800 mt-2">
                145 MB
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">GPU</div>
              <div className="text-sm text-purple-600 mt-1">Graphics Usage</div>
              <div className="text-xl font-semibold text-purple-800 mt-2">
                8%
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">NET</div>
              <div className="text-sm text-orange-600 mt-1">Network I/O</div>
              <div className="text-xl font-semibold text-orange-800 mt-2">
                1.2 MB/s
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Debug;
