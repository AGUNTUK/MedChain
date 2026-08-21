import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import xss from "xss";
import { rateLimit } from "express-rate-limit";

// Rate Limiters
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Too many attempts from this IP, please try again after 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many order submissions. Please try again after 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Zod Schemas
export const schemas = {
  signup: z.object({
    email: z.string().email("Invalid email format."),
    password: z.string().min(8, "Password must be at least 8 characters long."),
    name: z.string().min(2, "Name must be at least 2 characters long."),
    role: z.string().optional(),
  }),
  login: z.object({
    email: z.string().email("Invalid email format."),
    password: z.string().min(1, "Password is required."),
  }),
  pharmacyProfile: z.object({
    pharmacyName: z.string().min(2, "Pharmacy Name is required."),
    ownerName: z.string().min(2, "Owner Name is required."),
    phone: z.string().regex(/^(?:\+88|88)?01[3-9]\d{8}$/, "Invalid phone number. Must be a valid 11-digit BD number."),
    address: z.string().min(5, "Address must be at least 5 characters long."),
    licenseNo: z.string().min(4, "Drug License Number is required."),
    nidNumber: z.string().min(10, "National ID number must be at least 10 characters long."),
    tradeLicenseUrl: z.string().optional(),
    nidUrl: z.string().optional(),
  }),
  orderCreate: z.object({
    paymentMethod: z.string().min(1, "Payment method is required."),
    notes: z.string().optional(),
    deliveryAddress: z.string().min(5, "Delivery address is required."),
    paymentStatus: z.string().optional(),
    transactionId: z.string().optional(),
  }),
  adminProduct: z.object({
    name: z.string().min(2, "Product name is required."),
    genericName: z.string().min(2, "Generic name is required."),
    company: z.string().min(2, "Company is required."),
    category: z.string().min(2, "Category is required."),
    strength: z.string().optional(),
    packSize: z.string().optional(),
    mrp: z.number().positive("MRP must be a positive number.").or(z.string().regex(/^\d+(\.\d+)?$/).transform(Number).refine(n => n > 0, "MRP must be a positive number")),
    sellingPrice: z.number().positive("Selling Price must be a positive number.").or(z.string().regex(/^\d+(\.\d+)?$/).transform(Number).refine(n => n > 0, "Selling Price must be a positive number")),
    availableStock: z.number().min(0, "Stock cannot be negative.").or(z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 0, "Stock cannot be negative")),
    batchNumber: z.string().min(1, "Batch number is required."),
    expiryDate: z.string().min(4, "Expiry date is required."),
    imageUrl: z.string().optional(),
  }).refine((data) => data.mrp >= data.sellingPrice, {
    message: "MRP must be greater than or equal to the wholesale Selling Price.",
    path: ["mrp"],
  }),
};

// Validation Middleware
export const validateBody = (schema: z.ZodType<any>) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      (error as any).errors.forEach((err: any) => {
        if (err.path.length > 0) {
          fieldErrors[err.path[0]] = err.message;
        } else {
          fieldErrors["_general"] = err.message;
        }
      });
      return res.status(400).json({ error: "Validation failed", fields: fieldErrors });
    }
    return res.status(400).json({ error: "Invalid request payload" });
  }
};

// Sanitization Function
const sanitizeValue = (value: any): any => {
  if (typeof value === "string") {
    // Trim whitespace and sanitize HTML tags
    return xss(value.trim());
  } else if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  } else if (value !== null && typeof value === "object") {
    const sanitizedObj: any = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitizedObj[key] = sanitizeValue(value[key]);
      }
    }
    return sanitizedObj;
  }
  return value;
};

// Sanitization Middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
};
