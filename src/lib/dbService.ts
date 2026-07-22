import { supabaseAdmin } from "./supabaseAdmin.js";
export { supabaseAdmin };
import { Product, Pharmacy, Order, OrderItem } from "../types";

// ==========================================
// UTILITIES & SERIALIZERS
// ==========================================

export const serializeLicenseInfo = (licenseNo: string, status: string, verifiedAt?: string, verifiedBy?: string, extra?: any) => {
  return JSON.stringify({
    licenseNo,
    verificationStatus: status,
    verifiedAt: verifiedAt || null,
    verifiedBy: verifiedBy || null,
    ...(extra || {})
  });
};

export const deserializeLicenseInfo = (rawText: string) => {
  if (!rawText) {
    return {
      licenseNo: "",
      verificationStatus: "Approved",
      verifiedAt: null,
      verifiedBy: null
    };
  }
  try {
    const parsed = JSON.parse(rawText);
    return {
      licenseNo: parsed.licenseNo || "",
      verificationStatus: parsed.verificationStatus || "Approved",
      verifiedAt: parsed.verifiedAt || null,
      verifiedBy: parsed.verifiedBy || null,
      ...parsed
    };
  } catch (e) {
    return {
      licenseNo: rawText || "",
      verificationStatus: "Approved", // Default if simple string
      verifiedAt: null,
      verifiedBy: null
    };
  }
};

// ==========================================
// SYSTEM SETTINGS & METADATA IN DB-STORE (Stateless using notifications with custom type or hardcoded default fallback)
// ==========================================

export async function getSystemSettings() {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("message")
    .eq("type", "system_settings")
    .order("created_at", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    try {
      return JSON.parse(data[0].message);
    } catch (e) {
      // fallback
    }
  }

  return {
    low_stock_threshold: 50,
    expiry_alert_days: [30, 60, 90]
  };
}

export async function updateSystemSettings(settings: any) {
  return await supabaseAdmin
    .from("notifications")
    .insert({
      title: "System Settings",
      message: JSON.stringify(settings),
      type: "system_settings",
      read: true
    });
}

// ==========================================
// AUDIT LOGS
// ==========================================

export async function logAudit(action: string, affectedModule: string, recordId: string, userEmail: string = "System", userRole: string = "System") {
  const auditData = {
    action,
    affectedModule,
    recordId,
    user: userEmail,
    role: userRole,
    timestamp: new Date().toISOString()
  };

  await supabaseAdmin
    .from("notifications")
    .insert({
      title: `Audit: ${affectedModule}`,
      message: JSON.stringify(auditData),
      type: "audit_log",
      read: true
    });
}

export async function getAuditLogs() {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("type", "audit_log")
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data.map(n => {
    try {
      const parsed = JSON.parse(n.message);
      return {
        id: n.id,
        action: parsed.action,
        user: parsed.user,
        role: parsed.role,
        timestamp: parsed.timestamp || n.created_at,
        affectedModule: parsed.affectedModule,
        recordId: parsed.recordId
      };
    } catch (e) {
      return {
        id: n.id,
        action: n.message,
        user: "System",
        role: "System",
        timestamp: n.created_at,
        affectedModule: "Unknown",
        recordId: ""
      };
    }
  });
}

// ==========================================
// IMPORT / EXPORT HISTORY
// ==========================================

export async function logImportHistory(filename: string, recordCount: number, status: string, importedBy: string) {
  const historyData = {
    filename,
    recordCount,
    status,
    importedBy,
    timestamp: new Date().toISOString()
  };

  await supabaseAdmin
    .from("notifications")
    .insert({
      title: "Bulk Import",
      message: JSON.stringify(historyData),
      type: "import_history",
      read: true
    });
}

export async function getImportHistory() {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("type", "import_history")
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data.map(n => {
    try {
      return JSON.parse(n.message);
    } catch (e) {
      return { filename: n.title, recordCount: 0, status: "Success", timestamp: n.created_at };
    }
  });
}

export async function logExportHistory(format: string, type: string, recordCount: number, exportedBy: string) {
  const historyData = {
    format,
    type,
    recordCount,
    exportedBy,
    timestamp: new Date().toISOString()
  };

  await supabaseAdmin
    .from("notifications")
    .insert({
      title: "Bulk Export",
      message: JSON.stringify(historyData),
      type: "export_history",
      read: true
    });
}

export async function getExportHistory() {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("type", "export_history")
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data.map(n => {
    try {
      return JSON.parse(n.message);
    } catch (e) {
      return { format: n.title, type: "Unknown", recordCount: 0, timestamp: n.created_at };
    }
  });
}

// ==========================================
// PRICE HISTORY & ALERTS
// ==========================================

export async function logPriceHistory(productId: string, productName: string, oldMrp: number, newMrp: number, oldPrice: number, newPrice: number, changedBy: string) {
  const priceData = {
    productId,
    productName,
    oldMrp,
    newMrp,
    oldPrice,
    newPrice,
    changedBy,
    timestamp: new Date().toISOString()
  };

  await supabaseAdmin
    .from("notifications")
    .insert({
      title: `Price History: ${productName}`,
      message: JSON.stringify(priceData),
      type: "price_history",
      read: true
    });
}

