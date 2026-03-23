import React, { useState } from "react";

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
  { name: "Extra Ice", price: 0.2 },
  { name: "Lime Slice", price: 0.3 },
];

export default function CustomDrink({ addToCart }) {
  const [selectedSize, setSelectedSize] = useState(sizes[0]);
  const [flavors, setFlavors] = useState({});
  const [toppings, setToppings] = useState([]);
  const [quantity, setQuantity] = useState(1);

  // Handle flavor shots
  const updateFlavor = (flavor, amount) => {
    setFlavors((prev) => ({
      ...prev,
      [flavor]: Math.max(0, (prev[flavor] || 0) + amount),
    }));
  };

  // Toggle toppings
  const toggleTopping = (topping) => {
    setToppings((prev) =>
      prev.includes(topping)
        ? prev.filter((t) => t !== topping)
        : [...prev, topping]
    );
  };

  // Price calculation
  const calculatePrice = () => {
    let price = selectedSize.price;

    // flavors ($0.3 per shot)
    Object.values(flavors).forEach((count) => {
      price += count * 0.3;
    });

    // toppings
    toppings.forEach((t) => {
      price += t.price;
    });

    return (price * quantity).toFixed(2);
  };

  const handleAddToCart = () => {
    const item = {
      size: selectedSize.label,
      flavors,
      toppings,
      quantity,
      total: calculatePrice(),
    };

    if (addToCart) addToCart(item);
    console.log("Added to cart:", item);
  };

  return (
    <div className="p-4 max-w-xl mx-auto pb-24">
      <h1 className="text-xl font-semibold mb-4">Build Your Drink</h1>

      {/* Size */}
      <div className="mb-6">
        <h2 className="font-medium mb-2">Size</h2>
        <div className="flex gap-2">
          {sizes.map((size) => (
            <button
              key={size.label}
              onClick={() => setSelectedSize(size)}
              className={`px-3 py-2 rounded-lg border ${
                selectedSize.label === size.label
                  ? "bg-purple-600 text-white"
                  : "bg-white"
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flavors */}
      <div className="mb-6">
        <h2 className="font-medium mb-2">Flavors (shots)</h2>
        <div className="space-y-3">
          {flavorsList.map((flavor) => (
            <div key={flavor} className="flex justify-between items-center">
              <span>{flavor}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateFlavor(flavor, -1)}
                  className="px-2 bg-gray-200 rounded"
                >
                  -
                </button>
                <span>{flavors[flavor] || 0}</span>
                <button
                  onClick={() => updateFlavor(flavor, 1)}
                  className="px-2 bg-gray-200 rounded"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toppings */}
      <div className="mb-6">
        <h2 className="font-medium mb-2">Toppings</h2>
        <div className="space-y-2">
          {toppingsList.map((topping) => (
            <label key={topping.name} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={toppings.includes(topping)}
                onChange={() => toggleTopping(topping)}
              />
              {topping.name} (+${topping.price})
            </label>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div className="mb-6">
        <h2 className="font-medium mb-2">Quantity</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            -
          </button>
          <span>{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            +
          </button>
        </div>
      </div>

      {/* Total + Add */}
      <div className="fixed bottom-18 left-0 w-full bg-white border-t p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Total</span>
          <span className="text-purple-600 font-bold">
            ${calculatePrice()}
          </span>
        </div>

        <button
          onClick={handleAddToCart}
          className="w-full bg-black text-white py-3 rounded-lg"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};