"use client";
import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ArrowLeft, ShieldCheck, Lock } from "lucide-react";

// The form component that lives inside Elements
const CheckoutForm = ({ setCurrentScreen, setCart }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // Current URL for fallbacks
      },
      redirect: "if_required", // Prevent full-page reload for SPA
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Success!
      setCart([]);
      setCurrentScreen("success");
    } else {
      setErrorMessage("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
          {errorMessage}
        </div>
      )}
      <button
        disabled={!stripe || loading}
        className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-900 transition active:scale-95 disabled:bg-gray-400"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing Payment...
          </>
        ) : (
          "Pay Now"
        )}
      </button>
      
      <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
        <Lock size={12} />
        <span>Secure encrypted payment via Stripe</span>
      </div>
    </form>
  );
};

export default function Checkout({ selectedOrder, setCurrentScreen, setCart }) {
  if (!selectedOrder || !selectedOrder.clientSecret || !selectedOrder.publishableKey) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center h-screen">
        <p className="text-gray-500 mb-4">No order selected or session expired.</p>
        <button 
          onClick={() => setCurrentScreen('home')}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  const stripePromise = loadStripe(selectedOrder.publishableKey);

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#9333ea', // purple-600
    },
  };

  const options = {
    clientSecret: selectedOrder.clientSecret,
    appearance,
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white p-4 flex items-center shadow-sm sticky top-0 z-10">
        <button 
          onClick={() => setCurrentScreen('cart')}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg mr-8">Checkout</h1>
      </div>

      <div className="max-w-md mx-auto p-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b">
            <div className="bg-green-100 p-2 rounded-full text-green-600">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Secure Payment</h2>
              <p className="text-xs text-gray-500">Your card info never touches our servers.</p>
            </div>
          </div>

          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm 
              setCurrentScreen={setCurrentScreen} 
              setCart={setCart} 
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}