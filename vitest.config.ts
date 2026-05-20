import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/e2e/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        // Section 1 — login/signup
        "src/lib/hash.ts",
        "src/lib/security/rateLimit.ts",
        "src/lib/cloudinary.ts",
        "src/lib/auth.ts",
        "src/actions/auth-actions.ts",
        "src/app/(auth)/login/page.tsx",
        // Section 2 — homepage
        "src/components/home/AnimatedCounter.tsx",
        "src/components/home/PopularMenuTabs.tsx",
        "src/components/home/HeroBanner.tsx",
        "src/components/home/CategoriesSection.tsx",
        "src/components/home/PopularMenuSection.tsx",
        "src/app/page.tsx",
        // Section 3 — layout / shared
        "src/lib/cart-utils.ts",
        "src/components/ThemeProvider.tsx",
        "src/components/ui/ToastProvider.tsx",
        "src/components/layout/Navbar.tsx",
        "src/components/chat/AIFloatingButton.tsx",
        // Section 4 — menu
        "src/lib/search.ts",
        "src/components/menu/SearchBar.tsx",
        "src/components/menu/QuickAddButton.tsx",
        "src/components/menu/AddToCartButton.tsx",
        "src/components/menu/ModifierSelector.tsx",
        "src/actions/cart-actions.ts",
        "src/app/menu/page.tsx",
        "src/app/menu/[categorySlug]/page.tsx",
        "src/app/menu/[categorySlug]/[itemSlug]/page.tsx",
        "src/app/menu/search/page.tsx",
        // Section 5 — cart
        "src/lib/recommendations.ts",
        "src/components/cart/CartItemCard.tsx",
        "src/components/cart/CartRecommendations.tsx",
        "src/app/cart/page.tsx",
        // Section 6 — checkout
        "src/components/checkout/TipSelector.tsx",
        "src/components/checkout/AddressForm.tsx",
        "src/components/checkout/CheckoutForm.tsx",
        "src/components/cart/PlaceOrderButton.tsx",
        "src/app/checkout/page.tsx",
        // Section 7 — profile
        "src/components/profile/ProfileAddressForm.tsx",
        "src/app/profile/page.tsx",
        // Section 8 — orders
        "src/components/orders/ReorderButton.tsx",
        "src/components/orders/OrderTimeline.tsx",
        "src/app/orders/page.tsx",
        "src/app/orders/[orderId]/page.tsx",
        // Section 9 — AI page (tight scope: voice/RAG/route handlers out of scope)
        "src/components/chat/SuggestionChips.tsx",
        "src/components/chat/TokenBadge.tsx",
        "src/components/chat/ChatInput.tsx",
        "src/components/chat/ChatMessages.tsx",
        "src/components/chat/MessageBubble.tsx",
        "src/components/chat/CartSidebar.tsx",
        "src/components/chat/MenuItemCard.tsx",
        "src/components/chat/ModifierPicker.tsx",
        "src/components/chat/CheckoutModal.tsx",
        "src/components/chat/AIPageHeader.tsx",
        "src/app/order-ai/page.tsx",
        // Section 10 — remaining production-critical files
        "src/lib/utils.ts",
        "src/lib/security/sanitize.ts",
        "src/lib/utils/withRetry.ts",
        "src/components/chat/types.ts",
        "src/components/chat/CartItemEditModal.tsx",
        "src/components/search/SearchFilters.tsx",
        "src/components/chat/ChatHeader.tsx",
      ],
      exclude: ["**/*.test.*", "src/test/**"],
    },
    server: {
      deps: {
        inline: ["next"],
      },
    },
  },
});
