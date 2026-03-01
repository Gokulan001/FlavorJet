"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChefHat, ArrowRight } from "lucide-react";

const slides = [
  {
    src: "/videos/steak.mp4",
    subtitle: "Welcome to FlavorJet",
    title: "Premium Steak",
    highlight: "Experience",
    description:
      "Perfectly seared and seasoned to bring out the finest flavors in every cut.",
  },
  {
    src: "/videos/salmon.mp4",
    subtitle: "Fresh From the Sea",
    title: "Grilled Salmon",
    highlight: "Perfection",
    description:
      "Wild-caught and flame-grilled, our salmon delivers ocean-fresh taste on every plate.",
  },
  {
    src: "/videos/pizza.mp4",
    subtitle: "Handcrafted Daily",
    title: "Wood Fired",
    highlight: "Pizza",
    description:
      "Artisan dough, premium toppings, baked to perfection in our traditional stone oven.",
  },
  {
    src: "/videos/paella.mp4",
    subtitle: "Authentic Flavors",
    title: "Spanish",
    highlight: "Paella",
    description:
      "A vibrant blend of saffron rice, fresh seafood, and traditional Spanish spices.",
  },
  {
    src: "/videos/rolls.mp4",
    subtitle: "Chef's Selection",
    title: "Sushi Rolls",
    highlight: "Artistry",
    description:
      "Hand-rolled with precision using the freshest ingredients by our expert sushi chefs.",
  },
  {
    src: "/videos/migon.mp4",
    subtitle: "Fine Dining",
    title: "Filet Mignon",
    highlight: "Excellence",
    description:
      "The most tender and luxurious cut, served with our signature reduction sauce.",
  },
];

const SLIDE_DURATION = 7000; // 7 seconds per slide

export default function HeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [textVisible, setTextVisible] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const transitionRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        if (progressRef.current) clearInterval(progressRef.current);
      }
    }, 30);
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (index === currentIndex || nextIndex !== null) return;

      // Fade out text
      setTextVisible(false);

      // Start crossfade after text fades
      transitionRef.current = setTimeout(() => {
        setNextIndex(index);

        // Play the next video
        const nextVideo = videoRefs.current[index];
        if (nextVideo) {
          nextVideo.currentTime = 0;
          nextVideo.play().catch(() => {});
        }

        // Complete crossfade
        setTimeout(() => {
          setCurrentIndex(index);
          setNextIndex(null);
          setTextVisible(true);
          startProgress();
        }, 1200); // crossfade duration
      }, 300); // text fade duration
    },
    [currentIndex, nextIndex, startProgress]
  );

  // Auto-advance
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = (currentIndex + 1) % slides.length;
      goToSlide(next);
    }, SLIDE_DURATION);

    startProgress();

    return () => {
      clearTimeout(timer);
      if (progressRef.current) clearInterval(progressRef.current);
      if (transitionRef.current) clearTimeout(transitionRef.current);
    };
  }, [currentIndex, goToSlide, startProgress]);

  // Play first video on mount
  useEffect(() => {
    const firstVideo = videoRefs.current[0];
    if (firstVideo) {
      firstVideo.play().catch(() => {});
    }
  }, []);

  const current = slides[currentIndex];

  return (
    <section className="relative h-[calc(100vh-64px)] w-full overflow-hidden" id="home">
      {/* Video layers */}
      {slides.map((slide, index) => (
        <div
          key={slide.src}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
          style={{
            opacity: index === currentIndex ? 1 : index === nextIndex ? 1 : 0,
            zIndex: index === nextIndex ? 2 : index === currentIndex ? 1 : 0,
          }}
        >
          <video
            ref={(el) => {
              videoRefs.current[index] = el;
            }}
            autoPlay={index === 0}
            loop
            muted
            playsInline
            preload={index <= 1 ? "auto" : "metadata"}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={slide.src} type="video/mp4" />
          </video>
        </div>
      ))}

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0f172b]/90 via-[#0f172b]/60 to-[#0f172b]/30" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0f172b]/80 via-transparent to-[#0f172b]/40" />

      {/* Content */}
      <div className="relative z-20 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            {/* Subtitle badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fea116]/15 border border-[#fea116]/30 mb-6 transition-all duration-500 ${
                textVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <ChefHat className="w-4 h-4 text-[#fea116]" />
              <span className="text-[#fea116] text-sm font-medium tracking-wider uppercase">
                {current.subtitle}
              </span>
            </div>

            {/* Title */}
            <h1
              className={`text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 transition-all duration-700 ${
                textVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: textVisible ? "100ms" : "0ms" }}
            >
              {current.title}
              <br />
              <span className="text-[#fea116]">{current.highlight}</span>
            </h1>

            {/* Description */}
            <p
              className={`text-gray-300 text-lg sm:text-xl leading-relaxed mb-10 max-w-lg transition-all duration-700 ${
                textVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: textVisible ? "200ms" : "0ms" }}
            >
              {current.description}
            </p>

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 ${
                textVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: textVisible ? "300ms" : "0ms" }}
            >
              <Link
                href="/menu"
                className="group inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[#fea116] text-[#0f172b] rounded-full font-bold text-base sm:text-lg hover:bg-[#f3c156] transition-all duration-300 hover:shadow-lg hover:shadow-[#fea116]/30"
              >
                Order Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#about"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border-2 border-white/25 text-white rounded-full font-semibold text-base sm:text-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom right: Cinematic slide counter */}
      <div className="absolute bottom-6 sm:bottom-10 right-4 sm:right-12 z-30 flex items-end gap-1.5">
        <span className="text-3xl sm:text-5xl font-bold text-white leading-none">
          {String(currentIndex + 1).padStart(2, "0")}
        </span>
        <span className="text-white/40 text-sm sm:text-lg font-light mb-0.5 sm:mb-1">
          / {String(slides.length).padStart(2, "0")}
        </span>
      </div>

      {/* Bottom left: Progress bar */}
      <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-12 z-30 flex items-center gap-4">
        <div className="flex gap-1.5 sm:gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-6 sm:w-8 h-0.5 rounded-full transition-all duration-500 ${
                index === currentIndex ? "bg-[#fea116]" : index < currentIndex ? "bg-white/50" : "bg-white/20"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
