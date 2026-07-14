
import { Product } from "../types";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateProduct(productData: any): ValidationResult {
  if (!productData.name || !productData.genericName || !productData.company || !productData.category || !productData.strength || !productData.packSize) {
    return { isValid: false, error: "Missing required product fields (name, genericName, company, category, strength, packSize)." };
  }
  
  const mrpValue = parseFloat(productData.mrp) || 0;
  const sellingPriceValue = parseFloat(productData.sellingPrice) || 0;

  if (mrpValue <= 0) return { isValid: false, error: "MRP must be greater than 0." };
  if (sellingPriceValue <= 0) return { isValid: false, error: "Selling Price must be greater than 0." };
  if (sellingPriceValue > mrpValue) return { isValid: false, error: "Selling Price cannot be greater than MRP." };

  return { isValid: true };
}

export function checkDuplicate(products: Product[], productData: any, productId: string | null = null): boolean {
  return products.some(p => {
    if (productId && p.id === productId) return false;
    return p.company.toLowerCase() === productData.company.toLowerCase() &&
           p.name.toLowerCase() === productData.name.toLowerCase() &&
           p.genericName.toLowerCase() === productData.genericName.toLowerCase() &&
           p.strength.toLowerCase() === productData.strength.toLowerCase() &&
           p.packSize.toLowerCase() === productData.packSize.toLowerCase();
  });
}
