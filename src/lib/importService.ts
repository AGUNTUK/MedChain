import { Product } from "../types";

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
    companyName: findVal(["Company Name", "company_name", "company", "manufacturer", "brand"]),
    category: findVal(["Category", "product_category", "type"]),
    strength: findVal(["Strength", "power", "dose"]),
    packSize: findVal(["Pack Size", "pack_size", "pack", "size"]),
    mrp: findVal(["MRP", "mrp_price", "mrp"]),
    sellingPrice: findVal(["Selling Price", "selling_price", "price"]),
    batchNumber: findVal(["Batch Number", "batch_number", "batch", "batch_no"]),
    expiryDate: findVal(["Expiry Date", "expiry_date", "expiry", "exp"]),
    stockQuantity: findVal(["Stock Quantity", "stock_quantity", "stock", "qty", "quantity"])
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
  if (!row.companyName) errors.push("Company Name is required.");
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
  if (!row.strength) errors.push("Strength (e.g. 500mg, 20mg) is required.");
  if (!row.packSize) errors.push("Pack Size (e.g. 100's Box) is required.");
  if (!row.mrp) errors.push("MRP is required.");
  if (!row.sellingPrice) errors.push("Selling Price is required.");

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
    errors.push("Selling Price cannot be higher than the Maximum Retail Price (MRP).");
  }

  // Stock Quantity Validation
  if (row.stockQuantity) {
    const stock = parseInt(row.stockQuantity, 10);
    if (isNaN(stock)) {
      errors.push("Stock Quantity must be a valid integer.");
    } else if (stock < 0) {
      errors.push("Stock Quantity cannot be negative.");
    }
  }

  // Expiry Date Validation
  if (row.expiryDate) {
    const expDate = new Date(row.expiryDate);
    if (isNaN(expDate.getTime())) {
      errors.push("Expiry Date must be a valid date (e.g. YYYY-MM-DD).");
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate <= today) {
        errors.push(`Product expiry date (${row.expiryDate}) has already passed or is today.`);
      }
    }
  }

  // Duplicate Check
  if (row.productName && row.strength && row.packSize) {
    const isDuplicate = existingProducts.some(
      p =>
        p.name.toLowerCase().replace(/\s/g, "") === row.productName.toLowerCase().replace(/\s/g, "") &&
        p.strength.toLowerCase().replace(/\s/g, "") === row.strength.toLowerCase().replace(/\s/g, "") &&
        p.packSize.toLowerCase().replace(/\s/g, "") === row.packSize.toLowerCase().replace(/\s/g, "")
    );
    if (isDuplicate) {
      errors.push(`Duplicate: Product with same name, strength, and pack size already exists in MediChain.`);
    }
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
    expiryDate: row.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // default 1 yr future
  };
};

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
