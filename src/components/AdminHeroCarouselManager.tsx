import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, GripVertical, Save, Check } from "lucide-react";
import { HeroSlide, heroCarouselService } from "../services";

export default function AdminHeroCarouselManager() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [editingSlide, setEditingSlide] = useState<Partial<HeroSlide> | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await heroCarouselService.getSlides();
    const inv = await heroCarouselService.getAutoAdvanceInterval();
    setSlides(data.sort((a, b) => a.display_order - b.display_order));
    setIntervalMs(inv);
    setLoading(false);
  };

  const handleSaveInterval = async () => {
    await heroCarouselService.setAutoAdvanceInterval(intervalMs);
    showSuccess("Settings saved");
  };

  const handleSaveSlide = async () => {
    if (!editingSlide) return;
    
    // For new slides, figure out display order
    if (!editingSlide.id) {
      editingSlide.display_order = slides.length > 0 ? Math.max(...slides.map(s => s.display_order)) + 1 : 1;
    }

    const saved = await heroCarouselService.saveSlide(editingSlide);
    if (saved) {
      setEditingSlide(null);
      await loadData();
      showSuccess("Slide saved successfully");
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (confirm("Are you sure you want to delete this slide?")) {
      await heroCarouselService.deleteSlide(id);
      await loadData();
      showSuccess("Slide deleted");
    }
  };

  const handleToggleActive = async (slide: HeroSlide) => {
    await heroCarouselService.saveSlide({ id: slide.id, is_active: !slide.is_active });
    await loadData();
  };

  const moveSlide = async (index: number, direction: -1 | 1) => {
    const newSlides = [...slides];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;

    // Swap display order
    const temp = newSlides[index].display_order;
    newSlides[index].display_order = newSlides[targetIndex].display_order;
    newSlides[targetIndex].display_order = temp;

    // Save orders
    await heroCarouselService.updateSlideOrder([
      { id: newSlides[index].id, display_order: newSlides[index].display_order },
      { id: newSlides[targetIndex].id, display_order: newSlides[targetIndex].display_order }
    ]);
    
    await loadData();
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  if (loading) return <div className="p-4 text-slate-500">Loading...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-brand-charcoal">Hero Carousel Manager</h2>
        {successMsg && (
          <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            {successMsg}
          </span>
        )}
      </div>

      {/* Global Settings */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-end gap-4">
        <div className="flex-1">
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Auto-Advance Interval (ms)
          </label>
          <input 
            type="number" 
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
          />
        </div>
        <button 
          onClick={handleSaveInterval}
          className="bg-brand-purple text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
        >
          Save Settings
        </button>
      </div>

      {/* Slide Editor / Modal replacement */}
      {editingSlide && (
        <div className="bg-white p-5 rounded-3xl shadow-lg border border-indigo-100 space-y-4 relative">
          <h3 className="text-sm font-black text-brand-charcoal">
            {editingSlide.id ? "Edit Slide" : "New Slide"}
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Slide Type</label>
              <select 
                value={editingSlide.type || "custom"} 
                disabled={editingSlide.type === "greeting"}
                onChange={(e) => setEditingSlide({...editingSlide, type: e.target.value as any})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
              >
                <option value="greeting">Greeting (Permanent)</option>
                <option value="announcement">Announcement</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Background Preset</label>
              <select 
                value={editingSlide.background_preset || "purple-lime"} 
                onChange={(e) => setEditingSlide({...editingSlide, background_preset: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
              >
                <option value="purple-lime">Purple & Lime</option>
                <option value="purple-dominant">Deep Purple</option>
                <option value="lime-dominant">Vibrant Lime</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Title</label>
              <input 
                type="text" 
                value={editingSlide.title || ""}
                onChange={(e) => setEditingSlide({...editingSlide, title: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                placeholder="e.g. Big Summer Sale!"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subtitle</label>
              <input 
                type="text" 
                value={editingSlide.subtitle || ""}
                onChange={(e) => setEditingSlide({...editingSlide, subtitle: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                placeholder="e.g. Don't miss out on these deals..."
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">CTA Label</label>
              <input 
                type="text" 
                value={editingSlide.cta_label || ""}
                onChange={(e) => setEditingSlide({...editingSlide, cta_label: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                placeholder="e.g. Shop Now"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">CTA Route / Link</label>
              <input 
                type="text" 
                value={editingSlide.cta_route || ""}
                onChange={(e) => setEditingSlide({...editingSlide, cta_route: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                placeholder="e.g. /search"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button 
              onClick={() => setEditingSlide(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveSlide}
              className="bg-brand-lime text-slate-900 px-4 py-2 rounded-xl text-xs font-extrabold hover:bg-brand-lime-dark"
            >
              Save Slide
            </button>
          </div>
        </div>
      )}

      {/* Slide List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-sm font-black text-brand-charcoal">Slide Sequence</h3>
          <button 
            onClick={() => setEditingSlide({ type: "custom", background_preset: "purple-lime", is_active: true })}
            className="flex items-center gap-1 bg-brand-purple text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Slide
          </button>
        </div>
        
        <div className="divide-y divide-slate-100">
          {slides.map((slide, index) => (
            <div key={slide.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              {/* Order Controls */}
              <div className="flex flex-col items-center gap-1 opacity-50">
                <button 
                  onClick={() => moveSlide(index, -1)}
                  disabled={index === 0}
                  className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => moveSlide(index, 1)}
                  disabled={index === slides.length - 1}
                  className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    slide.type === 'greeting' ? 'bg-indigo-100 text-indigo-700' : 
                    slide.type === 'announcement' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {slide.type}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">Order: {slide.display_order}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800">{slide.title}</h4>
                {slide.subtitle && <p className="text-xs text-slate-500">{slide.subtitle}</p>}
              </div>

              {/* Status */}
              <div>
                <button
                  onClick={() => handleToggleActive(slide)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${slide.is_active ? 'bg-brand-lime' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${slide.is_active ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 ml-4">
                <button 
                  onClick={() => setEditingSlide(slide)}
                  className="p-2 text-slate-400 hover:text-brand-purple bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {slide.type !== 'greeting' && (
                  <button 
                    onClick={() => handleDeleteSlide(slide.id)}
                    className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {slides.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm font-medium">
              No slides configured. Add one above!
            </div>
          )}
        </div>
      </div>
      
      {/* Notice about dynamic slides */}
      <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-xs">
        <p><strong>Note:</strong> The "Promo" slide type is automatically generated and inserted when there is a Live Bulk Deals campaign. You do not need to create it manually here.</p>
      </div>
    </div>
  );
}