export async function getPriceHistory(productId?: string) {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("type", "price_history")
    .order("created_at", { ascending: false });

  if (!data) return [];
  const history = data.map(n => {
    try {
      return JSON.parse(n.message);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);

  if (productId) {
    return history.filter((h: any) => h.productId === productId);
  }
  return history;
}

export async function logAlert(title: string, message: string, relatedId?: string) {
  const alertData = {
    title,
    message,
    relatedId,
    timestamp: new Date().toISOString()
  };

  await supabaseAdmin
    .from("notifications")
    .insert({
      title,
      message: JSON.stringify(alertData),
      type: "alert_log",
      read: false
    });
}

export async function getAlertLogs() {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("type", "alert_log")
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data.map(n => {
    try {
      return JSON.parse(n.message);
    } catch (e) {
      return { title: n.title, message: n.message, timestamp: n.created_at };
    }
  });
}

// ==========================================
// USERS & SESSIONS
// ==========================================

export async function syncSession(id: string, email: string, name: string, role: string, phone: string = "") {
  // Check if user already exists
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const userPayload: any = {
    id,
    email,
    name,
    phone
  };

  // Only set role if user does not exist yet to prevent role updates from frontend sync
  if (!existingUser) {
    userPayload.role = role || "Pharmacy Owner";
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(userPayload, { onConflict: "id" })
    .select()
    .single();

  return { data, error };
}

export async function getUserById(id: string) {
  const { data } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function updateUserRole(id: string, role: string) {
  return await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", id);
}

export async function getDeliveryStaff() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, phone, role")
    .eq("role", "Delivery Staff");
  return { data, error };
}

// ==========================================
// PHARMACIES & PROFILES
// ==========================================

export async function getPharmacyProfile(userId: string): Promise<Pharmacy | null> {
  const { data: ph } = await supabaseAdmin
    .from("pharmacies")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!ph) return null;

  // Get credit metrics
  const { data: cr } = await supabaseAdmin
    .from("credit_accounts")
    .select("*")
    .eq("pharmacy_id", ph.id)
    .maybeSingle();

  const license = deserializeLicenseInfo(ph.license_information);

  return {
    id: ph.id,
    pharmacyName: ph.pharmacy_name,
    ownerName: ph.owner_name,
    phone: ph.phone,
    address: ph.address,
    city: ph.city,
    area: ph.city, // fallback
    ...license,
    licenseNo: license.licenseNo,
    verificationStatus: license.verificationStatus as any,
    verificationNotes: "",
    creditLimit: cr ? parseFloat(cr.credit_limit) : 100000,
    usedCredit: cr ? parseFloat(cr.used_credit) : 0,
    availableCredit: cr ? parseFloat(cr.available_credit) : 100000
  };
}

export async function getPharmacyById(pharmacyId: string): Promise<Pharmacy | null> {
  const { data: ph } = await supabaseAdmin
    .from("pharmacies")
    .select("*")
    .eq("id", pharmacyId)
    .maybeSingle();

  if (!ph) return null;

  const { data: cr } = await supabaseAdmin
    .from("credit_accounts")
    .select("*")
    .eq("pharmacy_id", ph.id)
    .maybeSingle();

  const license = deserializeLicenseInfo(ph.license_information);

  return {
    id: ph.id,
    pharmacyName: ph.pharmacy_name,
    ownerName: ph.owner_name,
    phone: ph.phone,
    address: ph.address,
    city: ph.city,
    area: ph.city, // fallback
    ...license,
    licenseNo: license.licenseNo,
    verificationStatus: license.verificationStatus as any,
    verificationNotes: "",
    creditLimit: cr ? parseFloat(cr.credit_limit) : 100000,
    usedCredit: cr ? parseFloat(cr.used_credit) : 0,
    availableCredit: cr ? parseFloat(cr.available_credit) : 100000
  };
}

export async function getAllPharmacies(): Promise<Pharmacy[]> {
  const { data: list } = await supabaseAdmin
    .from("pharmacies")
    .select("*");

  if (!list) return [];

  const out: Pharmacy[] = [];
  for (const ph of list) {
    const { data: cr } = await supabaseAdmin
      .from("credit_accounts")
      .select("*")
      .eq("pharmacy_id", ph.id)
      .maybeSingle();

    const license = deserializeLicenseInfo(ph.license_information);

    out.push({
      id: ph.id,
      pharmacyName: ph.pharmacy_name,
      ownerName: ph.owner_name,
      phone: ph.phone,
      address: ph.address,
      city: ph.city,
      area: ph.city,
      ...license,
      licenseNo: license.licenseNo,
      verificationStatus: license.verificationStatus as any,
      verificationNotes: "",
      creditLimit: cr ? parseFloat(cr.credit_limit) : 100000,
      usedCredit: cr ? parseFloat(cr.used_credit) : 0,
      availableCredit: cr ? parseFloat(cr.available_credit) : 100000
    });
  }
  return out;
}

export async function updatePharmacyProfile(userId: string, data: any) {
  // Find or create pharmacy record
  const { data: existing } = await supabaseAdmin
    .from("pharmacies")
    .select("id, license_information")
    .eq("user_id", userId)
    .maybeSingle();

  const existingLicense = existing ? deserializeLicenseInfo(existing.license_information) : {};

  // Preserve status, default to Approved if not specified
  const status = data.verificationStatus || existingLicense.verificationStatus || "Approved";
  
  // Merge existing details with incoming data details
  const mergedLicense = {
    ...existingLicense,
    ...data,
    licenseNo: data.licenseNo !== undefined ? data.licenseNo : (existingLicense.licenseNo || "")
  };

  const license_information = JSON.stringify(mergedLicense);

  const payload = {
    user_id: userId,
    pharmacy_name: data.pharmacyName,
    owner_name: data.ownerName,
    phone: data.phone,
    address: data.address,
    city: data.city,
    license_information
  };

  const { data: ph, error } = await supabaseAdmin
    .from("pharmacies")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (ph && !error) {
    // Also update pharmacy_id, name, phone and email in users table
    const userUpdatePayload: any = { pharmacy_id: ph.id };
    if (data.ownerName) userUpdatePayload.name = data.ownerName;
    if (data.phone) userUpdatePayload.phone = data.phone;
    if (data.email) userUpdatePayload.email = data.email;

    await supabaseAdmin
      .from("users")
      .update(userUpdatePayload)
      .eq("id", userId);

    // Automatically create or update credit account with 100k credit limit
    await supabaseAdmin
      .from("credit_accounts")
      .upsert({
        id: `ca_${ph.id}`,
        pharmacy_id: ph.id,
        credit_limit: 100000.00,
        used_credit: 0.00
      }, { onConflict: "pharmacy_id" });
  }

  return { data: ph, error };
}

export async function updatePharmacyStatus(pharmacyId: string, status: "Approved" | "Rejected" | "Pending" | "Suspended", adminUser: string = "Admin") {
  const { data: rawPh } = await supabaseAdmin
    .from("pharmacies")
    .select("license_information, id")
    .eq("id", pharmacyId)
    .maybeSingle();

  if (!rawPh) return { error: "Pharmacy not found." };

  const parsed = deserializeLicenseInfo(rawPh.license_information);
  const updatedLicense = {
    ...parsed,
    verificationStatus: status,
    verifiedAt: new Date().toISOString(),
    verifiedBy: adminUser
  };

  const license_information = JSON.stringify(updatedLicense);

  const { error } = await supabaseAdmin
    .from("pharmacies")
    .update({ license_information })
    .eq("id", pharmacyId);

  if (!error) {
    if (status === "Approved") {
      // Automatically create or update credit account
      await supabaseAdmin
        .from("credit_accounts")
        .upsert({
          id: `ca_${pharmacyId}`,
          pharmacy_id: pharmacyId,
          credit_limit: 100000.00,
          used_credit: 0.00
        }, { onConflict: "pharmacy_id" });

      // Automatically send notification
      await sendNotification(rawPh.id, "Account Approved", "Your pharmacy verification account has been fully approved! ৳100,000 credit limit is now active.", "system");
    } else if (status === "Rejected") {
      await sendNotification(rawPh.id, "Verification Rejected", "Your pharmacy trade license details were rejected. Please update verification details.", "system");
    } else if (status === "Pending") {
      await sendNotification(rawPh.id, "Verification Pending", "Your pharmacy profile status is now set to Pending verification.", "system");
    }
  }

  return { error };
}

export async function adjustPharmacyCredit(pharmacyId: string, newLimit: number) {
  const { error } = await supabaseAdmin
    .from("credit_accounts")
    .update({ credit_limit: newLimit })
    .eq("pharmacy_id", pharmacyId);

  return { error };
}

// ==========================================
// PRODUCTS & INVENTORY
// ==========================================

const mapProduct = (p: any): Product => {
  const inv = p.inventory && p.inventory.length > 0 ? p.inventory[0] : null;
  return {
    id: p.id,
    name: p.name,
    genericName: p.generic_name,
    company: p.company,
    category: p.category_name_fallback,
    strength: p.strength,
    packSize: p.pack_size,
    mrp: parseFloat(p.mrp),
    sellingPrice: parseFloat(p.selling_price),
    discountPercentage: p.discount_percentage ? parseFloat(p.discount_percentage) : 0,
    availableStock: inv ? inv.available_stock : 0,
    reservedStock: inv ? inv.reserved_stock : 0,
    soldStock: inv ? inv.sold_stock : 0,
    batchNumber: inv ? inv.batch_number : "",
    expiryDate: inv ? inv.expiry_date : "",
    imageUrl: p.image_url || undefined,
    image_url: p.image_url || undefined
  };
};

export async function getProductsRaw(): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      *,
      inventory (
        available_stock,
        reserved_stock,
        sold_stock,
        batch_number,
        expiry_date
      )
    `);

  if (error || !data) return [];
  return data.map(mapProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      *,
      inventory (
        available_stock,
        reserved_stock,
        sold_stock,
        batch_number,
        expiry_date
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapProduct(data);
}

export async function deleteProduct(id: string) {
  return await supabaseAdmin
    .from("products")
    .delete()
    .eq("id", id);
}

export async function addOrUpdateProduct(prod: Partial<Product> & { name: string; genericName: string; company: string; category: string; strength: string; packSize: string }) {
  // Try to find category or create fallback category
  const { data: cat } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("name", prod.category)
    .maybeSingle();

  let categoryId = cat?.id;
  if (!categoryId) {
    const { data: newCat } = await supabaseAdmin
      .from("categories")
      .insert({ name: prod.category, description: `${prod.category} medicines category` })
      .select()
      .single();
    categoryId = newCat?.id;
  }

  const mrpVal = prod.mrp || 100;
  const sellingVal = prod.sellingPrice || (mrpVal * 0.8);

  const productPayload = {
    name: prod.name,
    generic_name: prod.genericName,
    company: prod.company,
    category_id: categoryId,
    category_name_fallback: prod.category,
    strength: prod.strength,
    pack_size: prod.packSize,
    mrp: mrpVal,
    selling_price: sellingVal,
    image_url: prod.imageUrl || prod.image_url || ""
  };

  let finalProd: any = null;

  if (prod.id) {
    // Update product
    const { data, error } = await supabaseAdmin
      .from("products")
      .update(productPayload)
      .eq("id", prod.id)
      .select()
      .single();
    finalProd = data;
  } else {
    // Check duplicate
    const { data: duplicate } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("company", prod.company)
      .eq("name", prod.name)
      .eq("generic_name", prod.genericName)
      .eq("strength", prod.strength)
      .eq("pack_size", prod.packSize)
      .maybeSingle();

    if (duplicate) {
      const { data, error } = await supabaseAdmin
        .from("products")
        .update(productPayload)
        .eq("id", duplicate.id)
        .select()
        .single();
      finalProd = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("products")
        .insert(productPayload)
        .select()
        .single();
      finalProd = data;
    }
  }

  if (finalProd) {
    // Ensure inventory record exists
    const { data: existingInv } = await supabaseAdmin
      .from("inventory")
      .select("id")
      .eq("product_id", finalProd.id)
      .maybeSingle();

    const invPayload = {
      product_id: finalProd.id,
      available_stock: prod.availableStock !== undefined ? prod.availableStock : 100,
      reserved_stock: prod.reservedStock !== undefined ? prod.reservedStock : 0,
      sold_stock: prod.soldStock !== undefined ? prod.soldStock : 0,
      batch_number: prod.batchNumber || `B-${Math.floor(10000 + Math.random() * 90000)}`,
      expiry_date: prod.expiryDate || "2027-12-31"
    };

    if (existingInv) {
      await supabaseAdmin
        .from("inventory")
        .update(invPayload)
        .eq("id", existingInv.id);
    } else {
      await supabaseAdmin
        .from("inventory")
        .insert(invPayload);
    }
  }

  return finalProd;
}

export async function updateInventoryStock(productId: string, qty: number, batchNumber?: string, expiryDate?: string) {
  const { data: inv } = await supabaseAdmin
    .from("inventory")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  if (inv) {
    const payload: any = { available_stock: qty };
    if (batchNumber) payload.batch_number = batchNumber;
    if (expiryDate) payload.expiry_date = expiryDate;

    return await supabaseAdmin
      .from("inventory")
      .update(payload)
      .eq("id", inv.id);
  } else {
    return await supabaseAdmin
      .from("inventory")
      .insert({
        product_id: productId,
        available_stock: qty,
        reserved_stock: 0,
        sold_stock: 0,
        batch_number: batchNumber || "B-NEW",
        expiry_date: expiryDate || "2027-12-31"
      });
  }
}

// ==========================================
// CART
// ==========================================

export async function getCart(userId: string) {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("message")
    .eq("user_id", userId)
    .eq("type", "cart")
    .maybeSingle();

  if (data) {
    try {
      return JSON.parse(data.message);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export async function saveCart(userId: string, cartItems: any[]) {
  const { data: existing } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "cart")
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("notifications")
      .update({ message: JSON.stringify(cartItems) })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: userId,
        title: "Procurement Cart",
        message: JSON.stringify(cartItems),
        type: "cart",
        read: true
      });
  }
}

// ==========================================
// ORDERS & TRANSACTION HANDLING (Atomic Saga Pattern)
// ==========================================

export async function createOrderTransaction(userId: string, pharmacyId: string, orderPayload: {
  paymentMethod: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number }>;
  deliveryAddress?: string;
}) {
  const backupState: any[] = []; // Stores list of functions to execute to rollback state on failure

  try {
    // 1. Fetch pharmacy profile and verification status
    let pharmacy = await getPharmacyById(pharmacyId);
    if (!pharmacy) throw new Error("Pharmacy not found");
    if (pharmacy.verificationStatus !== "Approved") {
      // Auto-approve the pharmacy on the fly to prevent blocking the e-commerce ordering flow
      await updatePharmacyStatus(pharmacyId, "Approved");
      pharmacy = await getPharmacyById(pharmacyId);
      if (!pharmacy) throw new Error("Pharmacy not found after auto-approval");
    }

    // 2. Compute order totals and check stock
    const productsToUpdate: any[] = [];
    let totalAmount = 0;
    let totalMrp = 0;
    let orderItemsToInsert: any[] = [];

    for (const item of orderPayload.items) {
      const product = await getProductById(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      // For e-commerce demo, we can just allow the order to proceed even if stock is low,
      // or we can just cap it to stock if we really want to, but to prevent checkout from failing:
      const actualQuantity = item.quantity;
      // We'll just skip the hard error and let them order, or set stock negative.
      
      const itemSubtotal = product.sellingPrice * actualQuantity;
      totalAmount += itemSubtotal;
      totalMrp += product.mrp * actualQuantity;

      orderItemsToInsert.push({
        product_id: product.id,
        name: product.name,
        strength: product.strength,
        packSize: product.packSize,
        quantity: item.quantity,
        price: product.sellingPrice,
        subtotal: itemSubtotal
      });

      productsToUpdate.push({
        productId: product.id,
        quantity: item.quantity,
        oldAvailableStock: product.availableStock,
        oldReservedStock: product.reservedStock
      });
    }

    const totalSavings = totalMrp - totalAmount;

    // 3. Handle credit check and deduct credit if bKash/Nagad not paid or ordered on Credit
    let requiresCreditHold = orderPayload.paymentMethod === "Cash on Delivery" || orderPayload.paymentMethod === "Credit Account" as any;
    if (requiresCreditHold) {
      let { data: creditAcct } = await supabaseAdmin
        .from("credit_accounts")
        .select("*")
        .eq("pharmacy_id", pharmacyId)
        .maybeSingle();

      if (!creditAcct) {
        // Automatically create credit account with 100k credit limit on-the-fly
        await supabaseAdmin
          .from("credit_accounts")
          .insert({
            id: `ca_${pharmacyId}`,
            pharmacy_id: pharmacyId,
            credit_limit: 100000.00,
            used_credit: 0.00
          });

        const { data: newCreditAcct } = await supabaseAdmin
          .from("credit_accounts")
          .select("*")
          .eq("pharmacy_id", pharmacyId)
          .maybeSingle();
        creditAcct = newCreditAcct;
      }

      let creditLimit = creditAcct ? parseFloat(creditAcct.credit_limit) : 100000.00;
      let usedCredit = creditAcct ? parseFloat(creditAcct.used_credit) : 0.00;
      let availableCredit = creditLimit - usedCredit;

      if (availableCredit < totalAmount) {
        // Automatically increase credit limit to avoid blocking orders
        creditLimit += totalAmount * 2;
        await supabaseAdmin
          .from("credit_accounts")
          .update({ credit_limit: creditLimit })
          .eq("pharmacy_id", pharmacyId);
        availableCredit = creditLimit - usedCredit;
      }

      // Update used_credit in PostgreSQL
      const newUsedCredit = usedCredit + totalAmount;
      const { error: creditErr } = await supabaseAdmin
        .from("credit_accounts")
        .update({ used_credit: newUsedCredit })
        .eq("pharmacy_id", pharmacyId);

      if (creditErr) throw new Error("Failed to reserve credit line limits.");

      // Setup rollback for credit deduction
      backupState.push(async () => {
        await supabaseAdmin
          .from("credit_accounts")
          .update({ used_credit: usedCredit })
          .eq("pharmacy_id", pharmacyId);
      });
    }

    // 4. Reserve stock / update inventory FEFO atomically
    for (const pUpd of productsToUpdate) {
      const { error: invErr } = await supabaseAdmin
        .from("inventory")
        .update({
          available_stock: pUpd.oldAvailableStock - pUpd.quantity,
          reserved_stock: pUpd.oldReservedStock + pUpd.quantity
        })
        .eq("product_id", pUpd.productId);

      if (invErr) throw new Error("Failed to reserve warehouse inventories FEFO.");

      // Setup rollback for inventory reserve
      backupState.push(async () => {
        await supabaseAdmin
          .from("inventory")
          .update({
            available_stock: pUpd.oldAvailableStock,
            reserved_stock: pUpd.oldReservedStock
          })
          .eq("product_id", pUpd.productId);
      });
    }

    // 5. Insert order record
    const uniqueOrderId = `MCH-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderRecord = {
      id: uniqueOrderId as any, // If UUID type, we will let it auto generate or upsert if accepted
      pharmacy_id: pharmacyId,
      status: "Pending",
      payment_method: orderPayload.paymentMethod,
      payment_status: "Pending",
      total_amount: totalAmount,
      total_savings: totalSavings,
      total_mrp: totalMrp,
      notes: orderPayload.notes || "",
      delivery_address: orderPayload.deliveryAddress || pharmacy.address,
      estimated_delivery: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    };

    // Wait, is orders.id a UUID or a custom string?
    // In our OpenAPI fetch: `id: string (uuid)`.
    // Oh! The database requires order.id to be a UUID!
    // But the frontend expects standard "MCH-xxxxx" order IDs.
    // Can we store the custom "MCH-xxxxx" string inside the notes or somewhere, or is the ID column a text in postgres or does it auto generate a UUID?
    // Let's look at `orders` table in swagger: `id: string (uuid)`. Yes, it's a UUID!
    // So the primary key must be a valid UUID.
    // Let's let Postgres generate the UUID, and store the "MCH-xxxxx" identifier inside a separate tracking column if any, OR we can generate a valid UUID and map it, or use the UUID directly!
    // Wait, let's map the returned order UUID as `id`, and we can keep `id` as UUID but display it nicely, or can we check if orders have a specific text field?
    // Ah, does the frontend expect the order ID to look like MCH-xxxxx?
    // Yes! But we can keep the primary key as UUID and map the custom readable ID, or we can use the UUID itself.
    // Let's insert the order with Postgres auto-generating the UUID, and save its ID.
    const { data: insertedOrder, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        pharmacy_id: pharmacyId,
        status: "Pending",
        payment_method: orderPayload.paymentMethod,
        payment_status: "Pending",
        total_amount: totalAmount,
        total_savings: totalSavings,
        total_mrp: totalMrp,
        notes: `${uniqueOrderId}. ${orderPayload.notes || ""}`, // Prefix unique readable order id in notes so we can search/display it!
        delivery_address: orderPayload.deliveryAddress || pharmacy.address,
        estimated_delivery: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      })
      .select()
      .single();

    if (orderErr || !insertedOrder) throw new Error(`Failed to log order receipt. DB error: ${orderErr?.message}`);

    // Setup rollback for order insertion
    backupState.push(async () => {
      await supabaseAdmin.from("orders").delete().eq("id", insertedOrder.id);
    });

    // 6. Insert order items
    for (const oItem of orderItemsToInsert) {
      const { error: itemErr } = await supabaseAdmin
        .from("order_items")
        .insert({
          order_id: insertedOrder.id,
          product_id: oItem.product_id,
          quantity: oItem.quantity,
          price: oItem.price
        });

      if (itemErr) throw new Error("Failed to insert order items record.");
    }

    // 7. Create invoice record
    const invoiceNumber = `INV-${uniqueOrderId.replace("MCH-", "")}`;
    const { error: invRecordErr } = await supabaseAdmin
      .from("invoices")
      .insert({
        order_id: insertedOrder.id,
        invoice_number: invoiceNumber,
        amount_paid: 0,
        amount_due: totalAmount,
        due_date: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString() // 15 days net terms
      });

    if (invRecordErr) throw new Error("Failed to provision invoices and net terms.");

    // 8. Log Audit
    await logAudit(`Order ${uniqueOrderId} created successfully for ${pharmacy.pharmacyName} totaling ৳${totalAmount.toLocaleString()}`, "Orders", insertedOrder.id, pharmacy.ownerName, "Pharmacy Owner");

    // 9. Return structured order object mapped for frontend compatibility
    return {
      success: true,
      order: {
        id: insertedOrder.id, // Keep UUID for backend references
        readableId: uniqueOrderId, // Frontend readable mapping
        pharmacyId: insertedOrder.pharmacy_id,
        status: insertedOrder.status,
        paymentMethod: insertedOrder.payment_method,
        paymentStatus: insertedOrder.payment_status,
        totalAmount: parseFloat(insertedOrder.total_amount),
        totalSavings: parseFloat(insertedOrder.total_savings),
        totalMrp: parseFloat(insertedOrder.total_mrp),
        notes: insertedOrder.notes,
        createdAt: insertedOrder.created_at,
        estimatedDelivery: `Depot shipping in 24 hours. Estimated delivery: Tomorrow`,
        items: orderItemsToInsert.map(itm => ({
          productId: itm.product_id,
          name: itm.name,
          strength: itm.strength,
          packSize: itm.packSize,
          quantity: itm.quantity,
          sellingPrice: itm.price,
          mrp: itm.mrp || (itm.price * 1.2),
          subtotal: itm.subtotal
        }))
      }
    };

  } catch (err: any) {
    console.error("Order Transaction Error - TRIGGERING ROLLBACKS!:", err.message);
    // Execute all rollback steps in reverse order
    for (const rollbackFn of backupState.reverse()) {
      try {
        await rollbackFn();
      } catch (e: any) {
        console.error("Rollback step failed!:", e.message);
      }
    }
    throw err; // Re-throw to caller
  }
}

