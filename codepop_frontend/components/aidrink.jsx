"use client";
import React, { useState, useRef, useEffect } from "react";

const sizes = [
  { label: "Small (16 oz)", price: 3.99 },
  { label: "Medium (24 oz)", price: 4.99 },
  { label: "Large (32 oz)", price: 5.99 },
];

const flavorsList = [
  "Vanilla",
  "Caramel",
  "Cherry",
  "Peach",
  "Mango",
  "Strawberry",
];

const toppingsList = [
  { name: "Whipped Cream", price: 0.5 },
  { name: "Lime Slice", price: 0.3 },
  { name: "Extra Ice", price: 0.2 },
];

// Helpers
const getRandomDrink = () => {
  const size = sizes[Math.floor(Math.random() * sizes.length)];

  const flavors = {};
  flavorsList.forEach((f) => {
    const shots = Math.floor(Math.random() * 3);
    if (shots > 0) flavors[f] = shots;
  });

  const toppings = toppingsList.filter(() => Math.random() > 0.5);

  return { size, flavors, toppings };
};

// Slightly “better” combos
const getCuratedDrink = () => {
  const size = sizes[1]; // prefer medium

  const flavorPairs = [
    ["Vanilla", "Caramel"],
    ["Strawberry", "Vanilla"],
    ["Mango", "Peach"],
    ["Cherry", "Vanilla"],
  ];

  const pair = flavorPairs[Math.floor(Math.random() * flavorPairs.length)];

  const flavors = {};
  pair.forEach((f) => (flavors[f] = 1 + Math.floor(Math.random() * 2)));

  return {
    size,
    flavors,
    toppings: [toppingsList[0]], // usually whipped cream
  };
};

export default function AIDrink({ addToCart }) {
  const [generated, setGenerated] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftDrink, setDraftDrink] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const modalRef = useRef();

  const generateDrinks = () => {
    setGenerated(Array.from({ length: 5 }, getRandomDrink));
    setRecommended(Array.from({ length: 5 }, getCuratedDrink));
  };

  // Open modal
  const openCustomizer = (drink) => {
    setDraftDrink(JSON.parse(JSON.stringify(drink))); // clone
    setSelectedDrink(drink);
    setIsModalOpen(true);
  };

  // Close + save
  const closeModal = () => {
    setSelectedDrink(draftDrink);
    setIsModalOpen(false);
  };

  // Click outside handler
  useEffect(() => {
    const handleClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        closeModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClick);
    }

    return () => document.removeEventListener("mousedown", handleClick);
  }, [isModalOpen, draftDrink]);

  const updateFlavor = (flavor, amount) => {
    setDraftDrink((prev) => ({
      ...prev,
      flavors: {
        ...prev.flavors,
        [flavor]: Math.max(0, (prev.flavors[flavor] || 0) + amount),
      },
    }));
  };

  const toggleTopping = (topping) => {
    setDraftDrink((prev) => ({
      ...prev,
      toppings: prev.toppings.includes(topping)
        ? prev.toppings.filter((t) => t !== topping)
        : [...prev.toppings, topping],
    }));
  };

  const calculatePrice = () => {
    if (!selectedDrink) return "0.00";

    let price = selectedDrink.size.price;

    Object.values(selectedDrink.flavors).forEach((c) => {
      price += c * 0.3;
    });

    selectedDrink.toppings.forEach((t) => {
      price += t.price;
    });

    return (price * quantity).toFixed(2);
  };

  return (
    <div className="p-4 pb-24">
      <button
        onClick={generateDrinks}
        className="w-full bg-purple-600 text-white py-3 rounded-lg mb-6"
      >
        Generate Drinks
      </button>

      {/* Drink Lists */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {[...generated, ...recommended].map((drink, i) => (
          <div
            key={i}
            onClick={() => openCustomizer(drink)}
            className="p-3 border rounded-lg cursor-pointer hover:bg-gray-100"
          >
            <p className="font-medium">{drink.size.label}</p>
            <p className="text-sm text-gray-500">
              {Object.entries(drink.flavors)
                .map(([f, c]) => `${f} x${c}`)
                .join(", ")}
            </p>
          </div>
        ))}
      </div>

      {/* ✅ MODAL */}
      {isModalOpen && draftDrink && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div
            ref={modalRef}
            className="bg-white w-[90%] max-w-md p-4 rounded-xl max-h-[80vh] overflow-y-auto"
          >
            <h2 className="font-semibold mb-4">Customize Drink</h2>

            {/* Size */}
            <div className="flex gap-2 mb-4">
              {sizes.map((size) => (
                <button
                  key={size.label}
                  onClick={() =>
                    setDraftDrink((prev) => ({ ...prev, size }))
                  }
                  className={`px-2 py-1 border rounded ${
                    draftDrink.size.label === size.label
                      ? "bg-purple-600 text-white"
                      : ""
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>

            {/* Flavors */}
            {flavorsList.map((flavor) => (
              <div key={flavor} className="flex justify-between mb-2">
                <span>{flavor}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFlavor(flavor, -1)}
                    className="px-2 bg-gray-200 rounded"
                  >
                    -
                  </button>
                  <span>{draftDrink.flavors[flavor] || 0}</span>
                  <button
                    onClick={() => updateFlavor(flavor, 1)}
                    className="px-2 bg-gray-200 rounded"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            {/* Toppings */}
            <div className="mt-4">
              {toppingsList.map((t) => (
                <label key={t.name} className="flex gap-2 mb-1">
                  <input
                    type="checkbox"
                    checked={draftDrink.toppings.includes(t)}
                    onChange={() => toggleTopping(t)}
                  />
                  {t.name}
                </label>
              ))}
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Click outside to save
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-18 left-0 w-full bg-white border-t p-4">
        <div className="flex justify-between">
          <span>Total</span>
          <span className="text-purple-600 font-bold">
            ${calculatePrice()}
          </span>
        </div>
      </div>
    </div>
  );
};