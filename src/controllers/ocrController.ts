import { Request, Response } from "express";
import { OcrExtractionService } from "../services/OcrExtractionService.js";
import { OpenRouterService } from "../services/OpenRouterService.js";
import * as dbService from "../lib/dbService.js";

/**
 * Endpoint Orchestrator Controller for Hybrid Multi-Stage Pharmacy OCR
 * POST /api/v1/ocr/process
 */
export async function processPrescriptionOCR(req: Request, res: Response) {
  try {
    // 1. Strict validation of image upload file
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required file parameter. Please attach an image file using the key 'file' or 'image'." 
      });
    }

    const { buffer, originalname, mimetype } = req.file;

    // Validate MIME types to avoid processing unsafe documents
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedMimeTypes.includes(mimetype)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file type: '${mimetype}'. Only JPEG, PNG, and WEBP images are supported.`
      });
    }

    console.log(`[OCR pipeline Orchestrator] Starting parsing workflow for file: ${originalname} (${(buffer.length / 1024).toFixed(2)} KB)`);

    let rawText = "";
    let structuredResult = { medicines: [] as any[] };

    // --- STAGE 1: Raw Text Extraction via Local Tesseract OCR with Gemini Fallback ---
    try {
      const ocrResult = await OcrExtractionService.extractText(buffer, originalname, mimetype);
      rawText = ocrResult.raw_text;
      } catch (ocrErr: any) {
        console.warn("[OCR Orchestrator] Stage 1 (Local Tesseract) failed, trying Gemini API fallback:", ocrErr.message || ocrErr);
        if (process.env.GEMINI_API_KEY) {
          try {
            const { GoogleGenAI } = await import("@google/genai");
            const aiClient = new GoogleGenAI({
              apiKey: process.env.GEMINI_API_KEY,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } }
            });
            const cleanBase64 = buffer.toString("base64");
            const response = await aiClient.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [
                { inlineData: { mimeType: mimetype, data: cleanBase64 } },
                { text: "Extract all text from this medical prescription or list of medicines. Return only the plain text found in the image." }
              ]
            });
            rawText = response.text || "";
            console.log("[OCR Orchestrator] Gemini fallback successfully extracted raw text.");
          } catch (geminiErr: any) {
            console.error("[OCR Orchestrator] Gemini fallback also failed:", geminiErr.message || geminiErr);
            return res.status(502).json({
              success: false,
              error: "Stage 1 (Raw Text Extraction) failed.",
              details: `Local Tesseract OCR failed and Gemini fallback failed: ${geminiErr.message}`
            });
          }
        } else {
          return res.status(502).json({
            success: false,
            error: "Stage 1 (Raw Text Extraction) failed.",
            details: "Local Tesseract OCR failed and no Gemini fallback API key is configured."
          });
        }
      }

      if (!rawText || rawText.trim().length === 0) {
        return res.status(422).json({
          success: false,
          error: "No readable pharmaceutical text could be extracted from the uploaded image. Please ensure the prescription is well-lit and clear."
        });
      }

      console.log(`[OCR Orchestrator] Stage 1 success. Extracted text preview:\n${rawText.slice(0, 300)}...`);

      // --- STAGE 2: Clinical Data Structuring via Qwen 2.5 on OpenRouter with Gemini Fallback ---
      try {
        structuredResult = await OpenRouterService.structureText(rawText);
      } catch (llmErr: any) {
        console.warn("[OCR Orchestrator] Stage 2 (OpenRouter) failed, trying Gemini structuring fallback:", llmErr.message || llmErr);
        if (process.env.GEMINI_API_KEY) {
          try {
            const { GoogleGenAI, Type } = await import("@google/genai");
            const aiClient = new GoogleGenAI({
              apiKey: process.env.GEMINI_API_KEY,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } }
            });
            const response = await aiClient.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [
                { text: `Parse this raw medical text into a list of medicines with brand_name, generic_name, strength, quantity, and dosage_form.\n\nRaw text:\n${rawText}` }
              ],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    medicines: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          brand_name: { type: Type.STRING },
                          generic_name: { type: Type.STRING },
                          strength: { type: Type.STRING },
                          quantity: { type: Type.INTEGER },
                          dosage_form: { type: Type.STRING }
                        },
                        required: ["brand_name"]
                      }
                    }
                  }
                }
              }
            });
            structuredResult = JSON.parse(response.text || '{"medicines":[]}');
            console.log("[OCR Orchestrator] Gemini Stage 2 fallback successfully structured text.");
          } catch (geminiLlmErr: any) {
            console.error("[OCR Orchestrator] Gemini Stage 2 fallback also failed:", geminiLlmErr.message || geminiLlmErr);
            return res.status(502).json({
              success: false,
              error: "Stage 2 (Clinical Data Structuring) failed.",
              details: `OpenRouter is offline and Gemini fallback failed: ${geminiLlmErr.message}`
            });
          }
        } else {
          return res.status(502).json({
            success: false,
            error: "Stage 2 (Clinical Data Structuring) failed.",
            details: "OpenRouter structuring API is offline and no Gemini fallback API key is configured."
          });
        }
      }

    if (!structuredResult.medicines || structuredResult.medicines.length === 0) {
      return res.json({
        success: true,
        raw_text: rawText,
        medicines: [],
        message: "OCR processing completed, but no clinical medicines were structured."
      });
    }

    console.log(`[OCR Orchestrator] Stage 2 success. Extracted ${structuredResult.medicines.length} medicines.`);

    // --- STAGE 3: Real Catalog B2B Database Matching ---
    const matchedMedicines = [];
    
    for (const med of structuredResult.medicines) {
      let matchedProduct = null;
      let matchConfidence = 0.0;

      if (med.brand_name || med.generic_name) {
        const queryTerm = med.brand_name || med.generic_name;
        try {
          const { data: matchedProds } = await dbService.supabaseAdmin.from("products")
            .select("*")
            .or(`name.ilike.%${queryTerm}%,generic_name.ilike.%${queryTerm}%`)
            .limit(1);

          if (matchedProds && matchedProds.length > 0) {
            const rawProd = matchedProds[0];
            const fullProd = await dbService.getProductById(rawProd.id);
            if (fullProd) {
              matchedProduct = fullProd;
              matchConfidence = 0.95;
            }
          }
        } catch (dbErr) {
          console.warn("[OCR Orchestrator Warning] DB lookup failed for", queryTerm, dbErr);
        }
      }

      matchedMedicines.push({
        brand_name: med.brand_name,
        generic_name: med.generic_name,
        strength: med.strength,
        quantity: med.quantity,
        dosage_form: med.dosage_form,
        matchedProduct: matchedProduct ? {
          id: matchedProduct.id,
          name: matchedProduct.name,
          genericName: matchedProduct.genericName,
          strength: matchedProduct.strength,
          mrp: matchedProduct.mrp,
          sellingPrice: matchedProduct.sellingPrice,
          availableStock: matchedProduct.availableStock,
          category: matchedProduct.category,
          imageUrl: matchedProduct.imageUrl || matchedProduct.image_url
        } : null,
        matchConfidence: matchConfidence
      });
    }

    // 4. Return integrated multi-stage results
    return res.json({
      success: true,
      raw_text: rawText,
      medicines: matchedMedicines
    });

  } catch (err: any) {
    console.error("[OCR Orchestrator] Critical unhandled failure:", err);
    return res.status(500).json({
      success: false,
      error: "A critical error occurred inside the OCR processing gateway.",
      details: err.message || err
    });
  }
}
