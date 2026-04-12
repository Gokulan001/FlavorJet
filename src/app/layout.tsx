import type { Metadata } from "next";
import { Poppins, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ToastProvider from "@/components/ui/ToastProvider";
import ThemeProvider from "@/components/ThemeProvider";
import { verifyAuth } from "@/lib/auth";
import { getCartCountForUser } from "@/lib/cart-utils";
import AIFloatingButton from "@/components/chat/AIFloatingButton";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "FlavorJet",
  description: "FlavorJet - Premium Dining Experience. Order delicious food online.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await verifyAuth();
  const cartCount = user ? getCartCountForUser(Number(user.id)) : 0;

  const userData = user
    ? { username: user.username, profilePicture: user.profilePicture }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${poppins.variable} ${spaceGrotesk.variable} antialiased bg-white dark:bg-[#0b1120] text-[#1a2428] dark:text-slate-200`}>
        <ThemeProvider>
          <ToastProvider>
            <Navbar user={userData} cartCount={cartCount} />
            <main className="min-h-screen pt-20">{children}</main>
            <Footer />
            <AIFloatingButton />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
