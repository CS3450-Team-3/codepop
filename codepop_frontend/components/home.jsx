"use client";
import React from 'react';
import { useRouter } from 'next/navigation';

import { useState } from "react";

const tabs = ["Trending", "Signature", "Coke", "Mtn. Dew", "Dr. Pepper", "Sprite"];

const drinksData = {
  Trending: [
    { name: "Tropical Sunset", desc: "Pineapple, coconut, and mango flavors with a splash of lime", price: "$5.99" },
    { name: "Berry Blast", desc: "Mixed berries explosion with a hint of vanilla cream", price: "$5.49" },
    { name: "Caramel Dream", desc: "Rich caramel and vanilla over Dr Pepper", price: "$6.29" },
    { name: "Cherry Coke", desc: "Classic Coca-Cola with cherry flavor", price: "$4.49" },
    { name: "Citrus Glow", desc: "Orange and lemon fusion with light fizz", price: "$5.19" },
  ],
  Signature: [
    { name: "Vanilla Sky", desc: "Smooth vanilla cream with soda base", price: "$5.99" },
    { name: "Peach Wave", desc: "Fresh peach flavor with light citrus", price: "$5.49" },
    { name: "Golden Hour", desc: "Mango and pineapple blend", price: "$6.29" },
    { name: "Cool Breeze", desc: "Mint and lime refreshing mix", price: "$4.99" },
    { name: "Strawberry Cream", desc: "Strawberry with soft vanilla foam", price: "$5.79" },
  ],
  Coke: Array(5).fill({
    name: "Coke Mix",
    desc: "Custom Coca-Cola based flavor",
    price: "$4.99",
  }),
  "Mtn. Dew": Array(5).fill({
    name: "Dew Mix",
    desc: "Custom Mountain Dew blend",
    price: "$4.99",
  }),
  "Dr. Pepper": Array(5).fill({
    name: "Pepper Mix",
    desc: "Custom Dr Pepper flavor",
    price: "$4.99",
  }),
  Sprite: Array(5).fill({
    name: "Sprite Mix",
    desc: "Custom Sprite citrus blend",
    price: "$4.99",
  }),
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("Trending");

  return (
    <div className="bg-gray-100 min-h-screen pb-20">
      
      {/* Tabs */}
      <div className="flex gap-2 p-4 overflow-x-auto pl-16">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border ${
              activeTab === tab
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Title */}
      <h2 className="px-4 font-semibold text-lg mb-2">
        {activeTab} Drinks
      </h2>

      {/* Drink List */}
      <div className="space-y-4 px-4">
        {drinksData[activeTab].map((drink, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-4 flex gap-4 items-start shadow-sm"
          >
            {/* Image Placeholder */}
            <div className="w-16 h-16 bg-yellow-200 rounded-lg"></div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{drink.name}</h3>
                <span className="text-purple-600 font-semibold">
                  {drink.price}
                </span>
              </div>

              <p className="text-sm text-gray-500 mt-1">
                {drink.desc}
              </p>

              {/* Button */}
              <button className="mt-3 w-full bg-black text-white py-2 rounded-lg text-sm">
                Order Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};