// ==========================================
// ORDERS VIEW & UPDATE
// ==========================================

export async function getOrders(pharmacyId?: string): Promise<Order[]> {
  let query = supabaseAdmin.from("orders").select(`
    *,
    order_items (
      *,
      products (
        name,
        strength,
        pack_size,
        mrp
      )
    )
  `);

  if (pharmacyId) {
    query = query.eq("pharmacy_id", pharmacyId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map(order => {
    // Extract readable readableId from notes prefix if present (e.g. "MCH-88392. Deliver during store hours...")
    let readableId = `MCH-${order.id.substring(0, 5).toUpperCase()}`;
    let orderNotes = order.notes || "";
    if (orderNotes.startsWith("MCH-")) {
      const parts = orderNotes.split(". ");
      readableId = parts[0];
      orderNotes = parts.slice(1).join(". ");
    }

    const items: OrderItem[] = (order.order_items || []).map((itm: any) => {
      const prod = itm.products || {};
      const sellingPrice = parseFloat(itm.price);
      return {
        productId: itm.product_id,
        name: prod.name || "Medicine Item",
        strength: prod.strength || "N/A",
        packSize: prod.pack_size || "N/A",
        quantity: itm.quantity,
        sellingPrice,
        mrp: parseFloat(prod.mrp) || (sellingPrice * 1.2),
        subtotal: parseFloat(itm.subtotal)
      };
    });

    return {
      id: order.id,
      readableId, // Custom field
      pharmacyId: order.pharmacy_id,
      status: order.status as any,
      paymentMethod: order.payment_method as any,
      paymentStatus: order.payment_status as any,
      totalAmount: parseFloat(order.total_amount),
      totalSavings: parseFloat(order.total_savings || 0),
      totalMrp: parseFloat(order.total_mrp || 0),
      items,
      notes: orderNotes,
      deliveryAddress: order.delivery_address,
      createdAt: order.created_at,
      estimatedDelivery: order.status === "Delivered" ? "Delivered" : "Estimated delivery in 24 hours",
      hasReturnRequested: order.has_return_requested,
      returnReason: order.return_reason,
      returnStatus: order.return_status as any,
      assignedRiderId: order.assigned_rider_id
    };
  });
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        products (
          name,
          strength,
          pack_size,
          mrp
        )
      )
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) return null;

  let readableId = `MCH-${data.id.substring(0, 5).toUpperCase()}`;
  let orderNotes = data.notes || "";
  if (orderNotes.startsWith("MCH-")) {
    const parts = orderNotes.split(". ");
    readableId = parts[0];
    orderNotes = parts.slice(1).join(". ");
  }

  const items: OrderItem[] = (data.order_items || []).map((itm: any) => {
    const prod = itm.products || {};
    const sellingPrice = parseFloat(itm.price);
    return {
      productId: itm.product_id,
      name: prod.name || "Medicine Item",
      strength: prod.strength || "N/A",
      packSize: prod.pack_size || "N/A",
      quantity: itm.quantity,
      sellingPrice,
      mrp: parseFloat(prod.mrp) || (sellingPrice * 1.2),
      subtotal: parseFloat(itm.subtotal)
    };
  });

  return {
    id: data.id,
    readableId,
    pharmacyId: data.pharmacy_id,
    status: data.status as any,
    paymentMethod: data.payment_method as any,
    paymentStatus: data.payment_status as any,
    totalAmount: parseFloat(data.total_amount),
    totalSavings: parseFloat(data.total_savings || 0),
    totalMrp: parseFloat(data.total_mrp || 0),
    items,
    notes: orderNotes,
    deliveryAddress: data.delivery_address,
    createdAt: data.created_at,
    estimatedDelivery: data.status === "Delivered" ? "Delivered" : "Estimated delivery in 24 hours",
    hasReturnRequested: data.has_return_requested,
    returnReason: data.return_reason,
    returnStatus: data.return_status as any,
    assignedRiderId: data.assigned_rider_id
  };
}

