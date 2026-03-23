import React from "react";
import {
  User,
  ShoppingBag,
  MapPin,
  Share2,
  HelpCircle,
  Settings,
  LogOut,
} from "lucide-react";

const Sidebar = ({current, setCurrent}) => {
  return (
    <div className="w-72 h-screen bg-white border-r flex flex-col justify-between p-4">
      
      {/* Top Section */}
      <div>
        {/* Profile */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
            C
          </div>
          <div>
            <p className="font-semibold">Codepop</p>
            <p className="text-sm text-gray-500">Guest User</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b mb-4"></div>

        {/* Menu */}
        <div className="space-y-3">
          <SidebarItem icon={<User size={18} />} label="Create Profile" current={current === "Create Profile"} onClick={() => setCurrent("Create Profile")} />
          {/* <SidebarItem icon={<ShoppingBag size={18} />} label="My Orders" current={current === "My Orders"} onClick={() => setCurrent("My Orders")} /> ADD BACK IN ONCE WE HAVE AUTH*/}
          <SidebarItem icon={<MapPin size={18} />} label="Locations" current={current === "Locations"} onClick={() => setCurrent("Locations")} />

          <div className="border-b my-3"></div>

          <SidebarItem icon={<Share2 size={18} />} label="Share with Friends" current={current === "Share with Friends"} onClick={() => setCurrent("Share with Friends")} />
          <SidebarItem icon={<HelpCircle size={18} />} label="Help & Support" current={current === "Help & Support"} onClick={() => setCurrent("Help & Support")} />
          <SidebarItem icon={<Settings size={18} />} label="Settings" current={current === "Settings"} onClick={() => setCurrent("Settings")} />

          <div className="border-b my-3"></div>

          {/* Sign Out */} {/* ADD LOGOUT BACK IN LATER */}
          {/* <button className="flex items-center gap-3 text-red-500 hover:bg-red-50 p-2 rounded-lg w-full">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button> */}
        </div>
      </div>

      {/* Bottom Promo */}
      <div className="bg-purple-100 rounded-xl p-4">
        <p className="font-semibold mb-1">Share & Save!</p>
        <p className="text-sm text-gray-600 mb-3">
          Post with <span className="text-purple-600 font-medium">#SocialDrinking</span> for 10% off
        </p>
        <button className="w-full bg-white border rounded-lg py-2 text-sm hover:bg-gray-50">
          Learn More
        </button>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon, label, onClick }) => {
  return (
    <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 text-gray-700" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default Sidebar;