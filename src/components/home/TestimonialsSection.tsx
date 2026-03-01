import Image from "next/image";
import { Star, StarHalf, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sadie Johnson",
    image: "/testimonial-1.jpg",
    rating: 4.5,
    text: "Absolutely incredible dining experience! The flavors were exquisite and the presentation was beautiful. FlavorJet has become my go-to for special occasions.",
  },
  {
    name: "Johnny Williams",
    image: "/testimonial-2.jpg",
    rating: 5,
    text: "The online ordering is so convenient, and the food arrives perfectly fresh. The Classic Beef Burger is hands down the best I've ever had. Highly recommend!",
  },
  {
    name: "Smith Anderson",
    image: "/testimonial-3.jpg",
    rating: 4.5,
    text: "From appetizers to desserts, everything was outstanding. The staff is friendly and the service is fast. Can't wait to order from FlavorJet again!",
  },
];

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;
  return (
    <div className="flex items-center gap-0.5 text-[#fea116]">
      {Array.from({ length: fullStars }, (_, i) => (
        <Star key={`f-${i}`} className="w-4 h-4 fill-current" />
      ))}
      {hasHalf && <StarHalf className="w-4 h-4 fill-current" />}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-16 lg:py-20 bg-[#f8f9fa] dark:bg-[#0b1120]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[#fea116] font-medium tracking-wider uppercase mb-2">
            Testimonial
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0f172b] dark:text-white">
            Our Clients Say!!!
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.15}s`, animationFillMode: "both" }}
            >
              <Quote className="w-10 h-10 text-[#fea116]/30 mb-4" />
              <RatingStars rating={testimonial.rating} />
              <p className="text-gray-600 dark:text-slate-300 mt-4 mb-6 leading-relaxed text-sm">
                {testimonial.text}
              </p>
              <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  width={50}
                  height={50}
                  className="rounded-full w-12 h-12 object-cover border-2 border-[#fea116]"
                />
                <div>
                  <h4 className="font-bold text-[#0f172b] dark:text-white">{testimonial.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Valued Customer</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
