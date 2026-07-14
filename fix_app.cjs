const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans select-none overflow-hidden justify-center items-center">
      <div className="w-full h-full max-w-md bg-white shadow-2xl relative flex flex-col overflow-hidden">
        {/* Screen Content */}
        <div className="flex-1 overflow-hidden relative">
          {renderMobileContent()}
          
          {/* Floating product details overlay */}
          {selectedProduct && (
            <ProductDetails
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onAddToCart={(pid, qty) => handleAddToCart(pid, qty)}
            />
          )}

          {/* Broadcast notifications panel overlay */}
          {showNotifications && (
            <NotificationsPanel
              onClose={() => {
                setShowNotifications(false);
                refreshNotifications();
              }}
              onRefreshNotifications={() => {
                refreshNotifications();
              }}
            />
          )}
        </div>

        {/* Bottom persistent Nav Bar */}
        {appStep === "main" && (
          <div className="bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 flex-shrink-0">
            <button
              onClick={() => setActiveTab("home")}
              className={\`flex flex-col items-center gap-1 cursor-pointer transition-all \${
                activeTab === "home" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
              }\`}
            >
              <HomeIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold">Home</span>
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={\`flex flex-col items-center gap-1 cursor-pointer transition-all relative \${
                activeTab === "search" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
              }\`}
            >
              <SearchIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold">Catalog</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-brand-lime text-slate-900 font-extrabold text-[8px] px-1.5 py-0.5 rounded-full min-w-4 text-center">
                  {cartCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab("upload")}
              className={\`flex flex-col items-center gap-1 cursor-pointer transition-all \${
                activeTab === "upload" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
              }\`}
            >
              <FileIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold">AI OCR</span>
            </button>
            
            <button
              onClick={() => setActiveTab("history")}
              className={\`flex flex-col items-center gap-1 cursor-pointer transition-all \${
                activeTab === "history" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
              }\`}
            >
              <ListIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold">Orders</span>
            </button>
            
            <button
              onClick={() => setActiveTab("account")}
              className={\`flex flex-col items-center gap-1 cursor-pointer transition-all \${
                activeTab === "account" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
              }\`}
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold">Account</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
`;

content = content.replace(/  return \(\n    <div className="flex h-screen w-screen bg-brand-bg font-sans select-none overflow-hidden">[\s\S]*\}\n/, replacement);
fs.writeFileSync('src/App.tsx', content);
