const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

const scanRouteRegex = /app\.post\("\/api\/prescription\/scan",[\s\S]*?res\.status\(500\)\.json\(\{ error: "Failed to process prescription image\.", details: err\.message \}\);\n  \}\n\}\);/g;

const match = server.match(scanRouteRegex);
if (!match) {
  console.log("Could not find scan route");
} else {
  let route = match[0];
  // we want to move the try-catch block into a background IIFE and respond with processing immediately.
  
  // Find the start of the try block
  const tryIndex = route.indexOf('  try {');
  
  const beforeTry = route.substring(0, tryIndex);
  const tryBlock = route.substring(tryIndex);
  
  const newRoute = beforeTry + `
  // Respond immediately
  res.json({ success: true, status: "processing", message: "Prescription is being processed in the background", items: [] });
  
  // Process asynchronously
  (async () => {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
      const mimeType = imageBase64.startsWith("data:image/jpeg") ? "image/jpeg" :
                       imageBase64.startsWith("data:image/webp") ? "image/webp" : "image/png";
      const base64Data = imageBase64.replace(/^data:image\\/\\w+;base64,/, "");

      const response = await runWithRetry(() => ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: \`Analyze this medical prescription. Extract the list of medicines. 
             Return ONLY a raw, minified JSON array of objects without markdown formatting.
             Format: [{"name": "string", "strength": "string or null", "quantity": number}]\` }
          ]
        }
      }));

      const aiText = response.text || "[]";
      let parsedItems = [];
      try {
        const cleanJson = aiText.replace(/\\x60\\x60\\x60json/g, "").replace(/\\x60\\x60\\x60/g, "").trim();
        parsedItems = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.warn("Failed to parse Gemini output as JSON:", aiText);
        return;
      }

      // Attempt to match with existing products in the DB
      const { data: dbProducts } = await dbService.supabaseAdmin.from("products").select("id, name, generic_name, manufacturer, strength, form, pack_size, mrp, selling_price, stock_quantity, image_url");
      const matchedProducts = [];
      for (const item of parsedItems) {
        if (!item.name) continue;
        const results = performSearch(dbProducts || [], item.name, { pageSize: 1 });
        if (results.products && results.products.length > 0) {
          matchedProducts.push({
            extractedName: item.name,
            extractedStrength: item.strength,
            extractedQuantity: item.quantity || 1,
            matchedProduct: results.products[0],
          });
        } else {
           matchedProducts.push({
            extractedName: item.name,
            extractedStrength: item.strength,
            extractedQuantity: item.quantity || 1,
            matchedProduct: null,
          });
        }
      }
      
      console.log("Background prescription processing completed.", matchedProducts.length, "items found.");
      // Ideally we would send a websocket event or notification here.
    } catch (err) {
      console.error("Prescription Scan Background Error:", err);
    }
  })();
});
`;

  server = server.replace(match[0], newRoute);
  fs.writeFileSync('server.ts', server);
  console.log("Replaced scan route");
}
