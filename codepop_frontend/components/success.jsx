"use client";
import React from "react";
import { CheckCircle, Home, ShoppingBag } from "lucide-react";

export default function Success({ setCurrentScreen }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4 text-center bg-white">
      <div className="bg-green-100 p-6 rounded-full mb-6">
        <CheckCircle size={64} className="text-green-600 animate-bounce" />
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Success!</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-xs">
        Your payment was processed successfully. Our baristas are now preparing your delicious drink!
      </p>
      
      <div className="space-y-3 w-full max-w-xs">
        <button 
          onClick={() => setCurrentScreen('home')}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition"
        >
          <Home size={20} />
          Back to Menu
        </button>
        
        <button 
          onClick={() => setCurrentScreen('My Orders')}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-800 py-4 rounded-xl font-bold hover:bg-gray-200 transition"
        >
          <ShoppingBag size={20} />
          View My Orders
        </button>
      </div>
    </div>
  );
}