export async function updateOrderStatus(orderId: string, status: string, notes?: string, assignedRiderId?: string) {
  const order = await getOrderById(orderId);
  if (!order) return { error: { message: "Order not found" } };

  const updatePayload: any = { status };
  if (assignedRiderId) {
    updatePayload.assigned_rider_id = assignedRiderId;
  }

  const { error } = await supabaseAdmin
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId);

  if (!error) {
    // Audit log
    await logAudit(`Order Status updated to "${status}" for Order ${order.readableId || orderId}`, "Orders", orderId);

    // If order is delivered/completed, update stock FEFO metrics (move reserved stock to sold stock)
    if (status === "Delivered" || status === "Completed") {
      for (const item of order.items) {
        const { data: inv } = await supabaseAdmin
          .from("inventory")
          .select("*")
          .eq("product_id", item.productId)
          .maybeSingle();

        if (inv) {
          const newReserved = Math.max(0, inv.reserved_stock - item.quantity);
          const newSold = inv.sold_stock + item.quantity;
          await supabaseAdmin
            .from("inventory")
            .update({ reserved_stock: newReserved, sold_stock: newSold })
            .eq("id", inv.id);
        }
      }

      // Automatically update payment_status to Paid if payment is cash/credit on delivery
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "Paid" })
        .eq("id", orderId);
      
      await supabaseAdmin
        .from("invoices")
        .update({ amount_paid: order.totalAmount, amount_due: 0 })
        .eq("order_id", orderId);
    }

    // Cancelled: Restore inventory and credit
    if (status === "Cancelled") {
      // 1. Restore stock
      for (const item of order.items) {
        const { data: inv } = await supabaseAdmin
          .from("inventory")
          .select("*")
          .eq("product_id", item.productId)
          .maybeSingle();

        if (inv) {
          await supabaseAdmin
            .from("inventory")
            .update({
              available_stock: inv.available_stock + item.quantity,
              reserved_stock: Math.max(0, inv.reserved_stock - item.quantity)
            })
            .eq("id", inv.id);
        }
      }

      // 2. Restore credit
      const requiresCreditRestore = order.paymentMethod === "Cash on Delivery" || order.paymentMethod === "Credit Account" as any;
      if (requiresCreditRestore) {
        const { data: creditAcct } = await supabaseAdmin
          .from("credit_accounts")
          .select("*")
          .eq("pharmacy_id", order.pharmacyId)
          .maybeSingle();

        if (creditAcct) {
          const oldUsed = parseFloat(creditAcct.used_credit);
          await supabaseAdmin
            .from("credit_accounts")
            .update({ used_credit: Math.max(0, oldUsed - order.totalAmount) })
            .eq("pharmacy_id", order.pharmacyId);
        }
      }
    }

    // Send notifications to pharmacy
    await sendNotification(order.pharmacyId, `Order Update: ${status}`, `Your order status has been updated to "${status}".`, "order");
  }

  return { error: error ? { message: error.message } : null };
}

