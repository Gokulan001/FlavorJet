"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { ShoppingCart, Menu, X, LogOut, User, Loader2, Sun, Moon, Search, Bot } from "lucide-react";
import { logout } from "@/actions/auth-actions";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import LogoText from "./LogoText";

interface NavbarProps {
  user: { username: string; profilePicture: string | null } | null;
  cartCount: number;
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/cart", label: "Cart" },
  { href: "/orders", label: "Orders" },
];

export default function Navbar({ user, cartCount }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  const isOverlayPage = pathname === "/" || pathname === "/order-ai";
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  // /order-ai: window never scrolls (messages scroll internally), force pill always
  const forcePill = pathname === "/order-ai";
  // On non-overlay pages, always show pill style
  const showPill = forcePill || !isOverlayPage || scrolled;

  const handleLogout = () => {
    startLogout(async () => {
      await logout();
    });
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <motion.nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-colors duration-500",
          showPill ? "top-4 pointer-events-none" : ""
        )}
      >
        <motion.div
          layout
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className={cn(
            "mx-auto pointer-events-auto transition-all duration-500",
            showPill
              ? "max-w-3xl bg-[#0f172b]/80 backdrop-blur-xl rounded-full shadow-lg shadow-black/20 border border-white/10 px-4 sm:px-6 py-2"
              : "max-w-7xl px-4 sm:px-6 lg:px-8 py-4"
          )}
        >
          <div className="flex items-center justify-between h-10">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <LogoText showPill={showPill} size={showPill ? "sm" : "md"} />
            </Link>

            {/* Desktop Nav — centered links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                    pathname === link.href
                      ? showPill
                        ? "text-[#fea116] bg-[#fea116]/10"
                        : "text-[#fea116]"
                      : showPill
                        ? "text-gray-300 hover:text-white hover:bg-white/10"
                        : "text-gray-300 hover:text-white"
                  )}
                >
                  {link.label}
                  {link.href === "/cart" && cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#fea116] text-[#0f172b] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {cartCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Desktop Right Actions */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <Link
                href="/menu/search"
                className={cn(
                  "p-2 rounded-full transition-colors",
                  showPill
                    ? "text-gray-400 hover:text-white hover:bg-white/10"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                )}
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </Link>
              <Link
                href="/order-ai"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ai-nav-pulse",
                  pathname === "/order-ai"
                    ? "text-[#fea116] bg-[#fea116]/15"
                    : showPill
                    ? "text-[#fea116]/80 hover:text-[#fea116] hover:bg-[#fea116]/10 border border-[#fea116]/20"
                    : "text-[#fea116]/80 hover:text-[#fea116] border border-[#fea116]/20"
                )}
                aria-label="AI Assistant"
              >
                <Bot className="w-4 h-4" />
                <span>AI</span>
              </Link>
              <button
                onClick={toggleTheme}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  showPill
                    ? "text-gray-400 hover:text-white hover:bg-white/10"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                )}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {user ? (
                <div className="flex items-center gap-2">
                  <Link href="/profile" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    {user.profilePicture ? (
                      <Image
                        src={user.profilePicture}
                        alt="Profile"
                        width={28}
                        height={28}
                        className="rounded-full object-cover w-7 h-7 border-2 border-[#fea116]"
                      />
                    ) : (
                      <User className="w-4 h-4 text-[#fea116]" />
                    )}
                  </Link>
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      showPill
                        ? "text-red-400 hover:bg-red-500/20"
                        : "text-red-300 hover:bg-red-500/20"
                    )}
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-1.5 bg-[#fea116] text-[#0f172b] rounded-full font-semibold text-sm hover:bg-[#f3c156] transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className={cn(
                "md:hidden p-2 rounded-full transition-colors",
                showPill
                  ? "text-gray-300 hover:bg-white/10"
                  : "text-white hover:bg-white/10"
              )}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>

        {/* Mobile Nav — dropdown below pill */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mx-4 mt-2 pointer-events-auto bg-[#0f172b]/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      pathname === link.href
                        ? "bg-[#fea116]/10 text-[#fea116]"
                        : "text-gray-300 hover:bg-white/10"
                    )}
                  >
                    {link.label}
                    {link.href === "/cart" && cartCount > 0 && (
                      <span className="ml-2 bg-[#fea116] text-[#0f172b] text-xs font-bold rounded-full px-2 py-0.5">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                ))}
                <Link
                  href="/menu/search"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Search
                </Link>
                <Link
                  href="/order-ai"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ai-nav-pulse",
                    pathname === "/order-ai"
                      ? "bg-[#fea116]/10 text-[#fea116]"
                      : "text-[#fea116]/80 hover:bg-[#fea116]/10"
                  )}
                >
                  <Bot className="w-4 h-4" />
                  AI Assistant
                </Link>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                <div className="pt-2 mt-2 border-t border-white/10">
                  {user ? (
                    <div className="space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 rounded-xl"
                      >
                        My Profile
                      </Link>
                      <button
                        onClick={() => { setShowLogoutModal(true); setMobileOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                      >
                        Sign Out ({user.username})
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-2.5 bg-[#fea116] text-[#0f172b] rounded-xl font-semibold text-sm text-center"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Logout Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Sign Out</h3>
              <p className="text-gray-600 dark:text-slate-300 mb-6">Are you sure you want to sign out?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Signing out...
                    </>
                  ) : (
                    "Yes, Sign Out"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
