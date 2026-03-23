import React from "react";
import { Home, ShoppingCart, Plus, Sparkles} from "lucide-react";

const BottomNav = ({ current, setCurrent }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t flex justify-around py-2 shadow-md">
      
      {/* Home */}
      <NavItem
        icon={<Home size={22} />}
        label="Home"
        active={current === "home"}
        onClick={() => setCurrent("home")}
      />

      {/* Cart */}
      <NavItem
        icon={<ShoppingCart size={22} />}
        label="Cart"
        active={current === "cart"}
        onClick={() => setCurrent("cart")}
      />

      <NavItem
        icon={<Plus size={22} />}
        label="Customize"
        active={current === "Customize"}
        onClick={() => setCurrent("Customize")}
      />

      <NavItem
        icon={<Sparkles size={22} />}
        label="AI Picks"
        active={current === "AIPicks"}
        onClick={() => setCurrent("AIPicks")}
      />
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center text-xs transition ${
        active ? "text-purple-600" : "text-gray-500"
      }`}
    >
      <div
        className={`p-2 rounded-lg ${
          active ? "bg-purple-100" : ""
        }`}
      >
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
};

export default BottomNav;