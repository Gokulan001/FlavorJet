import Image from "next/image";
import { Facebook, Twitter, Instagram } from "lucide-react";
import StaggerChildren from "@/components/animations/StaggerChildren";
import ShinyText from "@/components/reactbits/ShinyText";

const chefs = [
  { name: "Chef Clark", designation: "Executive Chef", image: "/team-1.jpg" },
  { name: "Chef Bruce", designation: "Head Pastry Chef", image: "/team-2.jpg" },
  { name: "Chef John", designation: "Sous Chef", image: "/team-3.jpg" },
  { name: "Chef Ben", designation: "Grill Master", image: "/team-4.jpg" },
];

export default function ChefsSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="font-medium tracking-wider uppercase mb-2">
            <ShinyText text="Team Members" speed={4} className="text-sm" />
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0f172b] dark:text-white">
            Our Master Chefs
          </h2>
        </div>

        {/* Chefs Grid */}
        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {chefs.map((chef) => (
            <div key={chef.name} className="group text-center">
              <div className="relative overflow-hidden rounded-2xl mb-6 shadow-lg">
                <Image
                  src={chef.image}
                  alt={chef.name}
                  width={300}
                  height={300}
                  className="w-full h-72 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172b]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Social Links */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-3 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <span className="w-10 h-10 rounded-full bg-[#fea116] flex items-center justify-center text-[#0f172b] hover:bg-white transition-colors cursor-pointer">
                    <Facebook className="w-4 h-4" />
                  </span>
                  <span className="w-10 h-10 rounded-full bg-[#fea116] flex items-center justify-center text-[#0f172b] hover:bg-white transition-colors cursor-pointer">
                    <Twitter className="w-4 h-4" />
                  </span>
                  <span className="w-10 h-10 rounded-full bg-[#fea116] flex items-center justify-center text-[#0f172b] hover:bg-white transition-colors cursor-pointer">
                    <Instagram className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-[#0f172b] dark:text-white">{chef.name}</h3>
              <p className="text-[#fea116] text-sm">{chef.designation}</p>
            </div>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
