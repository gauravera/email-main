"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { useSession } from "next-auth/react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Don't render sidebar if not signed in
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <motion.div 
        className="hidden lg:flex"
        animate={{ width: isSidebarCollapsed ? 80 : 260 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <AppSidebar isCollapsed={isSidebarCollapsed} onCollapse={setIsSidebarCollapsed} />
      </motion.div>
      
      {/* Mobile/Tablet Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-50 lg:hidden"
            >
              <AppSidebar isMobile onOpenChange={setIsSidebarOpen} isCollapsed={false} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Mobile Top Nav / Header */}
      <div className="lg:hidden">
        <MobileNav onMenuClick={() => setIsSidebarOpen(true)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out">
        {children}
      </div>
      
      {/* Mobile Bottom Nav Spacer */}
      <div className="h-20 lg:hidden pointer-events-none" />
    </div>
  );
}
