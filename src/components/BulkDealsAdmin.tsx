import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, CheckCircle2, AlertTriangle, Search, X, Package, Calendar } from "lucide-react";
import { bulkDealsService, productService } from "../services";
import { BulkCampaign, BulkCampaignProduct, Product } from "../types";

export default function BulkDealsAdmin() {
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState<Partial<BulkCampaign> | null>(null);
  const [campaignProducts, setCampaignProducts] = useState<Partial<BulkCampaignProduct>[]>([]);
  
  // Product Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Tiers for a newly added product
  const defaultTiers = [{ minQty: 10, discountPercent: 10 }];

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    const data = await bulkDealsService.getCampaigns();
    setCampaigns(data);
    setLoading(false);
  };

  const handleEdit = async (campaign: BulkCampaign) => {
    setCurrentCampaign(campaign);
    const products = await bulkDealsService.getCampaignProducts(campaign.id);
    setCampaignProducts(products);
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentCampaign({
      title: "",
      subtext: "",
      banner_color: "bg-brand-purple",
      banner_image_url: "",
      cta_text: "Shop Bulk Deals",
      status: "Draft"
    });
    setCampaignProducts([]);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentCampaign) return;
    
    let savedCampaign;
    if (currentCampaign.id) {
      savedCampaign = await bulkDealsService.updateCampaign(currentCampaign.id, currentCampaign);
    } else {
      savedCampaign = await bulkDealsService.createCampaign(currentCampaign as Omit<BulkCampaign, "id" | "created_at">);
    }
    
    if (savedCampaign) {
      // Save products
      await bulkDealsService.setCampaignProducts(
        savedCampaign.id,
        campaignProducts.map(cp => ({
          product_id: cp.product_id as string,
          tiers: cp.tiers as any[]
        }))
      );
      
      setIsEditing(false);
      loadCampaigns();
    }
  };

  const handleSearchProduct = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length > 2) {
      setSearching(true);
      const res = await productService.getProductsPaginated({ search: q, limit: 10 });
      setSearchResults(res.products);
      setSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const addProductToCampaign = (product: Product) => {
    if (campaignProducts.find(cp => cp.product_id === product.id)) return;
    
    setCampaignProducts([
      ...campaignProducts,
      {
        product_id: product.id,
        product,
        tiers: [...defaultTiers]
      }
    ]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateTier = (productIdx: number, tierIdx: number, field: "minQty" | "discountPercent", value: number) => {
    const newProducts = [...campaignProducts];
    const newTiers = [...(newProducts[productIdx].tiers || [])];
    newTiers[tierIdx] = { ...newTiers[tierIdx], [field]: value };
    newProducts[productIdx].tiers = newTiers;
    setCampaignProducts(newProducts);
  };

  const addTier = (productIdx: number) => {
    const newProducts = [...campaignProducts];
    const tiers = newProducts[productIdx].tiers || [];
    const lastQty = tiers.length > 0 ? tiers[tiers.length - 1].minQty : 0;
    newProducts[productIdx].tiers = [...tiers, { minQty: lastQty + 10, discountPercent: 15 }];
    setCampaignProducts(newProducts);
  };

  const removeTier = (productIdx: number, tierIdx: number) => {
    const newProducts = [...campaignProducts];
    const tiers = [...(newProducts[productIdx].tiers || [])];
    tiers.splice(tierIdx, 1);
    newProducts[productIdx].tiers = tiers;
    setCampaignProducts(newProducts);
  };

  const removeProduct = (productIdx: number) => {
    const newProducts = [...campaignProducts];
    newProducts.splice(productIdx, 1);
    setCampaignProducts(newProducts);
  };

  if (isEditing && currentCampaign) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {currentCampaign.id ? "Edit Campaign" : "New Bulk Campaign"}
            </h2>
            <p className="text-sm text-slate-500">Configure banner details and add products</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
            >
              Save Campaign
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-8">
          {/* Campaign Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Title (Badge)</label>
              <input
                type="text"
                value={currentCampaign.title || ""}
                onChange={e => setCurrentCampaign({...currentCampaign, title: e.target.value})}
                placeholder="e.g. Super Bulk Savings"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Main Heading</label>
              <input
                type="text"
                value={currentCampaign.subtext || ""}
                onChange={e => setCurrentCampaign({...currentCampaign, subtext: e.target.value})}
                placeholder="e.g. Up to 25% Off Beximco Consignments!"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={currentCampaign.status || "Draft"}
                onChange={e => setCurrentCampaign({...currentCampaign, status: e.target.value as any})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Draft">Draft</option>
                <option value="Live">Live</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={currentCampaign.end_at ? new Date(currentCampaign.end_at).toISOString().slice(0,16) : ""}
                onChange={e => setCurrentCampaign({...currentCampaign, end_at: new Date(e.target.value).toISOString()})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Products & Tiers */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-bold text-slate-800">Campaign Products</h3>
            </div>
            
            <div className="relative mb-6">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchProduct}
                placeholder="Search products to add..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map(p => (
                    <div
                      key={p.id}
                      onClick={() => addProductToCampaign(p)}
                      className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.company} • ৳{p.sellingPrice}</p>
                      </div>
                      <Plus className="w-4 h-4 text-indigo-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {campaignProducts.length === 0 && (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  Search and add products above to configure their bulk pricing tiers.
                </div>
              )}
              {campaignProducts.map((cp, pIdx) => (
                <div key={cp.product_id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{cp.product?.name}</p>
                      <p className="text-xs text-slate-500">Base Price: ৳{cp.product?.sellingPrice}</p>
                    </div>
                    <button onClick={() => removeProduct(pIdx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4 bg-white space-y-3">
                    <div className="grid grid-cols-12 gap-4 text-xs font-medium text-slate-500 px-2">
                      <div className="col-span-5">Min Qty (Cartons)</div>
                      <div className="col-span-5">Discount %</div>
                      <div className="col-span-2"></div>
                    </div>
                    {cp.tiers?.map((tier, tIdx) => (
                      <div key={tIdx} className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-5">
                          <input
                            type="number"
                            min="1"
                            value={tier.minQty}
                            onChange={e => updateTier(pIdx, tIdx, "minQty", parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div className="col-span-5">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={tier.discountPercent}
                              onChange={e => updateTier(pIdx, tIdx, "discountPercent", parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm pr-6"
                            />
                            <span className="absolute right-2 top-2 text-xs text-slate-400">%</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-right">
                          <button onClick={() => removeTier(pIdx, tIdx)} className="text-slate-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => addTier(pIdx)}
                      className="text-indigo-600 text-xs font-medium flex items-center gap-1 hover:text-indigo-700 mt-2"
                    >
                      <Plus className="w-3 h-3" /> Add Tier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bulk Campaigns</h1>
          <p className="text-sm text-slate-500">Manage volume-based discount tiers and homepage banners</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-800">No campaigns yet</h3>
          <p className="text-slate-500 text-sm mt-1">Create a bulk campaign to offer tiered pricing on products.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Campaign Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Ends At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{campaign.title}</div>
                    <div className="text-xs text-slate-500 truncate max-w-xs">{campaign.subtext}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      campaign.status === "Live" ? "bg-emerald-100 text-emerald-700" :
                      campaign.status === "Draft" ? "bg-slate-100 text-slate-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {campaign.end_at ? new Date(campaign.end_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(campaign)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
