const fs = require('fs');

let code = fs.readFileSync('src/components/Account.tsx', 'utf8');

// 1. Add Headset to imports
code = code.replace(
  'import { User as UserIcon, Heart, Shield, RefreshCcw, LogOut, FileText, Check, ShoppingCart, LifeBuoy, Pencil, Award, Clock, AlertTriangle } from "lucide-react";',
  'import { User as UserIcon, Heart, Shield, RefreshCcw, LogOut, FileText, Check, ShoppingCart, LifeBuoy, Pencil, Award, Clock, AlertTriangle, Headset } from "lucide-react";'
);

// 2. Fix container padding
code = code.replace(
  '<div className="w-full h-full bg-slate-50 flex flex-col select-none overflow-y-auto p-4 space-y-4 pb-32">',
  '<div className="w-full h-full bg-slate-50 flex flex-col select-none overflow-y-auto px-4 pt-10 pb-32 space-y-4">'
);

// 3. Fix Quick Action Grid
const oldGrid = `{/* B2B Operational Quick-Action Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button onClick={() => onTriggerTab && onTriggerTab("history")} className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2 bg-brand-purple/10 rounded-xl text-brand-purple">
            <ShoppingCart className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Order History</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">View wholesale orders</span>
          </div>
        </button>
        <button className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Tax & VAT</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Procurement statements</span>
          </div>
        </button>
        <button className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left col-span-2 md:col-span-1">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Delivery Location</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Manage depot drop-offs</span>
          </div>
        </button>
      </div>`;

const newGrid = `{/* B2B Operational Quick-Action Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onTriggerTab && onTriggerTab("history")} className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2 bg-brand-purple/10 rounded-xl text-brand-purple">
            <ShoppingCart className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Order History</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">View wholesale orders</span>
          </div>
        </button>
        
        <button className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Tax & VAT</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Procurement statements</span>
          </div>
        </button>
        
        <button className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Delivery Location</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Manage depot drop-offs</span>
          </div>
        </button>

        <button className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
            <Headset className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Depot Support</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">24/7 Helpline & Dispatch</span>
          </div>
        </button>
      </div>`;

code = code.replace(oldGrid, newGrid);

fs.writeFileSync('src/components/Account.tsx', code);
