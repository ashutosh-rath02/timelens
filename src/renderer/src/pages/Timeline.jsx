import React, { useState, useEffect } from "react";

function Timeline() {
  const [isRecording, setIsRecording] = useState(false);
  const [timelineData, setTimelineData] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    const loadTimelineData = async () => {
      try {
        if (window.electronAPI) {
          const data = await window.electronAPI.getTimeline();
          setTimelineData(data || []);
        }
      } catch (error) {
        console.error("Timeline: Error loading timeline data:", error);
      }
    };

    loadTimelineData();

    // Listen for updates
    if (window.electronAPI) {
      window.electronAPI.onCaptureStatusChanged((event, status) => {
        setIsRecording(status.isRecording);
        if (!status.isRecording) {
          loadTimelineData();
        }
      });
      window.electronAPI.onAnalysisComplete(() => {
        loadTimelineData();
      });
    }
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

  const handleManualAnalyze = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.triggerAnalysis();
        // Refresh timeline data after analysis
        const data = await window.electronAPI.getTimeline();
        setTimelineData(data || []);
      }
    } catch (error) {
      console.error("Error triggering analysis:", error);
      alert("Error triggering analysis");
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
    if (activity.includes("email")) return "📧";
    return "💼";
  };

  const getActivityColor = (description) => {
    if (!description) return "#fef3c7"; // Light yellow

    const desc = Array.isArray(description)
      ? description.join(" ").toLowerCase()
      : description.toLowerCase();

    if (
      desc.includes("code") ||
      desc.includes("programming") ||
      desc.includes("development")
    ) {
      return "#dbeafe"; // Light blue
    } else if (
      desc.includes("meeting") ||
      desc.includes("call") ||
      desc.includes("zoom")
    ) {
      return "#dcfce7"; // Light green
    } else if (desc.includes("email") || desc.includes("mail")) {
      return "#fef3c7"; // Light yellow
    } else if (
      desc.includes("browse") ||
      desc.includes("web") ||
      desc.includes("internet")
    ) {
      return "#e0e7ff"; // Light indigo
    } else if (
      desc.includes("document") ||
      desc.includes("write") ||
      desc.includes("text")
    ) {
      return "#f3e8ff"; // Light purple
    } else if (
      desc.includes("video") ||
      desc.includes("youtube") ||
      desc.includes("watch")
    ) {
      return "#fef2f2"; // Light red
    } else if (desc.includes("game") || desc.includes("gaming")) {
      return "#ecfdf5"; // Light emerald
    } else if (
      desc.includes("music") ||
      desc.includes("audio") ||
      desc.includes("sound")
    ) {
      return "#f0f9ff"; // Light cyan
    } else if (
      desc.includes("design") ||
      desc.includes("art") ||
      desc.includes("creative")
    ) {
      return "#fef7cd"; // Light amber
    } else if (
      desc.includes("social") ||
      desc.includes("twitter") ||
      desc.includes("facebook")
    ) {
      return "#fce7f3"; // Light pink
    } else {
      return "#f8fafc"; // Light slate
    }
  };

  const getBriefSummary = (session) => {
    const words = session.description.split(" ");
    if (words.length > 8) {
      return words.slice(0, 8).join(" ") + "...";
    }
    return session.description;
  };

  return (
    <div className="w-full max-w-none space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Timeline</h2>
            <p className="text-slate-600 mt-1">Track your daily activities</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRecording ? "bg-red-500 animate-pulse" : "bg-slate-300"
                }`}
              ></div>
              <span className="text-sm text-slate-600">
                {isRecording ? "Recording" : "Ready"}
              </span>
            </div>

            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </button>

            <button
              onClick={handleManualAnalyze}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all"
            >
              Analyze Now
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Modern Timeline Layout */}
      <div className="flex h-[calc(100vh-200px)] gap-4">
        {/* Timeline Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {timelineData.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                No activities recorded yet
              </h3>
              <p className="text-slate-600 mb-8 text-lg">
                Start recording to see your timeline
              </p>
              <button
                onClick={handleStartRecording}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
              >
                Start Recording
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {timelineData.map((session, index) => (
                <div
                  key={session.id}
                  className={`group relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-slate-300 ${
                    selectedSession?.id === session.id
                      ? "ring-2 ring-blue-500 border-blue-200 shadow-lg"
                      : ""
                  }`}
                  onClick={() => setSelectedSession(session)}
                >
                  {/* Timeline Indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600"></div>

                  {/* Content */}
                  <div className="p-5 pl-7">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Icon */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border-2 border-white"
                          style={{
                            backgroundColor: getActivityColor(
                              session.description
                            ),
                          }}
                        >
                          <span className="text-xl">
                            {getActivityIcon(session.description)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-bold text-slate-900 truncate">
                              {session.title}
                            </h3>
                            {session.hasAnalysis && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                                AI Analyzed
                              </span>
                            )}
                          </div>

                          {/* Summary - Small */}
                          <p className="text-slate-600 mb-2 text-sm font-medium">
                            {getBriefSummary(session)}
                          </p>

                          {/* Description - Detailed with bullet points */}
                          {session.description &&
                            Array.isArray(session.description) && (
                              <div className="mb-3">
                                <div className="text-xs text-slate-500 mb-1 font-medium">
                                  Activities:
                                </div>
                                <ul className="text-xs text-slate-600 space-y-1">
                                  {session.description
                                    .slice(0, 3)
                                    .map((item, index) => (
                                      <li
                                        key={index}
                                        className="flex items-start"
                                      >
                                        <span className="text-blue-500 mr-1.5 mt-0.5">
                                          •
                                        </span>
                                        <span className="leading-tight">
                                          {item}
                                        </span>
                                      </li>
                                    ))}
                                  {session.description.length > 3 && (
                                    <li className="text-slate-400 italic">
                                      +{session.description.length - 3} more
                                      activities
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}

                          <div className="flex items-center space-x-6 text-sm text-slate-500">
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">🕒</span>
                              <span className="font-medium">
                                {formatTime(session.startTime)} -{" "}
                                {formatTime(session.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">⏱️</span>
                              <span>
                                {session.duration
                                  ? `${Math.floor(session.duration / 60)}m ${
                                      session.duration % 60
                                    }s`
                                  : "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">📸</span>
                              <span>{session.frameCount} frames</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg
                          className="w-5 h-5 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="w-[420px] flex-shrink-0">
          <div className="h-full overflow-y-auto custom-scrollbar">
            {selectedSession ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                {/* Header */}
                <div className="flex items-start space-x-4 mb-5 pb-5 border-b border-slate-200">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm border-2 border-white"
                    style={{
                      backgroundColor: getActivityColor(
                        selectedSession.description
                      ),
                    }}
                  >
                    <span className="text-2xl">
                      {getActivityIcon(selectedSession.description)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-slate-900 mb-1">
                      {selectedSession.title}
                    </h2>
                    <p className="text-slate-600 text-sm">
                      {formatTime(selectedSession.startTime)} to{" "}
                      {formatTime(selectedSession.endTime)}
                    </p>
                    {selectedSession.hasAnalysis && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                        AI Analyzed
                      </span>
                    )}
                  </div>
                </div>

                {/* Summary - Small */}
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    Summary
                  </h3>
                  <div className="text-slate-700 text-sm font-medium bg-slate-50 rounded-lg p-3">
                    {selectedSession.aiSummary ||
                      getBriefSummary(selectedSession)}
                  </div>
                </div>

                {/* Description - Detailed Activities */}
                {selectedSession.description &&
                  Array.isArray(selectedSession.description) && (
                    <div className="mb-5">
                      <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                        Detailed Activities
                      </h3>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <ul className="space-y-2">
                          {selectedSession.description.map((item, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-500 mr-2 mt-1.5 text-sm">
                                •
                              </span>
                              <span className="text-slate-700 leading-relaxed text-sm">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                {/* Timeline Segments */}
                {selectedSession.aiSegments &&
                  selectedSession.aiSegments.length > 0 && (
                    <div className="mb-5">
                      <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                        Timeline Segments
                      </h3>
                      <div className="space-y-3">
                        {selectedSession.aiSegments.map((segment, index) => (
                          <div
                            key={index}
                            className="bg-slate-50 rounded-lg p-4 border-l-4 border-purple-500"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-purple-700">
                                {segment.startTimestamp} -{" "}
                                {segment.endTimestamp}
                              </span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed">
                              {segment.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👆</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Select an Activity
                </h3>
                <p className="text-slate-600 text-sm">
                  Click on a timeline card to see detailed information
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
