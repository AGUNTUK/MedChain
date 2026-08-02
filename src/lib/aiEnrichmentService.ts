import axios from "axios";
import { supabaseAdmin } from "./supabaseAdmin.js";

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
  const fullLog = { ...log, timestamp: new Date().toISOString() };
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

const OPENROUTER_MODELS = [
  "qwen/qwen3-30b-a3b:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free"
];

async function callOpenRouter(
  state: EnrichmentState,
  prompt: string,
  retries = 0
): Promise<{ content: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set in the environment. Add it in Render > Environment, then redeploy."
    );
  }

  const model = OPENROUTER_MODELS[Math.min(retries, OPENROUTER_MODELS.length - 1)];
  state.currentAiModel = model;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      { model, messages: [{ role: "user", content: prompt }], temperature: 0.1 },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.APP_URL || "https://medichain.com",
          "X-Title": "MediChain Enrichment"
        },
        timeout: 30000
      }
    );

    const choice = response.data?.choices?.[0];
    if (!choice) throw new Error("Invalid response shape from OpenRouter");
    return { content: choice.message.content, model };
  } catch (error: any) {
    const status = error.response?.status;
    if ((status === 429 || status === 503 || status === 404) && retries < OPENROUTER_MODELS.length - 1) {
      console.warn(`OpenRouter model ${model} unavailable (HTTP ${status}), falling back to next free model...`);
      return callOpenRouter(state, prompt, retries + 1);
    }
    throw error;
  }
}

async function searchWeb(query: string) {
  const cx = process.env.GOOGLE_SEARCH_CX;
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  if (!cx || !key) return null;

  try {
    const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: { key, cx, q: query, num: 3 },
      timeout: 10000
    });
    return res.data.items || [];
  } catch (e) {
    console.error("Google Custom Search error:", e);
    return null;
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

    let searchContext = "";
    let searchImages: string[] = [];
    const query = `${product.name} ${product.generic_name || ""} ${product.strength || ""} ${product.company || ""} medicine price Bangladesh`;
    
    const searchResults = await searchWeb(query);

    if (searchResults) {
      searchContext = searchResults.map((item: any) => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`).join("\n\n");
      if (needsImage) {
        try {
          const imgRes = await axios.get("https://www.googleapis.com/customsearch/v1", {
            params: {
              key: process.env.GOOGLE_SEARCH_API_KEY,
              cx: process.env.GOOGLE_SEARCH_CX,
              q: query,
              searchType: "image",
              num: 3
            },
            timeout: 10000
          });
          if (imgRes.data.items) searchImages = imgRes.data.items.map((img: any) => img.link);
        } catch {
          /* image search is best-effort */
        }
      }
    }

    if (config.dryRun) {
      addLog(state, {
        productId,
        productName: product.name,
        action: "Dry Run",
        status: "success",
        details: `Would enrich (MRP: ${needsMrp}, Image: ${needsImage})`
      });
      state.updatedCount++;
      return;
    }

    const prompt = `You are a pharmaceutical data enrichment AI focused on the Bangladesh market.

Target Product:
Name: ${product.name}
Generic: ${product.generic_name || "N/A"}
Manufacturer: ${product.company || "N/A"}
Strength: ${product.strength || "N/A"}
Pack Size: ${product.pack_size || "N/A"}
Goal:
Extract the current Maximum Retail Price (MRP) in BDT if possible.
Select the best product package image URL from the candidates.
${
  searchContext
    ? `Search Context:\n${searchContext}\n`
    : "No web search context is available for this request — use your own general knowledge of Bangladeshi pharmaceutical products and typical pricing, and lower your confidence score if you are not certain.\n"
}
Candidate Image URLs:
${searchImages.join("\n") || "None found."}
Respond ONLY with valid JSON in this exact structure, with no markdown code fences:
{"mrp": number or null, "imageUrl": string or null, "confidenceScore": number (0 to 100), "reasoning": "brief explanation"}`;

    const aiRes = await callOpenRouter(state, prompt);

    let extracted: any;
    try {
      const jsonStr = aiRes.content.replace(/```json/g, "").replace(/```/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch {
      addLog(state, {
        productId,
        productName: product.name,
        action: "AI Parse",
        status: "error",
        details: `Failed to parse JSON from ${aiRes.model}`
      });
      state.failedCount++;
      return;
    }

    const CONFIDENCE_THRESHOLD = 70;
    if (typeof extracted.confidenceScore !== "number" || extracted.confidenceScore < CONFIDENCE_THRESHOLD) {
      addLog(state, {
        productId,
        productName: product.name,
        action: "Enrichment",
        status: "needs_review",
        details: `Low confidence (${extracted.confidenceScore ?? "?"}%) from ${aiRes.model}`
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
        details: `Updated ${Object.keys(updates).join(", ")} via ${aiRes.model}`
      });
      state.updatedCount++;
    } else {
      addLog(state, { productId, productName: product.name, action: "Check", status: "skipped", details: "No valid data to update" });
      state.skippedCount++;
    }

  } catch (error: any) {
    addLog(state, { productId, productName: product.name, action: "Process", status: "error", details: error.message });
    state.failedCount++;

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
    if (elapsed >= 0 && elapsed < TICK_LOCK_MS) {
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
    return loadState();
  },

  tick: processOneBatch
};
