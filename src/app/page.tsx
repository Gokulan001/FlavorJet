import HeroBanner from "@/components/home/HeroBanner";
import CategoriesSection from "@/components/home/CategoriesSection";
import ServicesSection from "@/components/home/ServicesSection";
import AboutSection from "@/components/home/AboutSection";
import PopularMenuSection from "@/components/home/PopularMenuSection";
import ChefsSection from "@/components/home/ChefsSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";

export default function Home() {
  return (
    <>
      <HeroBanner />
      <CategoriesSection />
      <ServicesSection />
      <AboutSection />
      <PopularMenuSection />
      <ChefsSection />
      <TestimonialsSection />
    </>
  );
}
