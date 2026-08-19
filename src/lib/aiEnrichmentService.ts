import axios from "axios";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { ENRICHMENT_SOURCES, EnrichmentSourceKey } from "./enrichmentSources";

// Firecrawl configuration
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "fc-ccc5bfe9944141948d4179fa25f4bffa";
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v2';


export interface EnrichmentFilter {
  missingType: "mrp" | "image" | "both" | "all";
  manufacturer?: string;
  generic?: string;
  category?: string;
  brand?: string;
}

export interface EnrichmentConfig {
  batchSize: number;
  delayMs: number;
  concurrencyLimit: number;
  dryRun: boolean;
  autoRetry: boolean;
  overwriteExisting: boolean;
  filters: EnrichmentFilter;
}

export interface EnrichmentLog {
  timestamp: string;
  productId: string;
  productName: string;
  action: string;
  status: "success" | "error" | "needs_review" | "skipped";
  details: string;
  source?: string;
}

export interface EnrichmentState {
  status: "idle" | "running" | "paused" | "stopped";
  config: EnrichmentConfig | null;
  totalProducts: number;
  pendingIds: string[];
  runningIds: string[];
  completedCount: number;
  updatedCount: number;
  skippedCount: number;
  needsReviewCount: number;
  failedCount: number;
  retriesCount: number;
  currentProduct: string | null;
  currentBatch: number;
  currentAiModel: string;
  memoryUsage: string;
  estimatedRemainingTime: number;
  logs: EnrichmentLog[];
  lastTickAt: string | null;
}

const DEFAULT_STATE: EnrichmentState = {
  status: "idle",
  config: null,
  totalProducts: 0,
  pendingIds: [],
  runningIds: [],
  completedCount: 0,
  updatedCount: 0,
  skippedCount: 0,
  needsReviewCount: 0,
  failedCount: 0,
  retriesCount: 0,
  currentProduct: null,
  currentBatch: 0,
  currentAiModel: "-",
  memoryUsage: "0 MB",
  estimatedRemainingTime: 0,
  logs: [],
  lastTickAt: null
};

const STATE_ROW_TYPE = "ai_enrichment_state";
const LOG_ROW_TYPE = "ai_enrichment_job_log";
const MAX_IN_MEMORY_LOGS = 200;
const TICK_LOCK_MS = 2000;

let cachedLogs: EnrichmentLog[] = [];

async function loadState(): Promise<EnrichmentState> {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id, message")
      .eq("type", STATE_ROW_TYPE)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const cloudState = JSON.parse(data[0].message);
      return { ...DEFAULT_STATE, ...cloudState, logs: cachedLogs };
    }
  } catch (e) {
    console.error("Failed to load enrichment state from cloud:", e);
  }
  return { ...DEFAULT_STATE, logs: cachedLogs };
}

async function saveState(state: EnrichmentState): Promise<void> {
  try {
    const stateToSave = { ...state, logs: [] };
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("type", STATE_ROW_TYPE)
      .limit(1);

    if (data && data.length > 0) {
      await supabaseAdmin
        .from("notifications")
        .update({ message: JSON.stringify(stateToSave), created_at: new Date().toISOString() })
        .eq("id", data[0].id);
    } else {
      await supabaseAdmin.from("notifications").insert({
        title: "AI Enrichment State",
        message: JSON.stringify(stateToSave),
        type: STATE_ROW_TYPE,
        read: true
      });
    }
  } catch (e) {
    console.error("Failed to save enrichment state to cloud:", e);
  }
}

function addLog(state: EnrichmentState, log: Omit<EnrichmentLog, "timestamp">) {
  const fullLog = { ...log, timestamp: new Date().toISOString(), source: log.source || state.config?.source || "medex" };
  cachedLogs.unshift(fullLog);
  if (cachedLogs.length > MAX_IN_MEMORY_LOGS) cachedLogs.pop();
  state.logs = cachedLogs;

  if (log.status === "error" || log.status === "needs_review" || log.status === "success") {
    supabaseAdmin
      .from("notifications")
      .insert({
        title: `Enrichment ${log.status}: ${log.productName}`,
        message: JSON.stringify(fullLog),
        type: LOG_ROW_TYPE,
        related_id: log.productId,
        read: true
      })
      .then(
        () => {},
        () => {}
      );
  }
}


