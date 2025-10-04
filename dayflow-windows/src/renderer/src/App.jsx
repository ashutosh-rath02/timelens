import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import Timeline from "./pages/Timeline";
import Settings from "./pages/Settings";
import Debug from "./pages/Debug";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: "/timeline", label: "Timeline", icon: "📊" },
    { path: "/settings", label: "Settings", icon: "⚙️" },
    { path: "/debug", label: "Debug", icon: "🔧" },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <span className="text-blue-600 text-3xl">📹</span>
              <span>TimeLens</span>
            </h1>
          </div>

          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2
                  ${
                    location.pathname === item.path ||
                    (location.pathname === "/" && item.path === "/timeline")
                      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Router>
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Timeline />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/debug" element={<Debug />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default App;
