import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { processPrescriptionOCR } from "../controllers/ocrController.js";

const router = Router();

// Configure multer memory storage with strict limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // Strict 10MB max limit to avoid memory leaks
  }
});

/**
 * Route: POST /api/v1/ocr/process
 * Accepts multipart/form-data with key 'file' or 'image'
 */
router.post(
  "/process",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 }
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    // Normalization middleware: check both 'file' and 'image' inputs and normalize to req.file
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files["file"] && files["file"].length > 0) {
        req.file = files["file"][0];
      } else if (files["image"] && files["image"].length > 0) {
        req.file = files["image"][0];
      }
    }
    next();
  },
  processPrescriptionOCR
);

export default router;
