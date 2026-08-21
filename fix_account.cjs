const fs = require('fs');
let code = fs.readFileSync('src/components/Account.tsx', 'utf8');

const target = `{/* Corporate Support and DGDA Details */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3.5 shadow-sm">
        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <LifeBuoy className="w-4 h-4 text-brand-purple" />
          B2B Support & Depot Helpline
        </h3>
                
        <div className="text-xs space-y-2 leading-relaxed font-semibold text-slate-600">
          <div className="flex justify-between">
            <span className="text-slate-400">Support Hours:</span>
            <span>24 Hours / 7 Days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">DGDA License Verification:</span>
            <span className={isVerified ? "text-emerald-600" : "text-amber-500"}>
              {isVerified ? "Verified B2B Regulatory Approved" : "Audit Pending / KYC Required"}
            </span>
          </div>
        </div>
      </div>

      {/* Overlays */}`;

const replacement = `{/* Corporate Support and DGDA Details */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-4 shadow-sm">
        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <LifeBuoy className="w-4 h-4 text-brand-purple" />
          B2B Support & Depot Helpline
        </h3>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <a href="tel:+8801234567890" className="w-full sm:flex-1 bg-brand-purple text-white px-3 py-2.5 rounded-xl text-[11px] font-extrabold flex justify-center items-center gap-1.5 shadow-sm hover:bg-brand-purple/90 transition-colors">
            Call Depot Hotline
          </a>
          <a href="#" className="w-full sm:flex-1 bg-emerald-500 text-white px-3 py-2.5 rounded-xl text-[11px] font-extrabold flex justify-center items-center gap-1.5 shadow-sm hover:bg-emerald-600 transition-colors">
            Live WhatsApp Support
          </a>
        </div>
                
        <div className="text-xs space-y-2 leading-relaxed font-semibold text-slate-600 pt-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Support Hours:</span>
            <span>24 Hours / 7 Days</span>
          </div>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="mt-6 flex items-center justify-center gap-2 w-full py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-2xl border border-rose-100 transition-colors cursor-pointer shadow-sm"
      >
        <LogOut className="w-5 h-5" />
        Sign Out of MediChain
      </button>

      {/* Overlays */}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Account.tsx', code);
