import 'dotenv/config';
import axios from 'axios';

async function run() {
  const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

  const payload = {
    url: "https://osudpotro.com/napa",
    formats: ["json"],
    jsonOptions: {
      prompt: "Extract the MRP (maximum retail price in BDT) and the main product package image URL",
      schema: {
        type: "object",
        properties: {
          mrp: { type: "number" },
          imageUrl: { type: "string" }
        },
        required: ["mrp"]
      }
    },
    waitFor: 3000
  };

  try {
    const res = await axios.post(`https://api.firecrawl.dev/v1/scrape`, payload, {
      headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` }
    });
    console.log("OSUDPOTRO RESPONSE (V1 with jsonOptions):", JSON.stringify(res.data, null, 2));
  } catch(e: any) {
    console.log("OSUDPOTRO ERROR:", e.response?.data || e.message);
  }

  // Let's also test the exact syntax the user provided for V2 to see if it's the newer schema
  const payloadV2 = {
    url: "https://osudpotro.com/napa",
    formats: [
      "extract" // In v2 it's extract: { ... } or formats: ["extract"] with extract object
    ],
    extract: {
      prompt: "Extract the MRP (maximum retail price in BDT) and the main product package image URL",
      schema: {
        type: "object",
        properties: {
          mrp: { type: "number" },
          imageUrl: { type: "string" }
        },
        required: ["mrp"]
      }
    },
    waitFor: 3000
  };

  try {
    const res2 = await axios.post(`https://api.firecrawl.dev/v1/scrape`, payloadV2, {
      headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` }
    });
    console.log("OSUDPOTRO RESPONSE V1 (extract):", JSON.stringify(res2.data.data.extract, null, 2));
  } catch(e: any) {
    console.log("OSUDPOTRO V1 EXTRACT ERROR:", e.response?.data || e.message);
  }
}

run().catch(console.error);