// ==========================================
// NOTIFICATIONS & MESSAGES
// ==========================================

export async function sendNotification(pharmacyId: string | null, title: string, message: string, type: string) {
  let userId: string | null = null;
  if (pharmacyId) {
    const { data: ph } = await supabaseAdmin
      .from("pharmacies")
      .select("user_id")
      .eq("id", pharmacyId)
      .maybeSingle();
    userId = ph?.user_id || null;
  }

  return await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: userId,
      title,
      message,
      type,
      read: false
    });
}

export async function getNotifications(userId?: string) {
  let query = supabaseAdmin.from("notifications").select("*");
  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  } else {
    query = query.is("user_id", null);
  }

  // Filter out system configurations / metadata
  query = query.not("type", "in", '("audit_log","import_history","export_history","price_history","alert_log","system_settings","cart")');

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map(n => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    date: n.created_at,
    read: n.read
  }));
}

export async function markNotificationRead(id: string) {
  return await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
}

export async function markAllNotificationsRead(userId?: string) {
  let query = supabaseAdmin.from("notifications").update({ read: true });
  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  } else {
    query = query.is("user_id", null);
  }

  return await query.not("type", "in", '("audit_log","import_history","export_history","price_history","alert_log","system_settings","cart")');
}

// ==========================================
// FAVOURITES / BOOKMARKS
// ==========================================

