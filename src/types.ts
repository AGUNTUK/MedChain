/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  genericName: string;
  company: string;
  category: "Tablet" | "Capsule" | "Syrup" | "Injection" | "Cream" | "Supplement";
  strength: string;
  packSize: string;
  mrp: number; // Maximum Retail Price
  sellingPrice: number; // Wholesale/MediChain price
  discountPercentage: number;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  imageUrl?: string;
  suppliers: Array<{
    name: string;
    purchasePrice: number;
    availableQty: number;
  }>;
}

export interface Pharmacy {
  id: string;
  pharmacyName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  licenseNo: string;
  creditLimit: number;
  usedCredit: number;
  availableCredit: number;
}

export type OrderStatus = "Pending" | "Confirmed" | "Processing" | "Packed" | "Out for Delivery" | "Delivered" | "Completed" | "Cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  strength: string;
  packSize: string;
  quantity: number;
  sellingPrice: number;
  mrp: number;
  subtotal: number;
}

export interface Order {
  id: string;
  pharmacyId: string;
  status: OrderStatus;
  paymentMethod: "Cash on Delivery" | "bKash" | "Nagad";
  paymentStatus: "Pending" | "Paid" | "Failed" | "Refunded";
  totalAmount: number;
  totalSavings: number;
  totalMrp: number;
  items: OrderItem[];
  notes?: string;
  deliveryAddress?: string;
  createdAt: string;
  estimatedDelivery: string;
  hasReturnRequested?: boolean;
  returnReason?: string;
  returnStatus?: "None" | "Pending" | "Approved" | "Rejected";
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "offer" | "order" | "price_drop" | "system";
  date: string;
  read: boolean;
}

export interface Favourite {
  productId: string;
}

export interface Prescription {
  id: string;
  date: string;
  imageUrl: string;
  extractedText?: string;
  status: "Processing" | "Completed" | "Failed";
  itemsMatched?: Array<{
    query: string;
    matchedProductId?: string;
    matchedProductName?: string;
    matchedProductPrice?: number;
    strength?: string;
    quantitySuggested?: number;
    confidence: number;
  }>;
}

export type UserRole = "Pharmacy Owner" | "Admin" | "Depot Staff" | "Delivery Staff";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
}

