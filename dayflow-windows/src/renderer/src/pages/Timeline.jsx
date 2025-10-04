import React, { useState, useEffect } from "react";

function Timeline() {
  const [isRecording, setIsRecording] = useState(false);
  const [timelineData, setTimelineData] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    // Load timeline data from electron
    const loadTimelineData = async () => {
      try {
        console.log("Timeline: Loading timeline data...");
        if (window.electronAPI) {
          const data = await window.electronAPI.getTimeline();
          console.log("Timeline: Received data:", data);
          setTimelineData(data || []);
        } else {
          console.log("Timeline: electronAPI not available");
        }
      } catch (error) {
        console.error("Timeline: Error loading timeline data:", error);
      }
    };

    loadTimelineData();
  }, []);

  const handleStartRecording = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.startCapture();
        setIsRecording(true);
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Error starting recording. Please check your permissions.");
    }
  };

  const handleStopRecording = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.stopCapture();
        setIsRecording(false);
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      alert("Error stopping recording");
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getActivityIcon = (activity) => {
    if (activity.includes("VS Code") || activity.includes("coding"))
      return "💻";
    if (activity.includes("Chrome") || activity.includes("browsing"))
      return "🌐";
    if (activity.includes("YouTube")) return "📺";
    if (activity.includes("Hotstar")) return "🎬";
    if (activity.includes("email")) return "📧";
    if (activity.includes("social")) return "📱";
    return "💼";
  };

  const getActivityColor = (activity) => {
    if (activity.includes("VS Code") || activity.includes("coding"))
      return "bg-blue-500";
    if (activity.includes("Chrome") || activity.includes("browsing"))
      return "bg-green-500";
    if (activity.includes("YouTube")) return "bg-red-500";
    if (activity.includes("Hotstar")) return "bg-purple-500";
    if (activity.includes("email")) return "bg-yellow-500";
    if (activity.includes("social")) return "bg-pink-500";
    return "bg-gray-500";
  };

  const getBriefSummary = (session) => {
    // Extract brief summary from the full description
    const words = session.description.split(" ");
    if (words.length > 8) {
      return words.slice(0, 8).join(" ") + "...";
    }
    return session.description;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl">📊</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
              <p className="text-gray-600">Track your daily activities</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              &lt; Today,{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              &gt;
            </div>

            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRecording ? "bg-red-500 animate-pulse" : "bg-gray-300"
                }`}
              ></div>
              <span className="text-sm text-gray-600">
                {isRecording ? "Recording" : "Ready"}
              </span>
            </div>

            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-16 bg-white/60 backdrop-blur-sm border-r border-orange-200 flex flex-col items-center py-6 space-y-6">
          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-600">📊</span>
          </div>
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white">📈</span>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-600">🖥️</span>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-600">⚙️</span>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-600">🔒</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Timeline Area */}
          <div className="flex-1 p-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-200 h-full">
              {/* Filter Tabs */}
              <div className="p-6 border-b border-orange-200">
                <div className="flex space-x-2">
                  {[
                    {
                      id: "all",
                      label: "All tasks",
                      icon: "⏳",
                      active: activeFilter === "all",
                    },
                    {
                      id: "core",
                      label: "Core tasks",
                      icon: "👤",
                      active: activeFilter === "core",
                    },
                    {
                      id: "personal",
                      label: "Personal tasks",
                      icon: "👥",
                      active: activeFilter === "personal",
                    },
                    {
                      id: "distractions",
                      label: "Distractions",
                      icon: "😉",
                      active: activeFilter === "distractions",
                    },
                    {
                      id: "idle",
                      label: "Idle time",
                      icon: "😴",
                      active: activeFilter === "idle",
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        tab.active
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Content */}
              <div className="p-6 h-full overflow-y-auto">
                {timelineData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                      <span className="text-4xl text-gray-400">📊</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No activities recorded yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Start recording to see your timeline
                    </p>
                    <button
                      onClick={handleStartRecording}
                      className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                      Start Recording
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timelineData.map((session, index) => (
                      <div
                        key={session.id}
                        className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-12 h-12 ${getActivityColor(
                              session.description
                            )} rounded-lg flex items-center justify-center`}
                          >
                            <span className="text-white text-xl">
                              {getActivityIcon(session.description)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {session.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {getBriefSummary(session)}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>
                                {formatTime(session.startTime)} -{" "}
                                {formatTime(session.endTime)}
                              </span>
                              <span>
                                {session.duration
                                  ? `${Math.floor(session.duration / 60)}m ${
                                      session.duration % 60
                                    }s`
                                  : "N/A"}
                              </span>
                              <span>{session.frameCount} frames</span>
                            </div>
                          </div>
                          <div className="text-right">
                            {session.hasAnalysis && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                🤖 Analyzed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Detail Panel */}
          {selectedSession && (
            <div className="w-96 bg-white/80 backdrop-blur-sm border-l border-orange-200 p-6">
              <div className="h-full overflow-y-auto">
                {/* Activity Detail */}
                <div className="mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div
                      className={`w-12 h-12 ${getActivityColor(
                        selectedSession.description
                      )} rounded-lg flex items-center justify-center`}
                    >
                      <span className="text-white text-xl">
                        {getActivityIcon(selectedSession.description)}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedSession.title}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {formatTime(selectedSession.startTime)} to{" "}
                        {formatTime(selectedSession.endTime)}
                      </p>
                    </div>
                  </div>

                  {/* Screenshot placeholder */}
                  <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-4">
                    <span className="text-gray-400">📸 Screenshot Preview</span>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    SUMMARY
                  </h3>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {selectedSession.aiSummary || selectedSession.description}
                  </div>

                  {/* Timeline Segments */}
                  {selectedSession.aiSegments &&
                    selectedSession.aiSegments.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Timeline Segments:
                        </h4>
                        <div className="space-y-2">
                          {selectedSession.aiSegments.map((segment, index) => (
                            <div
                              key={index}
                              className="text-sm text-gray-600 bg-gray-50 p-2 rounded"
                            >
                              <span className="font-medium">
                                {segment.startTimestamp} -{" "}
                                {segment.endTimestamp}:
                              </span>{" "}
                              {segment.description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Focus and Distraction Meters */}
                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                        <span>FOCUS METER</span>
                        <span>82%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: "82%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                        <span>DISTRACTIONS</span>
                        <span>12%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: "12%" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
