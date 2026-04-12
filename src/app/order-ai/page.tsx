import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyAuth } from "@/lib/auth";
import { getUserAddress } from "@/actions/cart-actions";
import AIAssistantPage from "@/components/chat/AIAssistantPage";
import ErrorBoundary from "@/components/error/ErrorBoundary";

export const metadata: Metadata = {
  title: "AI Assistant | FlavorJet",
  description: "Order food with FlavorJet's AI assistant — chat or voice.",
};

export default async function OrderAIPage() {
  const { user } = await verifyAuth();

  if (!user) {
    redirect("/login");
  }

  const address = await getUserAddress();
  const hasAddress = !!(address?.street && address?.city);
  const addressString = hasAddress
    ? `${address!.street}${address!.apartment ? `, ${address!.apartment}` : ""}, ${address!.city} ${address!.zipCode}`
    : null;

  const userData = {
    username: user.username,
    profilePicture: user.profilePicture,
    hasAddress,
    addressString,
  };

  return (
    <ErrorBoundary>
      <AIAssistantPage user={userData} />
    </ErrorBoundary>
  );
}