async function processProduct(state: EnrichmentState, productId: string) {
  const config = state.config!;
  const { data: products, error } = await supabaseAdmin.from("products").select("*").eq("id", productId);
  if (error || !products || products.length === 0) {
    addLog(state, { productId, productName: "Unknown", action: "Fetch", status: "error", details: "Product not found in DB" });
    state.failedCount++;
    return;
  }
  const product = products[0];
  state.currentProduct = product.name;
  
  try {
    const needsMrp = config.overwriteExisting || !product.mrp || product.mrp === 0;
    const needsImage = config.overwriteExisting || !product.image_url;
    
    if (!needsMrp && !needsImage) {
      addLog(state, { productId, productName: product.name, action: "Check", status: "skipped", details: "Already enriched" });
      state.skippedCount++;
      return;
    }

    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is missing in environment variables. Please add it and restart the server.");
    }
    
    const sourceKey = (config.source as EnrichmentSourceKey) || "medex";
    const sourceConfig = ENRICHMENT_SOURCES[sourceKey] || ENRICHMENT_SOURCES.medex;
    
    state.currentAiModel = `Firecrawl (${sourceConfig.name})`;

    if (config.dryRun) {
      addLog(state, {
        productId,
        productName: product.name,
        action: "Dry Run",
        status: "success",
        details: `Would enrich via Firecrawl from ${sourceConfig.name} (MRP: ${needsMrp}, Image: ${needsImage})`
      });
      state.updatedCount++;
      return;
    }

    // Step 1: Use Firecrawl map to find the page for this product
    const searchQuery = `${product.name} ${product.strength || ""} ${product.company || ""}`.trim();
    
    let scrapeUrl = null;
    try {
      const mapRes = await axios.post(`${FIRECRAWL_BASE_URL}/map`, {
        url: sourceConfig.mapUrl,
        search: searchQuery,
        limit: 3
      }, {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });
      
      const links = mapRes.data?.links || [];
      const brandLink = links.find((l: any) => {
        const urlStr = typeof l === 'string' ? l : l.url;
        return urlStr && sourceConfig.mapFilter(urlStr);
      });
      
      if (brandLink) {
        scrapeUrl = typeof brandLink === 'string' ? brandLink : brandLink.url;
      }
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || e.message;
      console.error("Firecrawl map error:", errorMessage);
      if (errorMessage?.includes('Rate limit exceeded') || errorMessage?.includes('Insufficient credits')) {
        throw new Error(`FIRECRAWL_RATE_LIMIT:${errorMessage}`);
      }
    }
    
    if (!scrapeUrl) {
      addLog(state, {
        productId,
        productName: product.name,
        action: "Map Search",
        status: "needs_review",
        details: `No matching page found on ${sourceConfig.name} via Firecrawl Map`
      });
      state.needsReviewCount++;
      return;
    }

    // Step 2: Use Firecrawl scrape with extraction to get MRP and Image URL
    let extracted: any = null;
    try {
      const promptString = sourceConfig.promptTemplate.replace("{PRODUCT_NAME}", product.name);
      const scrapeRes = await axios.post(`${FIRECRAWL_BASE_URL}/scrape`, {
        url: scrapeUrl,
        formats: [
          {
            type: "json",
            prompt: promptString,
            schema: {
              type: "object",
              properties: {
                mrp: { type: "number" },
                imageUrl: { type: "string" }
              },
              required: ["mrp"]
            }
          }
        ],
        waitFor: 3000
      }, {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      extracted = scrapeRes.data?.data?.json;
    } catch (e: any) {
      const errorMessage = e.response?.data?.error || e.message;
      console.error("Firecrawl scrape error:", errorMessage);
      if (errorMessage.includes('Rate limit exceeded') || errorMessage.includes('Insufficient credits')) {
        throw new Error(`FIRECRAWL_RATE_LIMIT:${errorMessage}`);
      }
      throw new Error("Failed to extract data using Firecrawl: " + errorMessage);
    }
    
    if (!extracted || (!extracted.mrp && !extracted.imageUrl)) {
      addLog(state, {
        productId,
        productName: product.name,
        action: "Enrichment",
        status: "needs_review",
        details: `Firecrawl extracted empty data for ${scrapeUrl}`
      });
      state.needsReviewCount++;
      return;
    }
    
    const updates: any = {};
    
    if (needsMrp && typeof extracted.mrp === "number" && extracted.mrp > 0) {
      updates.mrp = extracted.mrp;
      if (!product.selling_price || product.selling_price === 0) {
        updates.selling_price = extracted.mrp;
      }
    }
    
    if (needsImage && extracted.imageUrl && typeof extracted.imageUrl === "string" && extracted.imageUrl.startsWith("http")) {
      try {
        const imgResponse = await axios.get(extracted.imageUrl, { responseType: "arraybuffer", timeout: 10000 });
        const buffer = Buffer.from(imgResponse.data, "binary");
        if (buffer.length > 5 * 1024 * 1024) throw new Error("Image too large");
        if (buffer.length < 5000) throw new Error("Image too small (likely thumbnail or broken)");
        
        const ext = extracted.imageUrl.split(".").pop()?.split("?")[0] || "jpg";
        const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        const filePath = `products/enriched_${cleanName}_${Date.now()}.${ext}`;
        
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("product-images")
          .upload(filePath, buffer, { contentType: imgResponse.headers["content-type"] as string || `image/${ext}`, upsert: true });
          
        if (uploadErr) throw new Error("Storage upload failed: " + uploadErr.message);
        
        const { data: pubUrl } = supabaseAdmin.storage.from("product-images").getPublicUrl(filePath);
        updates.image_url = pubUrl.publicUrl;
      } catch (imgErr: any) {
        addLog(state, { productId, productName: product.name, action: "Image processing", status: "error", details: imgErr.message });
      }
    }
    
    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabaseAdmin.from("products").update(updates).eq("id", productId);
      if (updateErr) throw updateErr;
      
      addLog(state, {
        productId,
        productName: product.name,
        action: "Update DB",
        status: "success",
        details: `Updated ${Object.keys(updates).join(", ")} via Firecrawl`
      });
      state.updatedCount++;
    } else {
      addLog(state, { productId, productName: product.name, action: "Check", status: "skipped", details: "No valid data to update" });
      state.skippedCount++;
    }

  } catch (error: any) {
    const isRateLimit = error.message.includes('FIRECRAWL_RATE_LIMIT');
    const displayError = isRateLimit ? error.message.split('FIRECRAWL_RATE_LIMIT:')[1] : error.message;
    
    addLog(state, { productId, productName: product.name, action: "Process", status: "error", details: displayError });
    state.failedCount++;
    
    if (isRateLimit) {
      state.status = "paused";
      state.pendingIds.unshift(productId); // Put it back at the front to retry later
      state.failedCount--; // Don't count as a permanent failure
      return;
    }
    
    if (config.autoRetry && state.retriesCount < Math.min(100, state.totalProducts * 2)) {
      state.retriesCount++;
      state.pendingIds.push(productId);
      state.failedCount--;
      addLog(state, { productId, productName: product.name, action: "Auto Retry", status: "skipped", details: "Pushed to end of queue for retry" });
    }
  }
}
async function processOneBatch(): Promise<EnrichmentState> {
  const state = await loadState();
  if (state.status !== "running" || !state.config) {
    return state;
  }

  if (state.lastTickAt) {
    const elapsed = Date.now() - new Date(state.lastTickAt).getTime();
    const lockMs = state.config?.delayMs || TICK_LOCK_MS;
    if (elapsed >= 0 && elapsed < lockMs) {
      return state;
    }
  }

  if (state.pendingIds.length === 0) {
    state.status = "stopped";
    state.runningIds = [];
    state.estimatedRemainingTime = 0;
    await saveState(state);
    return state;
  }

  const config = state.config;
  state.lastTickAt = new Date().toISOString();
  await saveState(state);

  const batch = state.pendingIds.splice(0, config.concurrencyLimit);
  state.currentBatch++;
  state.runningIds = batch;

  await Promise.all(batch.map(id => processProduct(state, id)));

  state.completedCount += batch.length;
  state.runningIds = [];

  if (state.pendingIds.length > 0) {
    const batchesLeft = Math.ceil(state.pendingIds.length / config.concurrencyLimit);
    state.estimatedRemainingTime = batchesLeft * 60;
  } else {
    state.estimatedRemainingTime = 0;
    state.status = "stopped";
  }

  await saveState(state);
  return state;
}

