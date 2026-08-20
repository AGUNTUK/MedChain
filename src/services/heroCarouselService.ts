import { supabase } from "../lib/supabaseClient";

export interface HeroSlide {
  id: string;
  type: "greeting" | "promo" | "announcement" | "reorder_nudge" | "custom";
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_route: string | null;
  background_preset: "purple-lime" | "purple-dominant" | "lime-dominant" | string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Simple fallback storage using localStorage
const LOCAL_STORAGE_KEY = "medichain_hero_slides";
const LOCAL_SETTINGS_KEY = "medichain_hero_settings";

function getLocalSlides(): HeroSlide[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalSlides(slides: HeroSlide[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(slides));
}

function getLocalInterval(): number {
  try {
    const data = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.auto_advance_interval) return parsed.auto_advance_interval;
    }
  } catch {}
  return 5000;
}

function saveLocalInterval(ms: number) {
  try {
    const data = localStorage.getItem(LOCAL_SETTINGS_KEY);
    const parsed = data ? JSON.parse(data) : {};
    parsed.auto_advance_interval = ms;
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(parsed));
  } catch {}
}

let useFallback = false;

export const heroCarouselService = {
  async getSlides(): Promise<HeroSlide[]> {
    if (useFallback) return getLocalSlides().sort((a, b) => a.display_order - b.display_order);

    const { data, error } = await supabase
      .from("hero_slides")
      .select("*")
      .order("display_order", { ascending: true });
      
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
        console.warn("Table 'hero_slides' not found in Supabase. Falling back to localStorage.");
        useFallback = true;
        return getLocalSlides().sort((a, b) => a.display_order - b.display_order);
      }
      console.error("Error fetching hero slides:", error);
      return [];
    }
    return data as HeroSlide[];
  },

  async getActiveSlides(): Promise<HeroSlide[]> {
    if (useFallback) return getLocalSlides().filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order);

    const { data, error } = await supabase
      .from("hero_slides")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
      
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
        useFallback = true;
        return getLocalSlides().filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order);
      }
      console.error("Error fetching active hero slides:", error);
      return [];
    }
    return data as HeroSlide[];
  },

  async getAutoAdvanceInterval(): Promise<number> {
    if (useFallback) return getLocalInterval();

    const { data, error } = await supabase
      .from("hero_carousel_settings")
      .select("value")
      .eq("key", "auto_advance_interval")
      .maybeSingle();

    if (error || !data) {
      if (error && (error.code === 'PGRST205' || error.message?.includes('not find the table'))) {
        useFallback = true;
        return getLocalInterval();
      }
      return 5000;
    }
    return Number(data.value) || 5000;
  },

  async setAutoAdvanceInterval(ms: number): Promise<boolean> {
    if (useFallback) {
      saveLocalInterval(ms);
      return true;
    }

    const { error } = await supabase
      .from("hero_carousel_settings")
      .upsert({ key: "auto_advance_interval", value: ms }, { onConflict: 'key' });
    
    if (error) {
      if (error.code === 'PGRST205') {
        useFallback = true;
        saveLocalInterval(ms);
        return true;
      }
      console.error("Error setting interval:", error);
      return false;
    }
    return true;
  },

  async saveSlide(slide: Partial<HeroSlide>): Promise<HeroSlide | null> {
    if (useFallback) {
      const slides = getLocalSlides();
      if (slide.id) {
        const index = slides.findIndex(s => s.id === slide.id);
        if (index > -1) {
          slides[index] = { ...slides[index], ...slide };
          saveLocalSlides(slides);
          return slides[index];
        }
        return null;
      } else {
        const newSlide = { 
          ...slide, 
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString()
        } as HeroSlide;
        slides.push(newSlide);
        saveLocalSlides(slides);
        return newSlide;
      }
    }

    if (slide.id) {
      const { data, error } = await supabase
        .from("hero_slides")
        .update(slide)
        .eq("id", slide.id)
        .select()
        .single();
      if (error) {
        console.error("Error updating slide:", error);
        return null;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from("hero_slides")
        .insert([slide])
        .select()
        .single();
      if (error) {
        if (error.code === 'PGRST205') {
          useFallback = true;
          // Re-call in fallback mode
          return this.saveSlide(slide);
        }
        console.error("Error creating slide:", error);
        return null;
      }
      return data;
    }
  },

  async deleteSlide(id: string): Promise<boolean> {
    if (useFallback) {
      let slides = getLocalSlides();
      slides = slides.filter(s => s.id !== id);
      saveLocalSlides(slides);
      return true;
    }

    const { error } = await supabase
      .from("hero_slides")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error("Error deleting slide:", error);
      return false;
    }
    return true;
  },

  async updateSlideOrder(updates: { id: string, display_order: number }[]): Promise<boolean> {
    if (useFallback) {
      const slides = getLocalSlides();
      updates.forEach(u => {
        const slide = slides.find(s => s.id === u.id);
        if (slide) slide.display_order = u.display_order;
      });
      saveLocalSlides(slides);
      return true;
    }

    const promises = updates.map(u => 
      supabase.from("hero_slides").update({ display_order: u.display_order }).eq("id", u.id)
    );
    await Promise.all(promises);
    return true;
  }
};
