const { app, BrowserWindow } = require("electron");
const path = require("path");
const RecordingHandlers = require("./ipc/recordingHandlers");

const isDev = process.env.NODE_ENV === "development";

// Initialize recording handlers
console.log("Initializing recording handlers...");
const recordingHandlers = new RecordingHandlers();
console.log("Recording handlers initialized successfully");

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "TimeLens - Productivity Tracker",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
    },
  });

  // Load the app

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

// This method will be called when Electron has finished initialization
// and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (navigationEvent, navigationURL) => {
    navigationEvent.preventDefault();
  });
});
