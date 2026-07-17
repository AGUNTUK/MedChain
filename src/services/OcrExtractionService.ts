import { createWorker } from "tesseract.js";

export interface OCRLine {
  text: string;
  confidence: number;
}

export interface OCRResponse {
  success: boolean;
  filename: string;
  raw_text: string;
  lines: OCRLine[];
}

export class OcrExtractionService {
  /**
   * Processes an uploaded image buffer directly inside Node.js via Tesseract.js.
   * Runs natively on Render without external server-side Python dependencies.
   * 
   * @param imageBuffer Raw image data buffer.
   * @param filename Client-side original filename.
   * @param mimeType Client-side file mime-type.
   */
  public static async extractText(imageBuffer: Buffer, filename: string, mimeType: string): Promise<OCRResponse> {
    let worker;
    try {
      console.log(`[OcrExtractionService] Initializing Tesseract worker for: ${filename}`);
      
      // Initialize Tesseract.js worker
      worker = await createWorker("eng");

      console.log(`[OcrExtractionService] Running Tesseract OCR recognition...`);
      // Run recognition directly on the image buffer
      const { data } = await worker.recognize(imageBuffer);

      const rawText = data.text || "";
      const lines: OCRLine[] = (data.lines || []).map((line: any) => ({
        text: (line.text || "").trim(),
        confidence: line.confidence || 0
      })).filter(l => l.text.length > 0);

      console.log(`[OcrExtractionService] OCR extraction complete. Found ${lines.length} lines.`);

      return {
        success: true,
        filename,
        raw_text: rawText,
        lines
      };
    } catch (error: any) {
      console.error("[OcrExtractionService] Tesseract.js extraction failure:", error.message || error);
      throw new Error(`Local Tesseract OCR extraction failed: ${error.message || error}`);
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (termErr: any) {
          console.warn("[OcrExtractionService] Failed to terminate worker cleanly:", termErr.message || termErr);
        }
      }
    }
  }
}
