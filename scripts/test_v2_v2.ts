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
    const res = await axios.post(`https://api.firecrawl.dev/v2/scrape`, payload, {
      headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` }
    });
    console.log("OSUDPOTRO V2 RESPONSE (formats: [json], jsonOptions):", JSON.stringify(res.data, null, 2));
  } catch(e: any) {
    console.log("OSUDPOTRO V2 ERROR (formats: [json], jsonOptions):", e.response?.data || e.message);
  }
}

run().catch(console.error);
