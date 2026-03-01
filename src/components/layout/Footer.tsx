import Link from "next/link";
import { MapPin, Phone, Mail, Flame, Twitter, Facebook, Youtube, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0f172b] text-gray-300 pt-16 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-12">
          {/* Company */}
          <div>
            <h4 className="text-[#fea116] font-semibold text-lg mb-4 font-serif italic">Company</h4>
            <div className="flex flex-col gap-3">
              <Link href="/#about" className="hover:text-[#fea116] transition-colors text-sm">About Us</Link>
              <Link href="/menu" className="hover:text-[#fea116] transition-colors text-sm">Our Menu</Link>
              <Link href="/#popular" className="hover:text-[#fea116] transition-colors text-sm">Popular Items</Link>
              <Link href="/login" className="hover:text-[#fea116] transition-colors text-sm">Sign In</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[#fea116] font-semibold text-lg mb-4 font-serif italic">Contact</h4>
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-[#fea116] flex-shrink-0" />
                123 Street, New York, USA
              </p>
              <p className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-[#fea116] flex-shrink-0" />
                +012 345 67890
              </p>
              <p className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-[#fea116] flex-shrink-0" />
                info@flavorjet.com
              </p>
              <div className="flex gap-2 pt-2">
                {[Twitter, Facebook, Youtube, Linkedin].map((Icon, i) => (
                  <Link
                    key={i}
                    href="#"
                    className="w-9 h-9 border border-gray-600 rounded-full flex items-center justify-center hover:bg-[#fea116] hover:border-[#fea116] hover:text-[#0f172b] transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <h4 className="text-[#fea116] font-semibold text-lg mb-4 font-serif italic">Opening</h4>
            <div className="space-y-2">
              <h5 className="text-white font-medium text-sm">Monday - Saturday</h5>
              <p className="text-sm text-gray-400">09AM - 09PM</p>
              <h5 className="text-white font-medium text-sm pt-2">Sunday</h5>
              <p className="text-sm text-gray-400">10AM - 08PM</p>
            </div>
          </div>

          {/* Values */}
          <div>
            <h4 className="text-[#fea116] font-semibold text-lg mb-4 font-serif italic">Values</h4>
            <div className="flex flex-col gap-3">
              {["Social Impact", "Diversity", "Family & Community", "Quality Food", "The Environment"].map((item) => (
                <Link key={item} href="#" className="hover:text-[#fea116] transition-colors text-sm">{item}</Link>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400 flex items-center gap-1">
            &copy; <Flame className="w-3.5 h-3.5 text-[#fea116]" /> <span className="text-[#fea116] font-semibold">FlavorJet</span> | All Rights Reserved
          </p>
          <div className="flex gap-4 text-sm text-gray-400">
            <Link href="/" className="hover:text-[#fea116] transition-colors">Home</Link>
            <Link href="/menu" className="hover:text-[#fea116] transition-colors">Menu</Link>
            <Link href="#" className="hover:text-[#fea116] transition-colors">Help</Link>
            <Link href="#" className="hover:text-[#fea116] transition-colors">FAQs</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
