"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, ShoppingCart, Menu, X, LogOut, User, Loader2, Sun, Moon, Search } from "lucide-react";
import { logout } from "@/actions/auth-actions";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

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

  const handleLogout = () => {
    startLogout(async () => {
      await logout();
    });
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#0f172b] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-9 h-9 bg-[#fea116] rounded-xl flex items-center justify-center shadow-md shadow-[#fea116]/20 group-hover:shadow-[#fea116]/40 transition-shadow">
                <Flame className="w-5 h-5 text-[#0f172b]" />
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-bold tracking-tight text-[#fea116]">Flavor</span>
                <span className="text-xl font-bold tracking-tight text-white">Jet</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors relative",
                    pathname === link.href
                      ? "text-[#fea116]"
                      : "text-gray-300 hover:text-white"
                  )}
                >
                  {link.label}
                  {link.href === "/cart" && cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#fea116] text-[#0f172b] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                  {pathname === link.href && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#fea116] rounded-full" />
                  )}
                </Link>
              ))}
            </div>

            {/* Auth */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/menu/search"
                className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </Link>
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {user ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {user.profilePicture ? (
                      <Image
                        src={user.profilePicture}
                        alt="Profile"
                        width={32}
                        height={32}
                        className="rounded-full object-cover w-8 h-8 border-2 border-[#fea116]"
                      />
                    ) : (
                      <User className="w-5 h-5 text-[#fea116]" />
                    )}
                    <span className="text-sm font-medium">{user.username}</span>
                  </Link>
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-[#fea116] text-[#0f172b] rounded-lg font-semibold text-sm hover:bg-[#f3c156] transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden bg-[#0f172b] border-t border-gray-700"
            >
              <div className="px-4 py-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      pathname === link.href
                        ? "bg-[#fea116]/20 text-[#fea116]"
                        : "text-gray-300 hover:bg-gray-800"
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Search
                </Link>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                <div className="pt-2 border-t border-gray-700">
                  {user ? (
                    <div className="space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg"
                      >
                        My Profile
                      </Link>
                      <button
                        onClick={() => { setShowLogoutModal(true); setMobileOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-lg"
                      >
                        Sign Out ({user.username})
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-2 bg-[#fea116] text-[#0f172b] rounded-lg font-semibold text-sm text-center"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

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
