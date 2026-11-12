import React from "react";
import { Outlet } from "react-router-dom";

import Topbar from "../components/Topbar";
import CustomerSidebar from "../components/CustomerSidebar";
import { useCart } from "../context/CartContext";

const CustomerLayout: React.FC = () => {
  const { cart } = useCart();

  const cartCount = (cart || []).length;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F7F9FC]">
      {/* Shared top navigation */}
      <Topbar />

      {/* Shared customer sidebar */}
      <CustomerSidebar cartCount={cartCount} />

      {/* Page content */}
      <main
        className="
          min-h-screen
          min-w-0
          w-full
          pt-[72px]
          transition-all
          duration-300
          lg:ml-64
          lg:w-[calc(100%-16rem)]
        "
      >
        <div
          className="
            mx-auto
            min-h-[calc(100vh-72px)]
            w-full
            max-w-[1600px]
            px-4
            py-5
            sm:px-6
            sm:py-7
            lg:px-8
            lg:py-8
            xl:px-10
            2xl:px-12
          "
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CustomerLayout;
