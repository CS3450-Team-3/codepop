import React, { useState } from "react";

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-semibold mb-4">Settings</h1>

      <div className="bg-white p-4 rounded-xl shadow space-y-4">
        <div className="flex justify-between items-center">
          <span>Notifications</span>
          <input
            type="checkbox"
            checked={notifications}
            onChange={() => setNotifications(!notifications)}
          />
        </div>

        <div className="flex justify-between items-center">
          <span>Dark Mode</span>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
          />
        </div>

        <div className="flex justify-between items-center">
          <span>Location Access</span>
          <input type="checkbox" defaultChecked />
        </div>
      </div>
    </div>
  );
};