"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";

interface AddressFormProps {
  initialAddress?: {
    street: string | null;
    apartment: string | null;
    city: string | null;
    zipCode: string | null;
    phone: string | null;
  } | null;
  onAddressChange: (address: { street: string; apartment: string; city: string; zipCode: string; phone: string }) => void;
}

export default function AddressForm({ initialAddress, onAddressChange }: AddressFormProps) {
  const [street, setStreet] = useState(initialAddress?.street ?? "");
  const [apartment, setApartment] = useState(initialAddress?.apartment ?? "");
  const [city, setCity] = useState(initialAddress?.city ?? "");
  const [zipCode, setZipCode] = useState(initialAddress?.zipCode ?? "");
  const [phone, setPhone] = useState(initialAddress?.phone ?? "");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    onAddressChange({ street, apartment, city, zipCode, phone });
  }, [street, apartment, city, zipCode, phone]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    setLocationError("");

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
            setStreet([addr.road, addr.house_number].filter(Boolean).join(" ") || addr.display_name?.split(",")[0] || "");
            setCity(addr.city || addr.town || addr.village || addr.county || "");
            setZipCode(addr.postcode || "");
          }
        } catch {
          setLocationError("Could not determine address from location");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location access denied. Please enter your address manually.");
        } else {
          setLocationError("Could not detect location. Please enter manually.");
        }
      },
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
          {locating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          {locating ? "Detecting..." : "Use My Location"}
        </button>
      </div>

      {locationError && (
        <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{locationError}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Street Address</label>
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="123 Main Street"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Apt / Suite / Floor</label>
          <input
            type="text"
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
            placeholder="Apt 4B"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="New York"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Zip Code</label>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="10001"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
          />
        </div>
      </div>
    </div>
  );
}
