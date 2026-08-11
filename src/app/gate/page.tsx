import type { Metadata } from "next";
import { Suspense } from "react";
import AccessGateForm from "@/components/gate/AccessGateForm";

export const metadata: Metadata = {
  title: "Access Required | FlavorJet",
  description: "Enter your access code to use the FlavorJet AI assistant.",
};

export default function GatePage() {
  return (
    <Suspense>
      <AccessGateForm />
    </Suspense>
  );
}
