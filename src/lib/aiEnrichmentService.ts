import axios from "axios";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { dbService } from "./dbService.js";


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
  logs: []
};

let state: EnrichmentState = { ...DEFAULT_STATE };
let loopTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

loadStateFromCloud();


// --- Cloud State Persistence ---
async function loadStateFromCloud() {
  try {
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("message")
      .eq("type", "ai_enrichment_state")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const cloudState = JSON.parse(data[0].message);
      // Merge, but keep logs limited in memory
      state = { ...DEFAULT_STATE, ...cloudState, logs: state.logs };
      if (state.status === "running") {
        state.status = "paused"; // Pause if resuming from crash
      }
    }
  } catch (e) {
    console.error("Failed to load enrichment state from cloud", e);
  }
}

async function saveStateToCloud() {
  try {
    const stateToSave = { ...state, logs: [] }; // Don't bloat the state object with logs
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("type", "ai_enrichment_state")
      .limit(1);

    if (data && data.length > 0) {
      await supabaseAdmin.from("notifications").update({ message: JSON.stringify(stateToSave), created_at: new Date().toISOString() }).eq("id", data[0].id);
    } else {
      await supabaseAdmin.from("notifications").insert({
        title: "AI Enrichment State",
        message: JSON.stringify(stateToSave),
        type: "ai_enrichment_state",
        read: true
      });
    }
  } catch (e) {
    console.error("Failed to save enrichment state to cloud", e);
  }
}



async function addLog(log: Omit<EnrichmentLog, "timestamp">) {
  const fullLog = { ...log, timestamp: new Date().toISOString() };
  state.logs.unshift(fullLog);
  if (state.logs.length > 500) state.logs.pop();
  
  // Persist important logs to cloud
  if (log.status === "error" || log.status === "needs_review" || log.status === "success") {
    try {
      await supabaseAdmin.from("notifications").insert({
        title: `Enrichment ${log.status}: ${log.productName}`,
        message: JSON.stringify(fullLog),
        type: "ai_enrichment_job_log",
        related_id: log.productId,
        read: true
      });
    } catch(e) {}
  }
}


const OPENROUTER_MODELS = [
  "qwen/qwen3-30b-a3b:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "openrouter/free"
];

async function callOpenRouter(prompt: string, retries = 0): Promise<{ content: string, model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not found");

  const model = OPENROUTER_MODELS[Math.min(retries, OPENROUTER_MODELS.length - 1)];
  state.currentAiModel = model;
  
  try {
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    }, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_URL || "https://medichain.com",
        "X-Title": "MediChain Enrichment"
      }
    });

    if (response.data && response.data.choices && response.data.choices[0]) {
      return { content: response.data.choices[0].message.content, model };
    }
    throw new Error("Invalid response from OpenRouter");
  } catch (error: any) {
    if (error.response?.status === 429 && retries < OPENROUTER_MODELS.length - 1) {
      console.warn(`Rate limited on ${model}, trying next...`);
      return callOpenRouter(prompt, retries + 1);
    }
    throw error;
  }
}

async function searchWeb(query: string) {
  const cx = process.env.GOOGLE_SEARCH_CX;
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  if (!cx || !key) {
    return null; // Silent fallback if API keys aren't set
  }
  try {
    const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: { key, cx, q: query, num: 3 }
    });
    return res.data.items || [];
  } catch (e) {
    console.error("Google Custom Search error:", e);
    return null;
  }
}

