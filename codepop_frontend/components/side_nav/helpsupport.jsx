import React from "react";

export default function HelpAndSupport() {
  const faqs = [
    {
      q: "How do I create a custom drink?",
      a: "Go to the 'Build Your Own Drink' page and select your size, flavors, toppings, and quantity."
    },
    {
      q: "How can I see my past orders?",
      a: "Check the 'My Orders' section in your profile."
    },
    {
      q: "Who can I contact for help?",
      a: "You can email support@example.com or use the in-app chat feature."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-semibold mb-4">Help & Support</h1>
      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl shadow">
            <p className="font-medium">{faq.q}</p>
            <p className="text-gray-600 mt-1">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};