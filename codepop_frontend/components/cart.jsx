"use client";
import React from 'react';
import { useRouter } from 'next/navigation';

export default function Cart() {
  const router = useRouter();
  const handleCartClick = () => {
    router.push('/cart');
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to Cart</h1>
      <p className="text-lg">Please add items to your cart</p>
    </div>
  );
}