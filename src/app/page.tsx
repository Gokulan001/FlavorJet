import HeroBanner from "@/components/home/HeroBanner";
import CategoriesSection from "@/components/home/CategoriesSection";
import ServicesSection from "@/components/home/ServicesSection";
import AboutSection from "@/components/home/AboutSection";
import PopularMenuSection from "@/components/home/PopularMenuSection";
import ChefsSection from "@/components/home/ChefsSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import CTASection from "@/components/home/CTASection";
import ScrollReveal from "@/components/animations/ScrollReveal";

export default function Home() {
  return (
    <div className="-mt-20">
      {/* Hero stays pinned — page slides over it */}
      <div className="sticky top-0 z-0">
        <HeroBanner />
      </div>

      {/* Content overlay — slides up over the hero with rounded top corners */}
      <div className="relative z-10 bg-[#f8f9fa] dark:bg-[#0b1120] rounded-t-[2.5rem] mt-6 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
        <ScrollReveal>
          <CategoriesSection />
        </ScrollReveal>
        <ScrollReveal>
          <ServicesSection />
        </ScrollReveal>
        <ScrollReveal direction="left">
          <AboutSection />
        </ScrollReveal>
        <ScrollReveal>
          <PopularMenuSection />
        </ScrollReveal>
        <ScrollReveal direction="right">
          <ChefsSection />
        </ScrollReveal>
        <ScrollReveal>
          <TestimonialsSection />
        </ScrollReveal>
        <ScrollReveal>
          <CTASection />
        </ScrollReveal>
      </div>
    </div>
  );
}
