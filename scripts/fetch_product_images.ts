import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX; // Search Engine ID

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
  console.error("Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX in .env");
  console.log("\n--- How to get your Google Custom Search API Key ---");
  console.log("1. Go to Google Cloud Console (https://console.cloud.google.com/)");
  console.log("2. Create a new project or select an existing one.");
  console.log("3. Navigate to APIs & Services > Library.");
  console.log("4. Search for 'Custom Search API' and enable it.");
  console.log("5. Navigate to APIs & Services > Credentials.");
  console.log("6. Click 'Create Credentials' > 'API key'. Copy this key to GOOGLE_SEARCH_API_KEY.");
  console.log("\n--- How to set up Custom Search Engine (CX) ---");
  console.log("1. Go to Programmable Search Engine (https://programmablesearchengine.google.com/controlpanel/all)");
  console.log("2. Click 'Add'.");
  console.log("3. Name it (e.g., 'Medicine Image Search').");
  console.log("4. Under 'Search the entire web', toggle it ON.");
  console.log("5. Under 'Image search', toggle it ON.");
  console.log("6. Click 'Create'.");
  console.log("7. Copy the 'Search engine ID' to GOOGLE_SEARCH_CX in your .env file.");
  process.exit(1);
}

// Initialize Supabase with Service Role Key to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchGoogleImage(query: string): Promise<{ imageUrl: string | null; quotaExceeded: boolean }> {
  const url = `https://customsearch.googleapis.com/customsearch/v1?cx=${GOOGLE_SEARCH_CX}&key=${GOOGLE_SEARCH_API_KEY}&q=${encodeURIComponent(query)}&searchType=image&num=1`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        return { imageUrl: null, quotaExceeded: true };
      }
      console.error(`Google API Error for query "${query}": ${response.status} ${response.statusText}`);
      return { imageUrl: null, quotaExceeded: false };
    }
    const data = await response.json() as any;
    
    if (data.items && data.items.length > 0) {
      return { imageUrl: data.items[0].link, quotaExceeded: false };
    }
    console.log(`No images found for query "${query}"`);
    return { imageUrl: null, quotaExceeded: false };
  } catch (error) {
    console.error(`Error searching image for "${query}":`, error);
    return { imageUrl: null, quotaExceeded: false };
  }
}

async function uploadImageToSupabase(imageUrl: string, fileName: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to download image from ${imageUrl}: ${response.statusText}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(`products/${fileName}`, buffer, {
        contentType: contentType,
        upsert: true,
      });

    if (error) {
      console.error(`Supabase Storage Error for ${fileName}:`, error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(`products/${fileName}`);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Error uploading image to Supabase:`, error);
    return null;
  }
}

async function main() {
  console.log("Starting Product Image Fetching Script...");

  // Fetch products with missing or placeholder image_url
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, company, strength, pack_size, image_url')
    .or('image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%')
    .order('id', { ascending: true }); // Order systematically

  if (error) {
    console.error("Error fetching products:", error.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log("No products found that need image updates. Exiting.");
    return;
  }

  console.log(`Found ${products.length} products that need image updates.`);

  let totalScanned = 0;
  let successfullyUploaded = 0;
  let quotaHit = false;

  for (const product of products) {
    const searchQuery = `${product.name} ${product.strength || ''} tablet medicine ${product.company || ''} Bangladesh box`.replace(/\s+/g, ' ').trim();
    console.log(`\nProcessing: [${product.name}] - Searching Google for: "${searchQuery}"`);

    totalScanned++;
    const { imageUrl: sourceImageUrl, quotaExceeded } = await fetchGoogleImage(searchQuery);

    if (quotaExceeded) {
      console.log("\n⚠️ API quota limit reached for this session. Successfully saved progress and pausing process.");
      quotaHit = true;
      break;
    }

    if (sourceImageUrl) {
      console.log(`Found image: ${sourceImageUrl}`);
      // Create a clean filename
      const ext = sourceImageUrl.split('.').pop()?.split('?')[0].slice(0, 4) || 'jpg';
      const cleanFileName = `${product.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${product.id}.${ext}`;
      
      console.log(`Uploading to Supabase Storage as ${cleanFileName}...`);
      const publicUrl = await uploadImageToSupabase(sourceImageUrl, cleanFileName);
      
      if (publicUrl) {
        console.log(`Successfully uploaded to: ${publicUrl}`);
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: publicUrl })
          .eq('id', product.id);

        if (updateError) {
          console.error(`Error updating product ${product.id} with new image URL:`, updateError.message);
        } else {
          console.log(`Updated product [${product.name}] in database.`);
          successfullyUploaded++;
        }
      }
    }

    // Delay to avoid hitting Google API rate limits (100 free requests/day by default, max 10 queries per second)
    console.log("Waiting 1.5 seconds before next request...");
    await delay(1500);
  }

  console.log("\nCalculating remaining products...");
  const { count, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .or('image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%');

  console.log("\n==================================================");
  console.log("              EXECUTION SUMMARY");
  console.log("==================================================");
  if (quotaHit) {
    console.log("Status: STOPPED (API Quota Limit Reached)");
  } else {
    console.log("Status: COMPLETED");
  }
  console.log(`Total Products Scanned in this run: ${totalScanned}`);
  console.log(`Images Successfully Uploaded: ${successfullyUploaded}`);
  
  if (!countError && count !== null) {
    console.log(`Remaining Products Needing Images: ${count}`);
  } else {
    console.log(`Remaining Products Needing Images: Unknown (Error fetching count)`);
  }
  console.log("==================================================\n");

  if (quotaHit) {
    process.exit(0);
  }
}

main().catch(console.error);
