import React from "react";
import { Home, ShoppingCart, Plus, Sparkles} from "lucide-react";

const BottomNav = ({ current, setCurrent, cartCount }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t flex justify-around py-2 shadow-md z-30">
      
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
        badge={cartCount}
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

const NavItem = ({ icon, label, active, onClick, badge }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center text-xs transition relative ${
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
      {badge > 0 && (
        <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
          {badge}
        </span>
      )}
      <span>{label}</span>
    </button>
  );
};

export default BottomNav;