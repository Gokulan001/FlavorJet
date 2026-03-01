"use client";

import { useState, useTransition } from "react";
import { MapPin, Navigation, Loader2, Save, CheckCircle } from "lucide-react";
import { saveUserAddress } from "@/actions/cart-actions";

interface ProfileAddressFormProps {
  initialAddress: {
    street: string | null;
    apartment: string | null;
    city: string | null;
    zipCode: string | null;
    phone: string | null;
  };
}

export default function ProfileAddressForm({ initialAddress }: ProfileAddressFormProps) {
  const [street, setStreet] = useState(initialAddress.street ?? "");
  const [apartment, setApartment] = useState(initialAddress.apartment ?? "");
  const [city, setCity] = useState(initialAddress.city ?? "");
  const [zipCode, setZipCode] = useState(initialAddress.zipCode ?? "");
  const [phone, setPhone] = useState(initialAddress.phone ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      await saveUserAddress({ street, apartment, city, zipCode, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data.address) {
            const addr = data.address;
            setStreet([addr.road, addr.house_number].filter(Boolean).join(" ") || "");
            setCity(addr.city || addr.town || addr.village || "");
            setZipCode(addr.postcode || "");
          }
        } catch { /* ignore */ }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#fea116]" />
          <h3 className="font-bold text-[#0f172b] dark:text-white">Delivery Address</h3>
        </div>
        <button
          type="button"
          onClick={detectLocation}
          disabled={locating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#fea116] hover:bg-[#fea116]/10 rounded-lg transition-colors disabled:opacity-50"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          {locating ? "Detecting..." : "Use My Location"}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Street Address</label>
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="123 Main Street"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Apt / Suite</label>
          <input
            type="text"
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
            placeholder="Apt 4B"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="New York"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Zip Code</label>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="10001"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="flex items-center gap-2 px-6 py-2.5 bg-[#fea116] text-[#0f172b] rounded-xl font-semibold hover:bg-[#f3c156] transition-colors disabled:opacity-70"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {isPending ? "Saving..." : saved ? "Saved!" : "Save Address"}
      </button>
    </div>
  );
}