async function processProduct(productId: string) {
  const config = state.config!;
  
  // 1. Fetch product
  const { data: products, error } = await supabaseAdmin.from("products").select("*").eq("id", productId);
  if (error || !products || products.length === 0) {
    addLog({ productId, productName: "Unknown", action: "Fetch", status: "error", details: "Product not found in DB" });
    state.failedCount++;
    return;
  }
  const product = products[0];
  state.currentProduct = product.name;

  try {
    // 2. Determine what needs updating
    const needsMrp = config.overwriteExisting || !product.mrp || product.mrp === 0;
    const needsImage = config.overwriteExisting || !product.image_url;

    if (!needsMrp && !needsImage) {
      addLog({ productId, productName: product.name, action: "Check", status: "skipped", details: "Already enriched" });
      state.skippedCount++;
      return;
    }

    // 3. Search for product details (Search context)
    let searchContext = "";
    let searchImages: string[] = [];
    
    const query = `${product.name} ${product.generic_name || ""} ${product.strength || ""} ${product.company || ""} medicine`;
    const searchResults = await searchWeb(query);
    
    if (searchResults) {
      searchContext = searchResults.map((item: any) => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`).join("\n\n");
      
      // Also try an image search if needed
      if (needsImage) {
        try {
          const imgRes = await axios.get("https://www.googleapis.com/customsearch/v1", {
            params: { key: process.env.GOOGLE_SEARCH_API_KEY, cx: process.env.GOOGLE_SEARCH_CX, q: query, searchType: "image", num: 3 }
          });
          if (imgRes.data.items) {
            searchImages = imgRes.data.items.map((img: any) => img.link);
          }
        } catch(e) {}
      }
    }

    if (config.dryRun) {
      addLog({ productId, productName: product.name, action: "Dry Run", status: "success", details: `Would enrich (MRP: ${needsMrp}, Image: ${needsImage})` });
      state.updatedCount++;
      return;
    }

    // 4. Ask AI to analyze
    const prompt = `
You are a highly accurate pharmaceutical data enrichment AI.
Target Product:
- Name: ${product.name}
- Generic: ${product.generic_name || "N/A"}
- Manufacturer: ${product.company || "N/A"}
- Strength: ${product.strength || "N/A"}
- Pack Size: ${product.pack_size || "N/A"}

Goal:
1. Extract the current Maximum Retail Price (MRP) in BDT (Bangladesh Taka) if possible.
2. Select the best product package image URL from the candidates.

Search Context:
${searchContext}

Candidate Image URLs:
${searchImages.join("\n")}

Respond ONLY with valid JSON in this exact structure:
{
  "mrp": number or null,
  "imageUrl": string or null,
  "confidenceScore": number (0 to 100),
  "reasoning": "brief explanation"
}`;

    const aiRes = await callOpenRouter(prompt);
    let extracted: any;
    try {
      // Strip markdown code block if present
      const jsonStr = aiRes.content.replace(/```json/g, "").replace(/```/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch (e) {
      addLog({ productId, productName: product.name, action: "AI Parse", status: "error", details: "Failed to parse AI JSON response" });
      state.failedCount++;
      return;
    }

    if (extracted.confidenceScore < 85) {
      addLog({ productId, productName: product.name, action: "Enrichment", status: "needs_review", details: `Low confidence (${extracted.confidenceScore}%)` });
      state.needsReviewCount++;
      return;
    }

    // 5. Update data
    const updates: any = {};
    if (needsMrp && typeof extracted.mrp === "number" && extracted.mrp > 0) {
      updates.mrp = extracted.mrp;
      if (!product.selling_price || product.selling_price === 0) {
        updates.selling_price = extracted.mrp; // Set selling price to MRP if empty
      }
    }

    if (needsImage && extracted.imageUrl && extracted.imageUrl.startsWith("http")) {
      // Download and upload image to Supabase Storage
      try {
        const imgResponse = await axios.get(extracted.imageUrl, { responseType: "arraybuffer", timeout: 10000 });
        const buffer = Buffer.from(imgResponse.data, "binary");
        
        // Basic quality/size check
        if (buffer.length > 5 * 1024 * 1024) throw new Error("Image too large");
        if (buffer.length < 5000) throw new Error("Image too small (likely thumbnail or broken)");
        
        const ext = extracted.imageUrl.split(".").pop()?.split("?")[0] || "jpg";
        const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        const filePath = `products/enriched_${cleanName}_${Date.now()}.${ext}`;
        
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("product-images")
          .upload(filePath, buffer, { contentType: imgResponse.headers["content-type"] || `image/${ext}`, upsert: true });
          
        if (uploadErr) {
          throw new Error("Storage upload failed: " + uploadErr.message);
        }
        
        const { data: pubUrl } = supabaseAdmin.storage.from("product-images").getPublicUrl(filePath);
        updates.image_url = pubUrl.publicUrl;
      } catch (imgErr: any) {
        addLog({ productId, productName: product.name, action: "Image processing", status: "error", details: imgErr.message });
        // Don't fail the whole product if just image failed, maybe we updated MRP
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabaseAdmin.from("products").update(updates).eq("id", productId);
      if (updateErr) throw updateErr;
      
      addLog({ productId, productName: product.name, action: "Update DB", status: "success", details: `Updated ${Object.keys(updates).join(", ")}` });
      state.updatedCount++;
    } else {
      addLog({ productId, productName: product.name, action: "Check", status: "skipped", details: "No valid data to update" });
      state.skippedCount++;
    }

  } catch (error: any) {
    addLog({ productId, productName: product.name, action: "Process", status: "error", details: error.message });
    state.failedCount++;
    
    // Auto retry logic could push it back to pending if needed, but for now just mark failed
    if (config.autoRetry && state.retriesCount < Math.min(100, state.totalProducts * 2)) {
      state.retriesCount++;
      state.pendingIds.push(productId);
      state.failedCount--;
      addLog({ productId, productName: product.name, action: "Auto Retry", status: "skipped", details: "Pushed to end of queue for retry" });
    }
  }
}

async function loop() {
  if (state.status !== "running" || isProcessing) return;
  isProcessing = true;

  try {
    const config = state.config!;
    // Take batch
    const batch = state.pendingIds.splice(0, config.concurrencyLimit);
    if (batch.length === 0) {
      state.status = "stopped";
      saveStateToCloud();
      isProcessing = false;
      return;
    }

    state.currentBatch++;
    state.runningIds = batch;
    saveStateToCloud();

    await Promise.all(batch.map(id => processProduct(id)));

    state.completedCount += batch.length;
    state.runningIds = [];
    
    // Estimate remaining time
    if (state.pendingIds.length > 0) {
      const batchesLeft = Math.ceil(state.pendingIds.length / config.concurrencyLimit);
      state.estimatedRemainingTime = batchesLeft * (config.delayMs / 1000 + 2); // roughly 2 sec processing time + delay
    } else {
      state.estimatedRemainingTime = 0;
    }
    
    saveStateToCloud();

  } catch (err) {
    console.error("Enrichment loop error:", err);
  } finally {
    isProcessing = false;
    if (state.status === "running") {
      loopTimer = setTimeout(loop, state.config?.delayMs || 1000);
    }
  }
}

export const aiEnrichmentService = {
  getState() {
    const mem = process.memoryUsage();
    state.memoryUsage = `${Math.round(mem.rss / 1024 / 1024)} MB (RSS)`;
    return { ...state };
  },

  async start(config: EnrichmentConfig) {
    if (state.status === "running") return;
    
    // If starting fresh (no config or stopped), rebuild queue
    if (state.status === "idle" || state.status === "stopped") {
      state = { ...DEFAULT_STATE, config, status: "running" };
      
      // Build query based on filters
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
    } else {
      // Resuming
      state.config = config;
      state.status = "running";
    }

    saveStateToCloud();
    loop(); // Start loop
  },

  pause() {
    state.status = "paused";
    if (loopTimer) clearTimeout(loopTimer);
    saveStateToCloud();
  },

  resume() {
    if (state.status !== "paused") return;
    state.status = "running";
    saveStateToCloud();
    loop();
  },

  stop() {
    state.status = "stopped";
    if (loopTimer) clearTimeout(loopTimer);
    state.pendingIds = [];
    state.runningIds = [];
    saveStateToCloud();
  },

  retryFailed() {
    // In a full implementation, we'd keep track of failed IDs. 
    // Here we just restart the process for missing items by stopping and relying on the user to click Start again.
    // Or we could query the DB again.
  }
};
