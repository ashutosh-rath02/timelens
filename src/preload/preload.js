const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Capture service
  startCapture: () => ipcRenderer.invoke("capture:start"),
  stopCapture: () => ipcRenderer.invoke("capture:stop"),
  getCaptureStatus: () => ipcRenderer.invoke("capture:status"),

  // Analysis service
  triggerAnalysis: () => ipcRenderer.invoke("analysis:trigger"),

  // Timeline
  getTimeline: () => ipcRenderer.invoke("timeline:get"),

  // Settings
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  getSettings: () => ipcRenderer.invoke("settings:get"),

  // Debug
  getLogs: () => ipcRenderer.invoke("debug:getLogs"),
  getDatabaseStats: () => ipcRenderer.invoke("debug:getDatabaseStats"),
  clearData: () => ipcRenderer.invoke("storage:clear"),
  keepOnlyProcessed: () => ipcRenderer.invoke("storage:keepOnlyProcessed"),
  cleanupOldData: () => ipcRenderer.invoke("storage:cleanupOldData"),
  createSampleSession: () => ipcRenderer.invoke("test:createSampleSession"),
  clearAllData: () => ipcRenderer.invoke("test:clearAllData"),

  // IPC listeners
  onCaptureStatusChanged: (callback) =>
    ipcRenderer.on("capture:status-changed", callback),
  onAnalysisComplete: (callback) =>
    ipcRenderer.on("analysis:complete", callback),
  onAnalysisStatus: (callback) => ipcRenderer.on("analysis:status", callback),
});
