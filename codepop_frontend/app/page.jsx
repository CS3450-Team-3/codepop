"use client";
import React, { useState, useRef, useEffect } from 'react';
import Home from '../components/home';
import Cart from '../components/cart';
import CustomDrink from '../components/customdrink';
import Sidebar from '../components/sidebar';
import AIDrink from '../components/aidrink';
import BottomNav from '../components/bottomNav';
import Checkout from '../components/checkout';
import Success from '../components/success';
import CreateProfile from '../components/side_nav/createprofile';
import MyOrders from '../components/side_nav/myorders';
import Locations from '../components/side_nav/locations';
import Share from '../components/side_nav/share';
import HelpAndSupport from '../components/side_nav/helpsupport';
import Settings from '../components/side_nav/settings';
import { Menu } from "lucide-react";

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function StoreSelector({ onSelect }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/servers')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((data) => { setServers(data); setLoading(false); });
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-screen text-center gap-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome to CodePop!</h1>
        <p className="text-lg text-gray-600">
          Customize your soda with unique flavors and toppings, or generate a drink with AI.
        </p>
      </div>
      {loading ? (
        <p className="text-gray-400">Loading stores…</p>
      ) : servers.length === 0 ? (
        <p className="text-red-500">No stores available. Please try again later.</p>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Select a store</p>
          {servers.map((server) => (
            <button
              key={server.ServerID}
              onClick={() => onSelect(server.StoreName)}
              className="block border rounded-lg px-6 py-4 hover:bg-gray-50 transition-colors text-left w-full"
            >
              <div className="font-semibold">{server.StoreName}</div>
              {server.Region !== null && (
                <div className="text-sm text-gray-500">Region {server.Region}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const App = () => {
  const [storeId, setStoreId] = useState(null);
  const [storeChecked, setStoreChecked] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const sidebarRef = useRef();

  useEffect(() => {
    const cookie = getCookie('storeId');
    if (cookie) setStoreId(cookie);
    setStoreChecked(true);
  }, []);

  const handleSelectStore = (id) => {
    document.cookie = `storeId=${encodeURIComponent(id)}; path=/`;
    setStoreId(id);
  };

  const addToCart = (item) => {
    setCart((prevCart) => [...prevCart, { ...item, id: Date.now() }]);
    setCurrentScreen('cart');
  };

  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!storeChecked) return null;
  if (!storeId) return <StoreSelector onSelect={handleSelectStore} />;

  return (
    <div>
      {/* Hamburger Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 bg-white shadow-md p-2 rounded-lg hover:bg-gray-100"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40"></div>
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar current={currentScreen} setCurrent={setCurrentScreen} />
      </div>
      <div>
        <BottomNav current={currentScreen} setCurrent={setCurrentScreen} cartCount={cart.length} />
      </div>
      {currentScreen === 'home' ? (
        <Home setCurrentScreen={setCurrentScreen} setSelectedDrink={setSelectedDrink} />
      ) : currentScreen === 'cart' ? (
        <Cart
          cart={cart}
          removeFromCart={removeFromCart}
          updateQuantity={updateQuantity}
          setCurrentScreen={setCurrentScreen}
          setSelectedOrder={setSelectedOrder}
        />
      ) : currentScreen === 'checkout' ? (
        <Checkout
          selectedOrder={selectedOrder}
          setCurrentScreen={setCurrentScreen}
          setCart={setCart}
        />
      ) : currentScreen === 'success' ? (
        <Success setCurrentScreen={setCurrentScreen} />
      ) : currentScreen === 'Customize' ? (
        <CustomDrink
          addToCart={addToCart}
          selectedDrink={selectedDrink}
          setSelectedDrink={setSelectedDrink}
        />
      ) : currentScreen === 'AIPicks' ? (
        <AIDrink />
      ) : currentScreen === 'Create Profile' ? (
        <CreateProfile />
      ) : currentScreen === 'My Orders' ? (
        <MyOrders />
      ) : currentScreen === 'Locations' ? (
        <Locations />
      ) : currentScreen === 'Share with Friends' ? (
        <Share />
      ) : currentScreen === 'Settings' ? (
        <Settings />
      ) : currentScreen === 'Help & Support' ? (
        <HelpAndSupport />
      ) : null}
    </div>
  );
};

export default App;
