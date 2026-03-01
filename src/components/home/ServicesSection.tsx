import { ChefHat, UtensilsCrossed, ShoppingBag, Headphones } from "lucide-react";

const services = [
  {
    icon: ChefHat,
    title: "Master Chefs",
    description: "Our world-class chefs bring years of expertise to craft every dish to perfection.",
  },
  {
    icon: UtensilsCrossed,
    title: "Quality Food",
    description: "Only the freshest, premium ingredients make it into our kitchen and onto your plate.",
  },
  {
    icon: ShoppingBag,
    title: "Online Order",
    description: "Order your favorite dishes online with just a few clicks and enjoy fast delivery.",
  },
  {
    icon: Headphones,
    title: "24/7 Service",
    description: "Our dedicated support team is available around the clock to assist you anytime.",
  },
];

export default function ServicesSection() {
  return (
    <section className="py-16 lg:py-20 bg-[#f8f9fa] dark:bg-[#0b1120]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 animate-fade-in-up"
              style={{
                animationDelay: `${index * 0.15}s`,
                animationFillMode: "both",
              }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#fea116]/10 mb-6 group-hover:bg-[#fea116] transition-colors duration-300">
                <service.icon className="w-8 h-8 text-[#fea116] group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172b] dark:text-white mb-3">{service.title}</h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
