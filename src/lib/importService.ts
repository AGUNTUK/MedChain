import { Product } from "../types";
import { checkDuplicate } from "./productValidator.js";

export interface RawImportRow {
  productName: string;
  genericName: string;
  companyName: string;
  category: string;
  strength: string;
  packSize: string;
  mrp: string;
  sellingPrice: string;
  batchNumber?: string;
  expiryDate?: string;
  stockQuantity?: string;
  imageUrl?: string;
}

export interface ValidationError {
  row: number;
  productName: string;
  errors: string[];
}

export interface ImportResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: ValidationError[];
  importedProducts: Product[];
}

/**
 * 1. CSV Parser Utility
 * Parses CSV raw string into key-value records based on headers
 */
export function parseCSV(csvContent: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let currentLine = "";
  let insideQuotes = false;

  // Manual character-by-character split to robustly support quotes and multi-line CSVs
  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = "";
      // Handle CRLF newlines
      if (char === "\r" && csvContent[i + 1] === "\n") {
        i++;
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header line
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(h => h.trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] !== undefined ? values[index].trim() : "";
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Check for double quotes inside quotes (escaped)
      if (insideQuotes && line[i + 1] === '"') {
        currentValue += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(currentValue);
      currentValue = "";
    } else {
      currentValue += char;
    }
  }
  result.push(currentValue);
  return result;
}

/**
 * Normalizes user-facing header labels into system parameter names
 */
export function mapRowToFields(row: Record<string, string>): RawImportRow {
  const findVal = (keys: string[]): string => {
    for (const k of keys) {
      // Look for case-insensitive match, stripping spaces and underscores
      const normalizedK = k.toLowerCase().replace(/[\s_-]/g, "");
      const foundKey = Object.keys(row).find(
        key => key.toLowerCase().replace(/[\s_-]/g, "") === normalizedK
      );
      if (foundKey) {
        return row[foundKey];
      }
    }
    return "";
  };

  return {
    productName: findVal(["Product Name", "product_name", "product", "name"]),
    genericName: findVal(["Generic Name", "generic_name", "generic", "formula"]),
    companyName: findVal(["Company", "Company Name", "company_name", "company", "manufacturer", "brand"]),
    category: findVal(["Category", "product_category", "type"]),
    strength: findVal(["Strength", "power", "dose"]),
    packSize: findVal(["Pack Size", "pack_size", "pack", "size"]),
    mrp: findVal(["MRP", "mrp_price", "mrp"]),
    sellingPrice: findVal(["Selling Price", "selling_price", "price"]),
    batchNumber: findVal(["Batch Number", "batch_number", "batch", "batch_no"]),
    expiryDate: findVal(["Expiry Date", "expiry_date", "expiry", "exp"]),
    stockQuantity: findVal(["Stock", "Stock Quantity", "stock_quantity", "stock", "qty", "quantity"]),
    imageUrl: findVal(["Image URL", "image_url", "image", "img_url", "url", "imageUrl"])
  };
}

/**
 * 2. Validation Utility
 * Validates a normalized import row against our robust healthcare schema rules
 */
