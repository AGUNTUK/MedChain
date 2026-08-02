import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.11.0";

const OPENROUTER_MODELS = [
  "qwen/qwen-2.5-72b-instruct:free",
  "qwen/qwen3-30b-a3b:free",
  "openrouter/free"
];

async function callOpenRouter(prompt: string, retries = 0): Promise<{ content: string, model: string }> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not found");
  
  const model = OPENROUTER_MODELS[Math.min(retries, OPENROUTER_MODELS.length - 1)];
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": Deno.env.get("APP_URL") || "https://medichain.com",
        "X-Title": "MediChain Enrichment Worker"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      if (response.status === 429 && retries < OPENROUTER_MODELS.length - 1) {
        console.warn(`Rate limited on ${model}, trying next...`);
        return callOpenRouter(prompt, retries + 1);
      }
      throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.choices && data.choices[0]) {
      return { content: data.choices[0].message.content, model };
    }
    throw new Error("Invalid response from OpenRouter");
  } catch (error) {
    throw error;
  }
}

async function searchWeb(query: string) {
  const cx = Deno.env.get("GOOGLE_SEARCH_CX");
  const key = Deno.env.get("GOOGLE_SEARCH_API_KEY");
  if (!cx || !key) return null;
  
  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", key);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "3");

    const res = await fetch(url.toString());
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error("Google Custom Search error:", e);
    return null;
  }
}

async function searchWebImages(query: string) {
  const cx = Deno.env.get("GOOGLE_SEARCH_CX");
  const key = Deno.env.get("GOOGLE_SEARCH_API_KEY");
  if (!cx || !key) return [];
  
  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", key);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("searchType", "image");
    url.searchParams.set("num", "3");

    const res = await fetch(url.toString());
    const data = await res.json();
    return data.items ? data.items.map((img: any) => img.link) : [];
  } catch (e) {
    console.error("Google Image Search error:", e);
    return [];
  }
}

serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  // Verify auth header if provided, but typically this is called via webhook/cron
  // We'll use service role for Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { batchSize = 5 } = await req.json().catch(() => ({}));

    // Fetch pending jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('ai_enrichment_jobs')
      .select('id, product_id, retries, products(*)')
      .in('status', ['pending', 'failed'])
      .lt('retries', 3)
      .limit(batchSize);

    if (fetchError) throw fetchError;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No pending jobs found" }), { status: 200 });
    }

    const results = [];

    // Process jobs
    for (const job of jobs) {
      const product = job.products;
      if (!product) {
        await supabase.from('ai_enrichment_jobs').update({ status: 'failed', error_message: 'Product not found' }).eq('id', job.id);
        continue;
      }
      
      try {
        // Mark as processing
        await supabase.from('ai_enrichment_jobs').update({ status: 'processing' }).eq('id', job.id);

        const needsMrp = !product.mrp || product.mrp === 0;
        const needsImage = !product.image_url;

        if (!needsMrp && !needsImage) {
          await supabase.from('ai_enrichment_jobs').update({ status: 'skipped', error_message: 'Already enriched' }).eq('id', job.id);
          results.push({ id: job.id, status: 'skipped' });
          continue;
        }

        const query = `${product.name} ${product.generic_name || ""} ${product.strength || ""} ${product.company || ""} medicine`;
        
        let searchContext = "";
        let searchImages: string[] = [];

        const searchResults = await searchWeb(query);
        if (searchResults) {
          searchContext = searchResults.map((item: any) => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`).join("\n\n");
          if (needsImage) {
            searchImages = await searchWebImages(query);
          }
        }

        const prompt = `You are a highly accurate pharmaceutical data enrichment AI.
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
          const jsonStr = aiRes.content.replace(/```json/g, "").replace(/```/g, "").trim();
          extracted = JSON.parse(jsonStr);
        } catch (e) {
          throw new Error("Failed to parse AI JSON response: " + aiRes.content);
        }

        if (extracted.confidenceScore < 85) {
           await supabase.from('ai_enrichment_jobs').update({ 
             status: 'needs_review', 
             enrichment_data: extracted,
             error_message: `Low confidence (${extracted.confidenceScore}%)` 
           }).eq('id', job.id);
           results.push({ id: job.id, status: 'needs_review' });
           continue;
        }

        const updates: any = {};
        if (needsMrp && typeof extracted.mrp === "number" && extracted.mrp > 0) {
          updates.mrp = extracted.mrp;
          if (!product.selling_price || product.selling_price === 0) {
            updates.selling_price = extracted.mrp;
          }
        }

        if (needsImage && extracted.imageUrl && extracted.imageUrl.startsWith("http")) {
           try {
              const imgRes = await fetch(extracted.imageUrl);
              if (!imgRes.ok) throw new Error("Image download failed");
              
              const buffer = await imgRes.arrayBuffer();
              const ext = extracted.imageUrl.split(".").pop()?.split("?")[0] || "jpg";
              const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
              const filePath = `products/enriched_${cleanName}_${Date.now()}.${ext}`;
              
              const { error: uploadErr } = await supabase.storage
                .from("product-images")
                .upload(filePath, buffer, { contentType: imgRes.headers.get("content-type") || `image/${ext}`, upsert: true });
              
              if (!uploadErr) {
                 const { data: pubUrl } = supabase.storage.from("product-images").getPublicUrl(filePath);
                 updates.image_url = pubUrl.publicUrl;
              }
           } catch (imgErr: any) {
              console.warn("Failed to process image:", imgErr);
           }
        }

        if (Object.keys(updates).length > 0) {
           const { error: updateErr } = await supabase.from('products').update(updates).eq('id', product.id);
           if (updateErr) throw updateErr;
           
           await supabase.from('ai_enrichment_jobs').update({ 
             status: 'completed', 
             enrichment_data: extracted 
           }).eq('id', job.id);
           results.push({ id: job.id, status: 'completed' });
        } else {
           await supabase.from('ai_enrichment_jobs').update({ 
             status: 'skipped', 
             error_message: 'No valid data to update' 
           }).eq('id', job.id);
           results.push({ id: job.id, status: 'skipped' });
        }

      } catch (err: any) {
         console.error(`Job ${job.id} failed:`, err);
         await supabase.from('ai_enrichment_jobs').update({ 
             status: 'failed', 
             retries: job.retries + 1,
             error_message: err.message 
         }).eq('id', job.id);
         results.push({ id: job.id, status: 'failed', error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: jobs.length, results }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
