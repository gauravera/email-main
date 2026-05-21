"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, History, Menu, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "History",
    href: "/history",
    icon: History,
  },
];

export function MobileNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain rounded-lg border border-border/50 bg-white"
              priority
            />
            <span className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Mail GPSERP
            </span>
          </Link>
        </div>
        <ThemeToggle />
      </header>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border px-6 py-3 flex items-center justify-around pb-safe lg:hidden">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} className="relative">
              <div className={`flex flex-col items-center gap-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-active"
                    className="absolute -top-1 w-8 h-1 bg-primary rounded-full"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