export function validateImportRow(
  row: RawImportRow,
  rowIndex: number,
  existingProducts: any[]
): string[] {
  const errors: string[] = [];

  // Required Field Checks
  if (!row.productName) errors.push("Product Name is required.");
  if (!row.genericName) errors.push("Generic Name is required.");
  if (!row.companyName) errors.push("Company is required.");
  if (!row.category) {
    errors.push("Category is required.");
  } else {
    const validCategories = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Supplement"];
    const match = validCategories.find(c => c.toLowerCase() === row.category.trim().toLowerCase());
    if (!match) {
      errors.push(`Invalid Category: "${row.category}". Must be one of: ${validCategories.join(", ")}`);
    } else {
      row.category = match;
    }
  }
  if (!row.strength) errors.push("Strength is required.");
  if (!row.packSize) errors.push("Pack Size is required.");
  if (!row.mrp) errors.push("MRP is required.");
  if (!row.sellingPrice) errors.push("Selling Price is required.");
  if (!row.batchNumber) errors.push("Batch Number is required.");

  // Numeric and Logical Pricing Validation
  const mrpValue = parseFloat(row.mrp);
  const sellingPriceValue = parseFloat(row.sellingPrice);

  if (row.mrp && isNaN(mrpValue)) {
    errors.push("MRP must be a valid number.");
  } else if (mrpValue <= 0) {
    errors.push("MRP must be a positive number greater than 0.");
  }

  if (row.sellingPrice && isNaN(sellingPriceValue)) {
    errors.push("Selling Price must be a valid number.");
  } else if (sellingPriceValue <= 0) {
    errors.push("Selling Price must be a positive number greater than 0.");
  }

  if (!isNaN(mrpValue) && !isNaN(sellingPriceValue) && mrpValue < sellingPriceValue) {
    errors.push("MRP must be greater than or equal to Selling Price.");
  }

  // Stock Validation
  if (row.stockQuantity) {
    const stock = parseInt(row.stockQuantity, 10);
    if (isNaN(stock)) {
      errors.push("Stock must be a valid integer.");
    } else if (stock < 0) {
      errors.push("Stock cannot be negative.");
    }
  } else {
    errors.push("Stock is required.");
  }

  // Expiry Date Validation
  if (row.expiryDate) {
    const isFormatValid = /^\d{4}-\d{2}-\d{2}$/.test(row.expiryDate);
    if (!isFormatValid) {
      errors.push("Expiry Date must be in YYYY-MM-DD format.");
    } else {
      const expDate = new Date(row.expiryDate);
      if (isNaN(expDate.getTime())) {
        errors.push("Expiry Date must be a valid date.");
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate <= today) {
          errors.push(`Product expiry date (${row.expiryDate}) has already passed or is today.`);
        }
      }
    }
  } else {
    errors.push("Expiry Date is required.");
  }

  // Duplicate Check
  const isDuplicate = checkDuplicate(existingProducts, {
    company: row.companyName,
    name: row.productName,
    genericName: row.genericName,
    strength: row.strength,
    packSize: row.packSize
  });

  if (isDuplicate) {
    errors.push(`Duplicate: Product with same company, name, generic name, strength, and pack size already exists.`);
  }

  return errors;
}

/**
 * 3. Product Mapping Utility
 * Converts a validated raw row into a production-ready Product record
 */
export function mapToProduct(row: RawImportRow, nextId: string): Product {
  const mrpValue = parseFloat(row.mrp);
  const sellingPriceValue = parseFloat(row.sellingPrice);
  const discountPercent = Math.max(0, Math.round(((mrpValue - sellingPriceValue) / mrpValue) * 100));
  const qty = row.stockQuantity ? parseInt(row.stockQuantity, 10) : 1000; // Default high wholesale initial stock

  return {
    id: nextId,
    name: row.productName,
    genericName: row.genericName,
    company: row.companyName,
    category: row.category as "Tablet" | "Capsule" | "Syrup" | "Injection" | "Cream" | "Supplement",
    strength: row.strength,
    packSize: row.packSize,
    mrp: mrpValue,
    sellingPrice: sellingPriceValue,
    discountPercentage: discountPercent,
    availableStock: qty,
    reservedStock: 0,
    soldStock: 0,
    batchNumber: row.batchNumber || `B-IMP${Math.floor(100 + Math.random() * 900)}`,
    expiryDate: row.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // default 1 yr future
    imageUrl: row.imageUrl || "",
    image_url: row.imageUrl || ""
  };
}

/**
 * 4. Orchestrator Service
 * Runs validation, formats results, updates db, handles rollback/tracking
 */
export function importBulkCatalog(csvContent: string, currentCatalog: any[]): ImportResult {
  const { rows } = parseCSV(csvContent);
  const errors: ValidationError[] = [];
  const importedProducts: Product[] = [];
  
  let nextIdCounter = currentCatalog.reduce((max, p) => {
    const idNum = parseInt(p.id.replace("prod_", ""), 10);
    return isNaN(idNum) ? max : Math.max(max, idNum);
  }, 0) + 1;

  rows.forEach((row, idx) => {
    const rowIndex = idx + 2; // +1 for 0-index offset, +1 for header line
    const mappedRow = mapRowToFields(row);
    
    // Validate
    const rowErrors = validateImportRow(mappedRow, rowIndex, [...currentCatalog, ...importedProducts]);
    
    if (rowErrors.length > 0) {
      errors.push({
        row: rowIndex,
        productName: mappedRow.productName || `Row ${rowIndex}`,
        errors: rowErrors
      });
    } else {
      const pId = `prod_${nextIdCounter++}`;
      const product = mapToProduct(mappedRow, pId);
      importedProducts.push(product);
    }
  });

  return {
    totalProcessed: rows.length,
    successCount: importedProducts.length,
    failureCount: errors.length,
    errors,
    importedProducts
  };
}