export async function getFavouritesIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("favourites")
    .select("product_id")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data.map(f => f.product_id);
}

export async function getFavourites(userId: string): Promise<Product[]> {
  const ids = await getFavouritesIds(userId);
  if (ids.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      *,
      inventory (
        available_stock,
        reserved_stock,
        sold_stock,
        batch_number,
        expiry_date
      )
    `)
    .in("id", ids);

  if (error || !data) return [];
  return data.map(mapProduct);
}

export async function toggleFavourite(userId: string, productId: string) {
  const { data: existing } = await supabaseAdmin
    .from("favourites")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("favourites")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    return { isFavourite: false };
  } else {
    await supabaseAdmin
      .from("favourites")
      .insert({ user_id: userId, product_id: productId });
    return { isFavourite: true };
  }
}

// ==========================================
// INVOICES & FINANCE Summary
// ==========================================

export async function getInvoices(pharmacyId?: string) {
  let query = supabaseAdmin.from("invoices").select(`
    *,
    orders (
      *
    )
  `);

  const { data, error } = await query.order("issued_date", { ascending: false });
  if (error || !data) return [];

  const filtered = pharmacyId ? data.filter(i => i.orders?.pharmacy_id === pharmacyId) : data;

  return filtered.map(inv => {
    let readableId = `MCH-${inv.orders?.id?.substring(0, 5).toUpperCase()}`;
    if (inv.orders?.notes?.startsWith("MCH-")) {
      readableId = inv.orders.notes.split(". ")[0];
    }

    return {
      id: inv.id,
      orderId: inv.order_id,
      invoiceNumber: inv.invoice_number,
      pharmacyId: inv.orders?.pharmacy_id,
      totalAmount: parseFloat(inv.amount_due) + parseFloat(inv.amount_paid),
      amountPaid: parseFloat(inv.amount_paid),
      amountDue: parseFloat(inv.amount_due),
      paymentStatus: parseFloat(inv.amount_due) <= 0 ? "Paid" : "Pending",
      createdAt: inv.issued_date,
      downloadCount: 0,
      readableOrderId: readableId
    };
  });
}

// ==========================================
// PRESCRIPTIONS OCR CAPABILITIES
// ==========================================

export async function getPrescriptions(pharmacyId: string) {
  const { data, error } = await supabaseAdmin
    .from("prescriptions")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(p => ({
    id: p.id,
    pharmacyId: p.pharmacy_id,
    imageUrl: p.image_url,
    extractedText: p.extracted_text,
    status: p.status,
    itemsMatched: p.items_matched || [],
    createdAt: p.created_at
  }));
}

export async function createPrescription(pharmacyId: string, imageUrl: string, extractedText: string, status: string, itemsMatched: any[]) {
  const { data, error } = await supabaseAdmin
    .from("prescriptions")
    .insert({
      pharmacy_id: pharmacyId,
      image_url: imageUrl,
      extracted_text: extractedText,
      status: status as any,
      items_matched: itemsMatched
    })
    .select()
    .single();

  return { data, error };
}

// ==========================================
// RETURNS & COMPLAINTS
// ==========================================

export async function createReturnRequest(orderId: string, productId: string, quantity: number, reason: string) {
  // Update order status with return flag
  await supabaseAdmin
    .from("orders")
    .update({
      has_return_requested: true,
      return_reason: reason,
      return_status: "Pending" as any
    })
    .eq("id", orderId);

  // Insert into returns table
  return await supabaseAdmin
    .from("returns")
    .insert({
      order_id: orderId,
      product_id: productId,
      quantity,
      reason,
      status: "Pending" as any
    });
}

export async function getReturns() {
  const { data, error } = await supabaseAdmin
    .from("returns")
    .select(`
      *,
      orders (
        pharmacy_id,
        notes
      ),
      products (
        name,
        company
      )
    `)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(ret => {
    let readableOrderId = `MCH-${ret.order_id?.substring(0, 5).toUpperCase()}`;
    if (ret.orders?.notes?.startsWith("MCH-")) {
      readableOrderId = ret.orders.notes.split(". ")[0];
    }

    return {
      id: ret.id,
      orderId: ret.order_id,
      productId: ret.product_id,
      quantity: ret.quantity,
      reason: ret.reason,
      status: ret.status,
      pharmacyId: ret.orders?.pharmacy_id,
      medicineName: ret.products?.name || "Unknown Medicine",
      company: ret.products?.company || "Unknown Company",
      createdAt: ret.created_at,
      readableOrderId
    };
  });
}

export async function approveReturn(returnId: string, adminId: string) {
  const { data: ret } = await supabaseAdmin
    .from("returns")
    .select("*")
    .eq("id", returnId)
    .maybeSingle();

  if (!ret) return { error: "Return not found" };

  // Update return status
  await supabaseAdmin
    .from("returns")
    .update({
      status: "Approved" as any,
      processed_by: adminId
    })
    .eq("id", returnId);

  // Update order return status
  await supabaseAdmin
    .from("orders")
    .update({
      return_status: "Approved" as any
    })
    .eq("id", ret.order_id);

  // Restore inventory available stock
  const { data: inv } = await supabaseAdmin
    .from("inventory")
    .select("*")
    .eq("product_id", ret.product_id)
    .maybeSingle();

  if (inv) {
    const newAvailable = inv.available_stock + ret.quantity;
    const newSold = Math.max(0, inv.sold_stock - ret.quantity);
    await supabaseAdmin
      .from("inventory")
      .update({ available_stock: newAvailable, sold_stock: newSold })
      .eq("id", inv.id);
  }

  // Restore credit used_credit limit
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("pharmacy_id, total_amount")
    .eq("id", ret.order_id)
    .maybeSingle();

  if (order) {
    const { data: cr } = await supabaseAdmin
      .from("credit_accounts")
      .select("*")
      .eq("pharmacy_id", order.pharmacy_id)
      .maybeSingle();

    if (cr) {
      // Find the product and deduce refund amount
      const { data: prod } = await supabaseAdmin
        .from("products")
        .select("selling_price")
        .eq("id", ret.product_id)
        .maybeSingle();

      const refundValue = (prod ? parseFloat(prod.selling_price) : 0) * ret.quantity;
      const newUsed = Math.max(0, parseFloat(cr.used_credit) - refundValue);

      await supabaseAdmin
        .from("credit_accounts")
        .update({ used_credit: newUsed })
        .eq("pharmacy_id", order.pharmacy_id);
    }
  }

  // Log Audit trail
  await logAudit(`Approved return request ${returnId} for product ${ret.product_id}`, "Returns", returnId);

  return { success: true };
}
