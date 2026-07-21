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
  image_url?: string;
}

export type VerificationStatus = "Pending" | "Under Review" | "Approved" | "Rejected" | "Suspended";

export interface Pharmacy {
  id: string;
  pharmacyName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  area: string;
  licenseNo: string;
  licenseDocumentUrl?: string;
  tradeLicenseNo?: string;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  creditLimit: number;
  usedCredit: number;
  availableCredit: number;
  
  // Custom Profile & KYC Verification Fields
  nidNumber?: string;
  nidOwnerName?: string;
  dob?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  drugLicenseExpiry?: string;
  drugLicenseUrl?: string;
  division?: string;
  district?: string;
  upazila?: string;
  streetAddress?: string;
  logoUrl?: string;
  email?: string;
}

export interface CreditAccount {
  id: string;
  pharmacyId: string;
  creditLimit: number;
  usedCredit: number;
  status: "Active" | "Suspended";
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
  readableId?: string;
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
  assignedRiderId?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_role: string;
  action: string;
  module: string;
  description: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  role_target?: string;
  title: string;
  message: string;
  type: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreference {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;
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

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  affectedModule: string;
  recordId: string;
}

export interface ImportHistoryEvent {
  id: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  failureCount: number;
  importedBy: string;
  date: string;
  status: "Completed" | "With Errors";
}

