"use client";
import React from 'react';

import { useState } from "react";

const tabs = ["Trending", "Signature", "Coke", "Mtn. Dew", "Dr. Pepper", "Sprite"];

const drinksData = {
  Trending: [
    { 
      name: "Tropical Sunset", 
      desc: "Pineapple, coconut, and mango flavors with a splash of lime", 
      price: "$5.99",
      baseSoda: "Sprite",
      syrups: { "Mango": 1, "Peach": 1 },
      addIns: ["Lime Slice"]
    },
    { 
      name: "Berry Blast", 
      desc: "Mixed berries explosion with a hint of vanilla cream", 
      price: "$5.49",
      baseSoda: "Mtn. Dew",
      syrups: { "Strawberry": 2, "Vanilla": 1 },
      addIns: ["Whipped Cream"]
    },
    { 
      name: "Caramel Dream", 
      desc: "Rich caramel and vanilla over Dr Pepper", 
      price: "$6.29",
      baseSoda: "Dr. Pepper",
      syrups: { "Caramel": 2, "Vanilla": 1 },
      addIns: ["Whipped Cream"]
    },
    { 
      name: "Cherry Coke", 
      desc: "Classic Coca-Cola with cherry flavor", 
      price: "$4.49",
      baseSoda: "Coke",
      syrups: { "Cherry": 2 },
      addIns: []
    },
    { 
      name: "Citrus Glow", 
      desc: "Orange and lemon fusion with light fizz", 
      price: "$5.19",
      baseSoda: "Fanta",
      syrups: { "Peach": 1 },
      addIns: ["Lime Slice"]
    },
  ],
  Signature: [
    { 
      name: "Vanilla Sky", 
      desc: "Smooth vanilla cream with soda base", 
      price: "$5.99",
      baseSoda: "Coke",
      syrups: { "Vanilla": 2 },
      addIns: ["Whipped Cream"]
    },
    { 
      name: "Peach Wave", 
      desc: "Fresh peach flavor with light citrus", 
      price: "$5.49",
      baseSoda: "Sprite",
      syrups: { "Peach": 2 },
      addIns: ["Lime Slice"]
    },
    { 
      name: "Golden Hour", 
      desc: "Mango and pineapple blend", 
      price: "$6.29",
      baseSoda: "Fanta",
      syrups: { "Mango": 2 },
      addIns: []
    },
    { 
      name: "Cool Breeze", 
      desc: "Mint and lime refreshing mix", 
      price: "$4.99",
      baseSoda: "Sprite",
      syrups: {},
      addIns: ["Lime Slice", "Extra Ice"]
    },
    { 
      name: "Strawberry Cream", 
      desc: "Strawberry with soft vanilla foam", 
      price: "$5.79",
      baseSoda: "Dr. Pepper",
      syrups: { "Strawberry": 1, "Vanilla": 1 },
      addIns: ["Whipped Cream"]
    },
  ],
  Coke: Array(5).fill({
    name: "Coke Mix",
    desc: "Custom Coca-Cola based flavor",
    price: "$4.99",
    baseSoda: "Coke",
    syrups: {},
    addIns: []
  }),
  "Mtn. Dew": Array(5).fill({
    name: "Dew Mix",
    desc: "Custom Mountain Dew blend",
    price: "$4.99",
    baseSoda: "Mtn. Dew",
    syrups: {},
    addIns: []
  }),
  "Dr. Pepper": Array(5).fill({
    name: "Pepper Mix",
    desc: "Custom Dr Pepper flavor",
    price: "$4.99",
    baseSoda: "Dr. Pepper",
    syrups: {},
    addIns: []
  }),
  Sprite: Array(5).fill({
    name: "Sprite Mix",
    desc: "Custom Sprite citrus blend",
    price: "$4.99",
    baseSoda: "Sprite",
    syrups: {},
    addIns: []
  }),
};

export default function Home({ setCurrentScreen, setSelectedDrink }) {
  const [activeTab, setActiveTab] = useState("Trending");

  const handleOrderNow = (drink) => {
    if (setSelectedDrink) setSelectedDrink(drink);
    if (setCurrentScreen) setCurrentScreen("Customize");
  };

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
              <button 
                onClick={() => handleOrderNow(drink)}
                className="mt-3 w-full bg-black text-white py-2 rounded-lg text-sm"
              >
                Order Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};