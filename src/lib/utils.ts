/**
 * Utility functions for MediChain App
 */

/**
 * Formats a UUID or generic ID into a clean, professional reference code
 * e.g. "7c1139d0-..." -> "#ORD-1042" or "#INV-8821"
 */
export function formatRefId(id: string, prefix: "ORD" | "INV" | "DEP" | "PHR" = "ORD"): string {
  if (!id) return `#${prefix}-0000`;
  
  // If already in short format, return as is
  if (id.startsWith("#") || id.startsWith("ORD-") || id.startsWith("INV-") || id.startsWith("DEP-")) {
    return id.startsWith("#") ? id : `#${id}`;
  }

  // Generate a simple deterministic hash of the ID string
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Ensure we get a 4-digit positive integer between 1000 and 9999
  const numericPart = Math.abs(hash % 9000) + 1000;
  return `#${prefix}-${numericPart}`;
}

/**
 * Returns a deterministic 4-digit security OTP for a given order ID
 */
export function generateOrderOTP(orderId: string): string {
  if (!orderId) return "1234";
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = orderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const numericPart = Math.abs(hash % 9000) + 1000;
  return String(numericPart);
}

/**
 * Parses packSize and strength to return a readable unit breakdown
 * e.g. "10 x 10 Box" -> "Box (100 Tabs)" or "৳102 / Box (10 Strips)"
 */
export function formatProductPriceLabel(mrp: number, packSize: string): string {
  const sizeLower = packSize.toLowerCase();
  if (sizeLower.includes("box")) {
    // extract digits if any (e.g. "10x10" or "10 strips")
    const match = packSize.match(/\d+/g);
    if (match && match.length >= 2) {
      const strips = parseInt(match[0]);
      const perStrip = parseInt(match[1]);
      return `/ Box (${strips} Strips)`;
    } else if (match && match.length === 1) {
      return `/ Box (${match[0]} Strips)`;
    }
    return "/ Box";
  } else if (sizeLower.includes("strip") || sizeLower.includes("pkt")) {
    return "/ Strip";
  } else if (sizeLower.includes("bottle") || sizeLower.includes("ml")) {
    return "/ Bottle";
  }
  return `/ Box`;
}
