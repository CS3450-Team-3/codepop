import React from "react";

export default function Share() {
  const socialLinks = [
    { name: "Facebook", url: "https://www.facebook.com" },
    { name: "Twitter", url: "https://twitter.com" },
    { name: "Instagram", url: "https://www.instagram.com" },
    { name: "WhatsApp", url: "https://www.whatsapp.com" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-semibold mb-4">Share with Friends</h1>
      <div className="space-y-3">
        {socialLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white p-4 rounded-xl shadow hover:bg-gray-100"
          >
            {link.name}
          </a>
        ))}
      </div>
    </div>
  );
};