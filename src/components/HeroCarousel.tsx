import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, Sparkles, AlertCircle } from "lucide-react";
import { HeroSlide, heroCarouselService, bulkDealsService } from "../services";
import { useReducedMotion } from "motion/react";

interface HeroCarouselProps {
  pharmacyName: string;
  onOpenScanner?: () => void;
  onBrowseCatalog?: () => void;
  onOpenBulkDeals?: (campaignId?: string) => void;
}

export default function HeroCarousel({
  pharmacyName,
  onOpenScanner,
  onBrowseCatalog,
  onOpenBulkDeals,
}: HeroCarouselProps) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoAdvanceInterval, setAutoAdvanceInterval] = useState(5000);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      const activeSlides = await heroCarouselService.getActiveSlides();
      const interval = await heroCarouselService.getAutoAdvanceInterval();
      setAutoAdvanceInterval(interval);

      // Synthesize Promo Slide if a bulk campaign is live
      const liveCampaign = await bulkDealsService.getLiveCampaign();
      let finalSlides = [...activeSlides];

      if (liveCampaign) {
        const promoSlide: HeroSlide = {
          id: `promo-${liveCampaign.id}`,
          type: "promo",
          title: liveCampaign.title || "Super Bulk Savings",
          subtitle: liveCampaign.subtext || "Unlock bulk pricing on key consignments!",
          cta_label: liveCampaign.cta_text || "Shop Bulk Deals",
          cta_route: `/bulk-deals/${liveCampaign.id}`, // Custom handling
          background_preset: liveCampaign.banner_color || "purple-dominant",
          display_order: 1.5, // Slide it after greeting, before others generally, though order can be configured if it was in DB. Let's just put it at 1.5.
          is_active: true
        };
        
        // Check if there is already a placeholder promo slide in DB to take its order
        const existingPromoIndex = finalSlides.findIndex(s => s.type === "promo");
        if (existingPromoIndex !== -1) {
          promoSlide.display_order = finalSlides[existingPromoIndex].display_order;
          finalSlides[existingPromoIndex] = promoSlide;
        } else {
          finalSlides.push(promoSlide);
        }
      } else {
        // Remove promo slide placeholder if no live campaign
        finalSlides = finalSlides.filter(s => s.type !== "promo");
      }

      // Add reorder nudge later...

      // Sort by display order
      finalSlides.sort((a, b) => a.display_order - b.display_order);
      
      // If no slides, fallback
      if (finalSlides.length === 0) {
        finalSlides = [{
          id: "fallback-greeting",
          type: "greeting",
          title: "Good morning, {pharmacyName}",
          subtitle: "Manage your daily inventory",
          cta_label: "Browse Catalog",
          cta_route: "/search",
          background_preset: "purple-lime",
          display_order: 1,
          is_active: true
        }];
      }

      setSlides(finalSlides);
    } catch (err) {
      console.error("Failed to load carousel slides:", err);
    }
  };

  useEffect(() => {
    if (slides.length <= 1 || isPaused || prefersReducedMotion) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoAdvanceInterval);

    return () => clearInterval(timer);
  }, [slides.length, isPaused, autoAdvanceInterval, prefersReducedMotion]);

  const handleInteraction = () => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 8000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      handleInteraction();
      if (diff > 0) {
        // swipe left
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      } else {
        // swipe right
        setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
      }
    }
  };

  const getBackgroundClass = (preset: string) => {
    switch (preset) {
      case "purple-dominant":
        return "bg-gradient-to-r from-brand-purple to-indigo-800 text-white";
      case "lime-dominant":
        return "bg-gradient-to-r from-brand-lime to-emerald-400 text-slate-900";
      case "purple-lime":
      default:
        return "bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white";
    }
  };

  if (slides.length === 0) return null;

  return (
    <div 
      className="relative w-full h-36 overflow-hidden bg-white border-b border-slate-100 flex-shrink-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className={`flex h-full w-full ${prefersReducedMotion ? '' : 'transition-transform duration-300 ease-out'}`}
        style={{ 
          transform: prefersReducedMotion ? 'none' : `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {slides.map((slide, idx) => {
          const isVisible = prefersReducedMotion ? idx === currentIndex : true;
          if (prefersReducedMotion && !isVisible) return null;
          
          return (
            <div 
              key={slide.id} 
              className={`w-full h-full flex-shrink-0 relative ${getBackgroundClass(slide.background_preset)} px-5 py-4 flex flex-col justify-center ${prefersReducedMotion ? 'animate-fade-in' : ''}`}
            >
              {/* Decorative Blur */}
              <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 w-full">
                {slide.type === "greeting" && (
                  <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 block mb-1">
                    Logged Pharmacy
                  </span>
                )}
                {slide.type === "promo" && (
                  <span className="bg-brand-lime text-slate-950 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg tracking-wider mb-2 inline-block">
                    Super Bulk Savings
                  </span>
                )}

                <h1 className="text-base font-black truncate max-w-[85%] leading-tight">
                  {slide.title.replace("{pharmacyName}", pharmacyName)}
                </h1>
                
                {slide.subtitle && (
                  <p className="text-[10px] mt-1 font-medium opacity-90 max-w-[80%] leading-snug">
                    {slide.subtitle}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  {slide.type === "greeting" && onOpenScanner && (
                     <button
                       onClick={() => { handleInteraction(); onOpenScanner(); }}
                       className="bg-brand-lime text-slate-900 font-extrabold py-1.5 px-3 rounded-xl text-[10px] flex items-center gap-1 hover:shadow-md cursor-pointer transition-all"
                     >
                       <Sparkles className="w-3.5 h-3.5" />
                       Scan Rx
                     </button>
                  )}
                  {slide.cta_label && (
                    <button
                      onClick={() => {
                        handleInteraction();
                        if (slide.type === "promo" && slide.cta_route?.startsWith("/bulk-deals/") && onOpenBulkDeals) {
                           onOpenBulkDeals(slide.cta_route.split("/").pop());
                        } else if (onBrowseCatalog) {
                           onBrowseCatalog();
                        }
                      }}
                      className={`font-extrabold py-1.5 px-3 rounded-xl text-[10px] flex items-center gap-0.5 hover:shadow-md cursor-pointer transition-all ${
                        slide.type === "greeting" 
                          ? "bg-white/20 text-white" 
                          : slide.background_preset === "lime-dominant" 
                            ? "bg-slate-900 text-white" 
                            : "bg-brand-lime text-slate-900"
                      }`}
                    >
                      {slide.cta_label}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { handleInteraction(); setCurrentIndex(idx); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === currentIndex ? "bg-brand-lime w-3" : "bg-white/40"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
