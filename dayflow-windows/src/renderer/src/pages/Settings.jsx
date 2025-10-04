import React, { useState, useEffect } from "react";

function Settings() {
  const [settings, setSettings] = useState({
    aiProvider: "gemini",
    geminiApiKey: "",
    recordingQuality: "720p",
    storageRetention: "7",
    analysisInterval: "30",
    pauseWhenAway: false,
    excludedApps: "",
    autoStart: false,
    notifications: true,
    darkMode: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    // Load settings from electron
    const loadSettings = async () => {
      try {
        if (window.electronAPI) {
          const data = await window.electronAPI.getSettings();
          if (data) {
            setSettings({ ...settings, ...data });
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveSettings(settings);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckboxChange = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSetting = (key) => {
    return (
      <button
        onClick={() => handleCheckboxChange(key)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          settings[key] ? "bg-blue-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
            settings[key]
              ? "translate-x-6 bg-white"
              : "translate-x-1 bg-gray-300"
          }`}
        />
      </button>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure your TimeLens experience
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {lastSaved && (
              <span className="text-sm text-green-600">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-65 disabled:transform-none"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Provider Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
              <span className="text-xl">🤖</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">AI Provider</h3>
          </div>

          <div className="space-y-4">
            {[
              {
                id: "gemini",
                label: "Gemini API (Cloud)",
                description: "Google's advanced AI - Requires API key",
                icon: "☁️",
              },
              {
                id: "ollama",
                label: "Ollama (Local)",
                description: "Run AI models locally - Keep data private",
                icon: "🏠",
              },
              {
                id: "lmstudio",
                label: "LM Studio (Local)",
                description: "Local AI interface - Maximum privacy",
                icon: "🔒",
              },
            ].map((provider) => (
              <label
                key={provider.id}
                className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <input
                  type="radio"
                  name="ai-provider"
                  value={provider.id}
                  checked={settings.aiProvider === provider.id}
                  onChange={() => handleInputChange("aiProvider", provider.id)}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{provider.icon}</span>
                    <span className="font-medium text-gray-900">
                      {provider.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {provider.description}
                  </p>
                </div>
              </label>
            ))}

            {/* API Key Input for Gemini */}
            {settings.aiProvider === "gemini" && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="Enter your Gemini API key..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={settings.geminiApiKey}
                  onChange={(e) =>
                    handleInputChange("geminiApiKey", e.target.value)
                  }
                />
                <p className="text-xs text-gray-600 mt-2">
                  Get your API key from{" "}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Capture Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg">
              <span className="text-xl">📹</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Capture Settings
            </h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Recording Quality
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                value={settings.recordingQuality}
                onChange={(e) =>
                  handleInputChange("recordingQuality", e.target.value)
                }
              >
                <option value="720p">720p HD (Recommended)</option>
                <option value="1080p">1080p FullHD (Higher quality)</option>
                <option value="480p">480p SD (Lower storage)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Storage Retention
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                value={settings.storageRetention}
                onChange={(e) =>
                  handleInputChange("storageRetention", e.target.value)
                }
              >
                <option value="3">3 days</option>
                <option value="7">7 days (Default)</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Analysis Interval
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                value={settings.analysisInterval}
                onChange={(e) =>
                  handleInputChange("analysisInterval", e.target.value)
                }
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes (Default)</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* App Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
              <span className="text-xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              App Preferences
            </h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">
                  Start with Windows
                </div>
                <div className="text-sm text-gray-600">
                  Launch TimeLens when you log in
                </div>
              </div>
              {toggleSetting("autoStart")}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Notifications</div>
                <div className="text-sm text-gray-600">
                  Show desktop notifications for insights
                </div>
              </div>
              {toggleSetting("notifications")}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Dark Mode</div>
                <div className="text-sm text-gray-600">
                  Switch to dark theme
                </div>
              </div>
              {toggleSetting("darkMode")}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Pause when Away</div>
                <div className="text-sm text-gray-600">
                  Automatically pause recording when idle
                </div>
              </div>
              {toggleSetting("pauseWhenAway")}
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-red-100 to-pink-100 rounded-lg">
              <span className="text-xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Privacy & Security
            </h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Exclude Applications
              </label>
              <input
                type="text"
                placeholder="e.g., browser.exe, password-manager.exe..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={settings.excludedApps}
                onChange={(e) =>
                  handleInputChange("excludedApps", e.target.value)
                }
              />
              <p className="text-xs text-gray-500 mt-2">
                Separate multiple apps with commas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
