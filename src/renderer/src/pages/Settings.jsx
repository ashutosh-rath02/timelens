import React, { useState, useEffect } from "react";

function Settings() {
  const [settings, setSettings] = useState({
    aiProvider: "gemini",
    geminiApiKey: "",
    autoAnalyze: true,
    recordingInterval: 1,
    retentionDays: 7,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (window.electronAPI) {
          const savedSettings = await window.electronAPI.getSettings();
          setSettings({ ...settings, ...savedSettings });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveSettings(settings);
        alert("Settings saved successfully!");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings");
    }
  };

  const handleInputChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-600 mt-1">
          Configure your Timelens preferences
        </p>
      </div>

      {/* AI Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          AI Configuration
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              AI Provider
            </label>
            <select
              value={settings.aiProvider}
              onChange={(e) => handleInputChange("aiProvider", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="gemini">Gemini (Google)</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) =>
                handleInputChange("geminiApiKey", e.target.value)
              }
              placeholder="Enter your Gemini API key"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Get your API key from Google AI Studio
            </p>
          </div>
        </div>
      </div>

      {/* Recording Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Recording Settings
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Recording Interval (seconds)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.recordingInterval}
              onChange={(e) =>
                handleInputChange("recordingInterval", parseInt(e.target.value))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoAnalyze"
              checked={settings.autoAnalyze}
              onChange={(e) =>
                handleInputChange("autoAnalyze", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="autoAnalyze"
              className="text-sm font-medium text-slate-700"
            >
              Auto-analyze recordings when stopped
            </label>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Data Management
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Data Retention (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.retentionDays}
              onChange={(e) =>
                handleInputChange("retentionDays", parseInt(e.target.value))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Sessions older than this will be automatically deleted
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}

export default Settings;
