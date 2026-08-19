import { supabase } from "../lib/supabaseClient";
import { BulkCampaign, BulkCampaignProduct } from "../types";

export const bulkDealsService = {
  async getCampaigns(): Promise<BulkCampaign[]> {
    const { data, error } = await supabase
      .from("bulk_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Error fetching bulk campaigns:", error);
      return [];
    }
    return data as BulkCampaign[];
  },

  async getLiveCampaign(): Promise<BulkCampaign | null> {
    const { data, error } = await supabase
      .from("bulk_campaigns")
      .select("*")
      .eq("status", "Live")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching live campaign:", error);
      return null;
    }
    return data as BulkCampaign | null;
  },

  async getCampaignById(id: string): Promise<BulkCampaign | null> {
    const { data, error } = await supabase
      .from("bulk_campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching campaign by id:", error);
      return null;
    }
    return data as BulkCampaign | null;
  },

  async getCampaignProducts(campaignId: string): Promise<BulkCampaignProduct[]> {
    const { data, error } = await supabase
      .from("bulk_campaign_products")
      .select("*, product:products(*)")
      .eq("campaign_id", campaignId);
      
    if (error) {
      console.error("Error fetching campaign products:", error);
      return [];
    }
    return data as BulkCampaignProduct[];
  },

  async createCampaign(campaign: Partial<BulkCampaign>): Promise<BulkCampaign | null> {
    const { data, error } = await supabase
      .from("bulk_campaigns")
      .insert([campaign])
      .select()
      .maybeSingle();
      
    if (error) {
      console.error("Error creating campaign:", error);
      return null;
    }
    return data as BulkCampaign;
  },

  async updateCampaign(id: string, updates: Partial<BulkCampaign>): Promise<BulkCampaign | null> {
    const { data, error } = await supabase
      .from("bulk_campaigns")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();
      
    if (error) {
      console.error("Error updating campaign:", error);
      return null;
    }
    return data as BulkCampaign;
  },

  async deleteCampaign(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("bulk_campaigns")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error("Error deleting campaign:", error);
      return false;
    }
    return true;
  },

  async setCampaignProducts(campaignId: string, products: { product_id: string, tiers: any[] }[]): Promise<boolean> {
    // First, delete existing products for this campaign
    await supabase
      .from("bulk_campaign_products")
      .delete()
      .eq("campaign_id", campaignId);
      
    if (products.length === 0) return true;
    
    const insertData = products.map(p => ({
      campaign_id: campaignId,
      product_id: p.product_id,
      tiers: p.tiers
    }));

    const { error } = await supabase
      .from("bulk_campaign_products")
      .insert(insertData);
      
    if (error) {
      console.error("Error setting campaign products:", error);
      return false;
    }
    return true;
  }
};
