import axios from "axios";

export interface OCRStructuredMedicine {
  brand_name: string | null;
  generic_name: string | null;
  strength: string | null;
  quantity: string | number | null;
  dosage_form: string | null;
}

export interface StructuredOCRResponse {
  medicines: OCRStructuredMedicine[];
}

export class OpenRouterService {
  private static apiKey = process.env.OPENROUTER_API_KEY;
  private static model = "qwen/qwen-2.5-7b-instruct";
  private static apiUrl = "https://openrouter.ai/api/v1/chat/completions";

  /**
   * Structures a raw unstructured OCR string into a formal schema-conforming JSON object using Qwen2.5-7B via OpenRouter.
   * @param rawText OCR-extracted text blocks.
   */
  public static async structureText(rawText: string): Promise<StructuredOCRResponse> {
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not configured on the server.");
    }

    const systemPrompt = `You are an expert pharmaceutical auditor and senior catalog parsing agent for the MediChain B2B wholesale platform. 
Your task is to take messy, unstructured OCR text extracted from handwritten prescriptions or purchase order lists and cleanly structure it.

Return a single JSON object containing a "medicines" array strictly adhering to the following structure:
{
  "medicines": [
    {
      "brand_name": "string or null (e.g., Napa, Sergel, Seclo, Fexo)",
      "generic_name": "string or null (e.g., Paracetamol, Esomeprazole, Omeprazole, Fexofenadine)",
      "strength": "string or null (e.g., 500mg, 20mg, 120mg, 5ml)",
      "quantity": "integer, string, or null (e.g., 10, 20, '5 boxes', '30 tabs')",
      "dosage_form": "string or null (e.g., Tablet, Capsule, Syrup, Injection, Ointment, Suspension)"
    }
  ]
}

Guidelines:
1. Ignore general non-medicine handwriting artifacts, page headers, dates, patient names, and doctor signature scribbles.
2. Carefully group corresponding brand/generic names, strengths, quantities, and dosage forms.
3. Correct minor typographical spelling errors inherent to raw OCR (e.g., "Npa" -> "Napa", "Srgll" -> "Sergel").
4. If any detail is missing, set its key to null.
5. Provide ONLY the final JSON object. Do NOT wrap it in any comments, notes, markdown formatting, or introductory texts. Enforce strict JSON output structure.`;

    const userPrompt = `Raw OCR Input Text:\n"""\n${rawText}\n"""`;

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 1500
        },
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://medichain.com",
            "X-Title": "MediChain B2B platform"
          },
          timeout: 45000 // 45-second timeout
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenRouter response did not return content in choice message.");
      }

      return this.parseDefensiveJson(content);
    } catch (error: any) {
      console.error("OpenRouterService API failure:", error.response?.data || error.message || error);
      throw new Error(`OpenRouter schema structuring failed: ${error.message || (error.response?.data?.error?.message || error)}`);
    }
  }

  /**
   * Defensive parser designed to successfully extract the structured JSON object despite potential LLM leakage or block wrappers.
   */
  private static parseDefensiveJson(rawText: string): StructuredOCRResponse {
    let cleaned = rawText.trim();

    // Strip markdown JSON block wrappers if present (defensive)
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    cleaned = cleaned.trim();

    try {
      const parsed = JSON.parse(cleaned);
      
      // Standard Case: perfect matching response
      if (parsed && Array.isArray(parsed.medicines)) {
        return parsed as StructuredOCRResponse;
      }

      // Case 2: Direct array response
      if (Array.isArray(parsed)) {
        return { medicines: parsed };
      }

      // Case 3: Key misnaming fallback (look for any nested array)
      if (parsed && typeof parsed === "object") {
        for (const key of Object.keys(parsed)) {
          if (Array.isArray(parsed[key])) {
            return { medicines: parsed[key] };
          }
        }
      }

      throw new Error("Parsed JSON content lacks a valid medicines array structure.");
    } catch (e: any) {
      console.error("Defensive JSON Parser hit error. Raw Text was:", rawText);
      throw new Error(`Failed to parse Qwen LLM JSON output: ${e.message}`);
    }
  }
}
