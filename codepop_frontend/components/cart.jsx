"use client";
import React, { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';

export default function Cart({ cart, removeFromCart, updateQuantity, setCurrentScreen, setSelectedOrder }) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + parseFloat(item.total), 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    try {
      const drinkIds = [];

      // Phase 1: Create Drink resources for each item in cart
      for (const item of cart) {
        // Create as many drinks as the quantity specifies
        for (let i = 0; i < item.quantity; i++) {
          const drinkData = {
            Name: item.name,
            SodaUsed: item.sodaUsed,
            SyrupsUsed: item.syrupsUsed,
            AddIns: item.addIns,
            Price: parseFloat(item.pricePerUnit),
            User_Created: true,
            Size: item.size.includes("16") ? "16oz" : item.size.includes("24") ? "24oz" : "32oz",
            Ice: "regular",
          };

          const response = await fetch('/backend/drinks/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(drinkData),
          });

          let responseData;
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            responseData = await response.json();
          } else {
            const text = await response.text();
            console.error('Non-JSON response received:', text);
            throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
          }

          if (!response.ok) {
            console.error('Drink creation failed:', responseData);
            throw new Error(`Failed to create drink: ${item.name}. ${responseData.error || responseData.details || ''}`);
          }

          const createdDrink = responseData;
          drinkIds.push(createdDrink.DrinkID);
        }
      }

      // Phase 2: Create the Order with all DrinkIDs
      const orderData = {
        Drinks: drinkIds,
        OrderStatus: 'Pending',
        PaymentStatus: 'Pending',
        // UserID can be handled by backend if authenticated, or passed if known
      };

      const orderResponse = await fetch('/backend/orders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      let createdOrder;
      const orderContentType = orderResponse.headers.get("content-type");
      if (orderContentType && orderContentType.indexOf("application/json") !== -1) {
        createdOrder = await orderResponse.json();
      } else {
        const text = await orderResponse.text();
        console.error('Non-JSON response for order:', text);
        throw new Error('Server returned non-JSON response for order');
      }

      if (!orderResponse.ok) {
        throw new Error(`Failed to create order: ${createdOrder.error || ''}`);
      }
      
      // Phase 3: Create Payment Intent
      const piResponse = await fetch('/backend/create-payment-intent/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: createdOrder.OrderID }),
      });

      let piData;
      const piContentType = piResponse.headers.get("content-type");
      if (piContentType && piContentType.indexOf("application/json") !== -1) {
        piData = await piResponse.json();
      } else {
        const text = await piResponse.text();
        console.error('Non-JSON response for payment intent:', text);
        throw new Error('Server returned non-JSON response for payment intent');
      }

      if (!piResponse.ok) {
        throw new Error(`Failed to create payment intent: ${piData.error || ''}`);
      }
      
      if (setSelectedOrder) {
        setSelectedOrder({
          orderId: createdOrder.OrderID,
          clientSecret: piData.paymentIntent,
          publishableKey: piData.publishableKey,
        });
      }

      setCurrentScreen('checkout');

    } catch (error) {
      console.error('Checkout error:', error);
      alert(`Checkout failed: ${error.message}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
        <div className="bg-gray-100 p-6 rounded-full mb-4">
          <ShoppingBag size={48} className="text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Add some delicious drinks to your cart and they will show up here!</p>
        <button 
          onClick={() => setCurrentScreen('home')}
          className="bg-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
        >
          Go to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-40">
      <div className="p-4 bg-white shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-center">Your Cart</h1>
      </div>

      <div className="p-4 space-y-4">
        {cart.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm flex gap-4">
            <div className="w-20 h-20 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 font-bold">
              {item.name.charAt(0)}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{item.name}</h3>
                  <p className="text-xs text-gray-500">{item.size}</p>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="text-gray-400 hover:text-red-500 transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Customizations summary */}
              <div className="mt-1 flex flex-wrap gap-1">
                {item.sodaUsed.map(s => (
                  <span key={s} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
                ))}
                {item.syrupsUsed.length > 0 && (
                  <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                    {item.syrupsUsed.length} Shots
                  </span>
                )}
                {item.addIns.map(a => (
                  <span key={a} className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </div>

              <div className="mt-3 flex justify-between items-center">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 hover:bg-white rounded-md transition shadow-sm disabled:opacity-50"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="mx-3 text-sm font-semibold">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 hover:bg-white rounded-md transition shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="font-bold text-purple-600">${item.total}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary and Checkout */}
      <div className="fixed bottom-16 left-0 w-full bg-white border-t rounded-t-3xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)] p-6 z-20">
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-sm">
            <span>Tax (8%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t">
            <span>Total</span>
            <span className="text-purple-600">${total.toFixed(2)}</span>
          </div>
        </div>

        <button 
          onClick={handleCheckout}
          disabled={isCheckingOut}
          className={`w-full py-4 rounded-2xl font-bold text-white transition flex items-center justify-center gap-2 ${
            isCheckingOut ? 'bg-gray-400' : 'bg-black hover:bg-gray-900 active:scale-95'
          }`}
        >
          {isCheckingOut ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            'Checkout'
          )}
        </button>
      </div>
    </div>
  );
}