export const aiEnrichmentService = {
  async getState(): Promise<EnrichmentState> {
    const state = await loadState();
    const mem = process.memoryUsage();
    state.memoryUsage = `${Math.round(mem.rss / 1024 / 1024)} MB (RSS)`;
    return state;
  },

  async start(config: EnrichmentConfig): Promise<EnrichmentState> {
    let state = await loadState();
    if (state.status === "running") return state;

    state = { ...DEFAULT_STATE, config, status: "running", logs: cachedLogs };

    let query = supabaseAdmin.from("products").select("id");
    
    if (config.filters.manufacturer) query = query.ilike("company", `%${config.filters.manufacturer}%`);
    if (config.filters.generic) query = query.ilike("generic_name", `%${config.filters.generic}%`);
    if (config.filters.category) query = query.ilike("category_name_fallback", `%${config.filters.category}%`);
    
    if (config.filters.missingType === "mrp") {
      query = query.or("mrp.is.null,mrp.eq.0");
    } else if (config.filters.missingType === "image") {
      query = query.is("image_url", null);
    } else if (config.filters.missingType === "both") {
      query = query.or("mrp.is.null,mrp.eq.0").is("image_url", null);
    }

    const { data, error } = await query;
    if (error) throw error;

    state.pendingIds = (data || []).map((d: any) => d.id);
    state.totalProducts = state.pendingIds.length;

    await saveState(state);
    return processOneBatch();
  },

  async pause(): Promise<EnrichmentState> {
    const state = await loadState();
    state.status = "paused";
    await saveState(state);
    return state;
  },

  async resume(): Promise<EnrichmentState> {
    const state = await loadState();
    if (state.status !== "paused") return state;
    state.status = "running";
    await saveState(state);
    return processOneBatch();
  },

  async stop(): Promise<EnrichmentState> {
    const state = await loadState();
    state.status = "stopped";
    state.pendingIds = [];
    state.runningIds = [];
    await saveState(state);
    return state;
  },

  async retryFailed(): Promise<EnrichmentState> {
    const state = await loadState();
    if (state.failedCount === 0 || state.status === "running") return state;
    
    // In our simplified state, we don't have a specific failedIds array,
    // but we can just trigger a restart with the exact same config.
    // However, if we want to just restart the engine:
    state.status = "running";
    state.failedCount = 0;
    await saveState(state);
    return processOneBatch();
  },

  tick: processOneBatch
};
