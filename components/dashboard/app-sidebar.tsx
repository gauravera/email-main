"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Building2,
  Shield,
  Inbox,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Inbox",
    href: "/inbox",
    icon: Inbox,
  },
  {
    label: "History",
    href: "/history",
    icon: History,
  },
  {
    label: "Brand Profiles",
    href: "/brands",
    icon: Building2,
  },
];

interface AppSidebarProps {
  isMobile?: boolean;
  onOpenChange?: (open: boolean) => void;
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function AppSidebar({ isMobile, onOpenChange, isCollapsed: collapsed, onCollapse }: AppSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <div
      className={`relative flex flex-col bg-card border-r border-border h-screen sticky top-0 shrink-0 overflow-visible z-40 ${collapsed && !isMobile ? "shadow-none" : "shadow-xl shadow-primary/5"} ${isMobile ? "w-full" : "w-full"}`}
    >
      {/* Desktop Toggle Handle (Floating) */}
      {!isMobile && (
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="absolute -right-3 top-12 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-all hover:scale-110 active:scale-95"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {/* Logo & Toggle Header */}
      <div className={`flex items-center px-4 py-5 border-b border-border ${collapsed && !isMobile ? "justify-center" : "justify-between"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" onClick={() => isMobile && onOpenChange?.(false)} className="shrink-0">
            <motion.div
              animate={{ scale: collapsed && !isMobile ? 0.8 : 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <Image
                  src="/logo.jpg"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain rounded-xl shadow-md border border-border/50 bg-white"
                  priority
                />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-success rounded-full border-2 border-card" />
              </div>
            </motion.div>
          </Link>
          <AnimatePresence>
            {(!collapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex flex-col justify-center"
              >
                <p className="text-sm font-bold text-foreground tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight whitespace-nowrap">
                  Mail by GPSERP
                </p>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-success animate-pulse shrink-0" />
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap uppercase tracking-wider font-bold opacity-70">AI Outreach</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isMobile && (
          <button
            onClick={() => onOpenChange?.(false)}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all hover:scale-110 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {(session?.user?.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL)
          ? [...NAV_ITEMS, { label: "Admin Console", href: "/admin", icon: Shield }] 
          : NAV_ITEMS
        ).map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} onClick={() => isMobile && onOpenChange?.(false)}>
              <motion.div
                whileHover={{ x: (collapsed && !isMobile) ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex items-center transition-all cursor-pointer group ${isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  } ${collapsed && !isMobile ? "justify-center w-12 h-12 mx-auto rounded-xl" : "gap-3 px-4 py-3 rounded-2xl"}`}
                title={collapsed && !isMobile ? label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? "scale-110" : "group-hover:scale-110"}`} strokeWidth={isActive ? 2.5 : 2} />
                <AnimatePresence>
                  {(!collapsed || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, width: "auto", marginLeft: 4 }}
                      exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-semibold overflow-hidden whitespace-nowrap origin-left"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !collapsed && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-sm"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-6 border-t border-border space-y-4">
        <div className={`flex items-center ${(collapsed && !isMobile) ? "justify-center" : "justify-between px-2"}`}>
          {(!collapsed || isMobile) && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Theme</span>
          )}
          <div className="scale-90 origin-right">
            <ThemeToggle />
          </div>
        </div>

        {session && (
          <div
            className={`flex items-center gap-3 rounded-2xl p-2 transition-all hover:bg-muted/50 ${collapsed && !isMobile ? "justify-center w-12 h-12 mx-auto" : ""
              }`}
          >
            <div className="relative shrink-0">
              <img
                src={
                  session.user?.image ||
                  "https://api.dicebear.com/7.x/avataaars/svg?seed=" + session.user?.email
                }
                alt="avatar"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl border-2 border-border shadow-sm"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-card" />
            </div>
            <AnimatePresence>
              {(!collapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-hidden min-w-0 flex flex-col justify-center pl-1"
                >
                  <p className="text-sm font-bold text-foreground truncate leading-tight">
                    {session.user?.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate leading-none mt-1 opacity-70">
                    {session.user?.email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {(!collapsed || isMobile) && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all active:scale-90 shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
