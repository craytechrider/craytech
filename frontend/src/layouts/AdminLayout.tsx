import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F8FC]">
      {/* ============================================================
          SIDEBAR
      ============================================================ */}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ============================================================
          MAIN APPLICATION AREA
      ============================================================ */}

      <div className="min-h-screen">
        {/* ==========================================================
            TOPBAR

            Mobile:
            - fixed full width
            - burger opens sidebar

            Desktop:
            - starts after 256px sidebar
        ========================================================== */}

        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* ==========================================================
            PAGE CONTENT

            pt-16:
            Prevents content from going underneath the fixed Topbar.

            lg:pl-64:
            Reserves space for the desktop sidebar.
        ========================================================== */}

        <main
          className="
            min-h-screen
            min-w-0
            w-full
            pt-16
            lg:pl-64
          "
        >
          <div className="min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
