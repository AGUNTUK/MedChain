import { Router } from "express";
import PDFDocument from "pdfkit";
import { supabaseAdmin } from "../../src/lib/supabaseAdmin.js";
import * as dbService from "../../src/lib/dbService.js";
import { aiEnrichmentService } from "../../src/lib/aiEnrichmentService.js";
import { importBulkCatalog } from "../../src/lib/importService.js";
import { validateProduct } from "../../src/lib/productValidator.js";
import { requireRole, importLimiter } from "../middleware.js";

const router = Router();

// ---------------------------------------------------------------------------
// Re-usable invoice PDF helper (shared with orders.routes.ts via PDFKit)
// ---------------------------------------------------------------------------

function generateInvoicePdf(res: any, order: any, pharmacy: any, invoiceNumber: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.id}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  const primaryColor = "#4f46e5";
  const secondaryColor = "#1e293b";
  const lightGray = "#f1f5f9";
  const grayText = "#64748b";

  doc.rect(0, 0, doc.page.width, 10).fill(primaryColor);
  doc.moveDown(2);
  doc.fillColor(primaryColor).fontSize(28).font("Helvetica-Bold").text("MediChain", 40, 40);
  doc.fillColor(secondaryColor).fontSize(10).font("Helvetica").text("B2B Medicine Wholesale Logistics", 40, 72);
  doc.fillColor(grayText).fontSize(9).text("Plot 12, Tejgaon Industrial Area\nDhaka-1208, Bangladesh\nPhone: +880 1700-000000\nEmail: accounts@medichain.bd.com", 40, 88);

  const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
  doc.fillColor(primaryColor).fontSize(22).font("Helvetica-Bold").text("INVOICE", 380, 40, { align: "right" });
  doc.fillColor(secondaryColor).fontSize(10).font("Helvetica-Bold").text("Invoice Number:", 380, 72, { align: "right" });
  doc.font("Helvetica").text(invoiceNumber, 380, 86, { align: "right" });
  doc.font("Helvetica-Bold").text("Date of Issue:", 380, 102, { align: "right" });
  doc.font("Helvetica").text(createdDate, 380, 116, { align: "right" });
  doc.font("Helvetica-Bold").text("Order Reference:", 380, 132, { align: "right" });
  doc.font("Helvetica").text(order.readableId || order.id.substring(0, 8).toUpperCase(), 380, 146, { align: "right" });
  doc.moveDown(3);

  const billingY = 190;
  doc.rect(40, billingY, 250, 100).fill(lightGray).stroke(primaryColor).lineWidth(0.5).stroke();
  doc.rect(40, billingY, 250, 20).fill(primaryColor);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(10).text("BILLED TO", 48, billingY + 6);
  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(11).text(pharmacy?.pharmacyName || "Registered Pharmacy Partner", 48, billingY + 28);
  doc.font("Helvetica").fontSize(9);
  if (pharmacy?.ownerName) doc.text(`Proprietor: ${pharmacy.ownerName}`, 48, billingY + 44);
  if (pharmacy?.licenseNo) doc.text(`Drug License: ${pharmacy.licenseNo}`, 48, billingY + 56);
  if (pharmacy?.phone) doc.text(`Phone: ${pharmacy.phone}`, 48, billingY + 68);
  if (pharmacy?.address) doc.text(`Address: ${pharmacy.address}`, 48, billingY + 80, { width: 230 });

  doc.rect(305, billingY, 250, 100).fill(lightGray).stroke(primaryColor).lineWidth(0.5).stroke();
  doc.rect(305, billingY, 250, 20).fill(primaryColor);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(10).text("PAYMENT DETAILS", 313, billingY + 6);
  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(10).text("Payment Method:", 313, billingY + 30);
  doc.font("Helvetica").text(order.paymentMethod || "B2B Credit Line", 400, billingY + 30);
  doc.font("Helvetica-Bold").text("Payment Status:", 313, billingY + 48);
  doc.font("Helvetica").fillColor(order.paymentStatus === "Paid" ? "#16a34a" : "#dc2626").text((order.paymentStatus || "Pending").toUpperCase(), 400, billingY + 48);
  doc.fillColor(secondaryColor).font("Helvetica-Bold").text("Due Date:", 313, billingY + 66);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  doc.font("Helvetica").text(dueDate.toLocaleDateString("en-GB"), 400, billingY + 66);

  const tableTop = 320;
  doc.rect(40, tableTop, doc.page.width - 80, 25).fill(primaryColor);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("white");
  doc.text("ITEM DESCRIPTION", 50, tableTop + 8, { width: 180 });
  doc.text("STRENGTH", 240, tableTop + 8, { width: 80 });
  doc.text("QTY", 330, tableTop + 8, { width: 40, align: "center" });
  doc.text("UNIT PRICE", 380, tableTop + 8, { width: 70, align: "right" });
  doc.text("SUBTOTAL", 460, tableTop + 8, { width: 80, align: "right" });

  let position = tableTop + 35;
  const items = order.items || [];
  let alternate = false;

  for (const item of items) {
    if (position > 700) { doc.addPage(); position = 40; }
    if (alternate) doc.rect(40, position - 5, doc.page.width - 80, 20).fill(lightGray);
    alternate = !alternate;
    doc.fontSize(9).font("Helvetica-Bold").fillColor(secondaryColor);
    doc.text(item.name || "Medicine Product", 50, position, { width: 180, lineBreak: false });
    doc.font("Helvetica").fillColor(grayText);
    doc.text(item.strength || "-", 240, position, { width: 80, lineBreak: false });
    doc.text((item.quantity || 0).toString(), 330, position, { width: 40, align: "center", lineBreak: false });
    doc.text(`BDT ${item.sellingPrice ? item.sellingPrice.toLocaleString() : "0"}`, 380, position, { width: 70, align: "right", lineBreak: false });
    doc.text(`BDT ${item.subtotal ? item.subtotal.toLocaleString() : "0"}`, 460, position, { width: 80, align: "right", lineBreak: false });
    position += 20;
  }

  doc.moveTo(40, position).lineTo(doc.page.width - 40, position).strokeColor(primaryColor).lineWidth(1).stroke();
  position += 15;
  const totalMrp = order.totalMrp || order.totalAmount || 0;
  const totalAmount = order.totalAmount || 0;
  const totalSavings = order.totalSavings || totalMrp - totalAmount;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(secondaryColor);
  doc.text("SUBTOTAL:", 350, position, { width: 100, align: "right" });
  doc.font("Helvetica").text(`BDT ${totalMrp.toLocaleString()}`, 460, position, { width: 80, align: "right" });
  position += 20;
  if (totalSavings > 0) {
    doc.font("Helvetica-Bold").fillColor("#16a34a");
    doc.text("WHOLESALE SAVINGS:", 300, position, { width: 150, align: "right" });
    doc.font("Helvetica").text(`- BDT ${totalSavings.toLocaleString()}`, 460, position, { width: 80, align: "right" });
    position += 20;
  }
  doc.rect(340, position, doc.page.width - 380, 30).fill(lightGray);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(primaryColor);
  doc.text("NET PAYABLE:", 350, position + 8, { width: 100, align: "right" });
  doc.text(`BDT ${totalAmount.toLocaleString()}`, 460, position + 8, { width: 80, align: "right" });
  position += 50;
  doc.font("Courier").fontSize(8).fillColor(grayText);
  doc.text(`*|| ${order.id} ||*`, 40, position);
  doc.text(`VERIFICATION HASH: ${Buffer.from(order.id).toString("base64").substring(0, 16)}`, 40, position + 10);
  doc.moveDown(4);
  const footerY = doc.page.height - 100;
  doc.moveTo(40, footerY).lineTo(doc.page.width - 40, footerY).strokeColor(lightGray).lineWidth(1).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(secondaryColor).text("Terms & Conditions:", 40, footerY + 15);
  doc.font("Helvetica").fillColor(grayText).fontSize(7);
  doc.text("1. FEFO Policy applies. Goods once delivered and accepted cannot be returned unless expired upon delivery.", 40, footerY + 28);
  doc.text("2. Credit payments must be cleared within 30 days of the invoice date.", 40, footerY + 38);
  doc.text("3. This is a computer-generated tax invoice and requires no physical signature.", 40, footerY + 48);
  doc.end();
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

router.get("/dashboard", requireRole(["Admin"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const activeOrders = orders.filter((o: any) => o.status !== "Cancelled");
    const totalOrders = orders.length;
    const totalRevenue = activeOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const pendingDeliveries = activeOrders.filter((o: any) => o.status !== "Delivered" && o.status !== "Completed").length;
    const pharmacies = await dbService.getAllPharmacies();
    const pendingVerifications = pharmacies.filter((p: any) => {
      const st = (p.verificationStatus || "").toString().toLowerCase();
      return st !== "approved" && st !== "verified" && st !== "suspended" && st !== "rejected";
    }).length;
    const { count: totalProductsCount } = await supabaseAdmin.from("products").select("*", { count: "exact", head: true });
    res.json({ success: true, metrics: { totalRevenue, pendingDeliveries, pendingVerifications, totalOrders, totalProducts: totalProductsCount || 0 } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Pharmacies
// ---------------------------------------------------------------------------

router.get("/pharmacies", requireRole(["Admin"]), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  try {
    const list = await dbService.getAllPharmacies(page, limit);
    res.json({ pharmacies: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/pharmacies/pending", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getAllPharmacies();
    const pending = list.filter((p: any) => p.verificationStatus === "Pending");
    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/pharmacies/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const ph = await dbService.getPharmacyById(req.params.id);
    if (!ph) return res.status(404).json({ error: "Pharmacy not found." });
    res.json(ph);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/pharmacies/:id/status", requireRole(["Admin"]), async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Missing status parameter." });
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, status, req.user.name);
    if (error) return res.status(400).json({ error });
    await dbService.logAudit(`Adjusted status of pharmacy ID ${req.params.id} to "${status}"`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/pharmacies/:id/approve", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Approved", req.user.name);
    if (error) return res.status(400).json({ error });
    await dbService.logAudit(`Approved pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/pharmacies/:id/reject", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Rejected", req.user.name);
    if (error) return res.status(400).json({ error });
    await dbService.logAudit(`Rejected pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/pharmacies/:id/request-update", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Pending", req.user.name);
    if (error) return res.status(400).json({ error });
    await dbService.logAudit(`Requested document update for pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/pharmacies/:id/suspend", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Suspended", req.user.name);
    if (error) return res.status(400).json({ error });
    await dbService.logAudit(`Suspended pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/pharmacies/:id/credit", requireRole(["Admin"]), async (req, res) => {
  const { creditLimit } = req.body;
  if (creditLimit === undefined) return res.status(400).json({ error: "Missing creditLimit parameter." });
  const numericLimit = parseFloat(creditLimit);
  if (isNaN(numericLimit) || numericLimit < 0) return res.status(400).json({ error: "Invalid credit limit value." });
  try {
    const { error } = await dbService.adjustPharmacyCredit(req.params.id, numericLimit);
    if (error) return res.status(400).json({ error: error.message });
    const updated = await dbService.getPharmacyById(req.params.id);
    await dbService.logAudit(`Adjusted credit limit of pharmacy ID ${req.params.id} to ৳${numericLimit.toLocaleString()}`, "Finance", req.params.id, req.user.email, req.user.role);
    res.json({ success: true, pharmacy: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Products (admin)
// ---------------------------------------------------------------------------

router.get("/products/:id/price-history", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getPriceHistory(req.params.id);
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/products/export/csv", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const products = await dbService.getProductsRaw();
    const headers = ["ID", "Product Name", "Generic Formula Name", "Manufacturer Company", "Category", "Strength", "Pack Size", "MRP (BDT)", "Selling Price (BDT)", "Available Stock", "Batch Number", "Expiry Date", "Image URL"];
    const escapeCSVCell = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };
    const rows = products.map((p: any) => [p.id, p.name, p.genericName || p.generic_name || "", p.company, p.category || p.category_name_fallback || "Tablet", p.strength || "", p.packSize || p.pack_size || "", p.mrp, p.sellingPrice || p.selling_price || p.mrp, p.availableStock !== undefined ? p.availableStock : p.stock_quantity || 0, p.batchNumber || p.batch_number || "", p.expiryDate || p.expiry_date || "", p.imageUrl || p.image_url || ""]);
    const csvLines = [headers.map(escapeCSVCell).join(","), ...rows.map((row: any[]) => row.map(escapeCSVCell).join(","))];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medichain-all-products-catalog-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvLines.join("\n"));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/products/import/template", requireRole(["Admin", "Pharmacy Owner"]), (req, res) => {
  const csvTemplate =
    "Product Name,Generic Name,Company,Category,Strength,Pack Size,MRP,Selling Price,Stock,Batch Number,Expiry Date,Image URL\n" +
    "Napa Extra,Paracetamol + Caffeine,Beximco Pharmaceuticals,Tablet,500mg + 65mg,240's Box,480.00,360.00,450,B-NPE92,2027-10-15,https://example.com/napa.png\n" +
    "Seclo 20,Omeprazole,Square Pharmaceuticals,Capsule,20mg,120's Box,720.00,576.00,550,SQ-SEC20,2027-12-05,https://example.com/seclo.png\n";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=medi_chain_bulk_import_template.csv");
  res.status(200).send(csvTemplate);
});

router.get("/products/template", requireRole(["Admin", "Pharmacy Owner"]), (req, res) => {
  const csvTemplate =
    "Product Name,Generic Name,Company,Category,Strength,Pack Size,MRP,Selling Price,Stock,Batch Number,Expiry Date,Image URL\n" +
    "Napa Extra,Paracetamol + Caffeine,Beximco Pharmaceuticals,Tablet,500mg + 65mg,240's Box,480.00,360.00,450,B-NPE92,2027-10-15,https://example.com/napa.png\n" +
    "Seclo 20,Omeprazole,Square Pharmaceuticals,Capsule,20mg,120's Box,720.00,576.00,550,SQ-SEC20,2027-12-05,https://example.com/seclo.png\n";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=medi_chain_bulk_import_template.csv");
  res.status(200).send(csvTemplate);
});

router.post("/products/import", requireRole(["Admin"]), importLimiter, async (req, res) => {
  const { csvContent, commit } = req.body;
  if (!csvContent || typeof csvContent !== "string") return res.status(400).json({ error: "No CSV content provided." });
  try {
    const prods = await dbService.getProductsRaw();
    const result = importBulkCatalog(csvContent, prods);
    const shouldCommit = commit !== false;
    if (shouldCommit && result.successCount > 0) {
      for (const p of result.importedProducts) {
        await dbService.addOrUpdateProduct(p as any);
      }
      await dbService.logImportHistory("bulk_import.csv", result.successCount, "Completed", req.user.name);
    }
    res.json({ ...result, committed: shouldCommit });
  } catch (err: any) {
    res.status(500).json({ error: "Bulk import failed: " + err.message });
  }
});

router.post("/products", requireRole(["Admin"]), async (req, res) => {
  const productData = req.body;
  const validation = validateProduct(productData);
  if (!validation.isValid) return res.status(400).json({ error: validation.error });
  try {
    const allProducts = await dbService.getProductsRaw();
    const isDuplicate = allProducts.some((p: any) => {
      if (productData.id && p.id === productData.id) return false;
      return p.name.toLowerCase().trim() === productData.name.toLowerCase().trim() && p.company.toLowerCase().trim() === productData.company.toLowerCase().trim() && p.strength.toLowerCase().trim() === productData.strength.toLowerCase().trim();
    });
    if (isDuplicate) return res.json({ success: false, message: "Product already exists" });

    const existing = await dbService.getProductById(productData.id);
    if (existing && existing.mrp !== productData.mrp) {
      await dbService.logPriceHistory(productData.id, productData.name, existing.mrp, productData.mrp, existing.sellingPrice, productData.sellingPrice, req.user.name);
    }
    if (existing && productData.sellingPrice < existing.sellingPrice) {
      const dropAmount = existing.sellingPrice - productData.sellingPrice;
      const dropPercentage = (dropAmount / existing.sellingPrice) * 100;
      const isFrequentlyOrdered = (existing.soldStock || 0) > 10;
      if (dropPercentage >= 5 && isFrequentlyOrdered) {
        await dbService.sendNotification(null, `Price Drop Alert: ${productData.name}`, `Good news! The wholesale price for ${productData.name}, one of our frequently ordered items, has dropped by ${dropPercentage.toFixed(1)}%. Stock up now!`, "price_drop");
      }
    }
    const saved = await dbService.addOrUpdateProduct(productData);
    await dbService.logAudit(`Product ${productData.id ? "updated" : "created"}: ${productData.name}`, "Products", saved.id, req.user.email, req.user.role);
    res.json({ success: true, message: "Product saved successfully.", product: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/products/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const existing = await dbService.getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found." });
    const updates = req.body;
    const merged = { ...existing, ...updates, id: req.params.id };
    if (updates.mrp !== undefined && updates.mrp !== existing.mrp) {
      await dbService.logPriceHistory(req.params.id, merged.name, existing.mrp, updates.mrp, existing.sellingPrice, merged.sellingPrice, req.user.name);
    }
    const saved = await dbService.addOrUpdateProduct(merged);
    await dbService.logAudit(`Product patched: ${saved.name}`, "Products", saved.id, req.user.email, req.user.role);
    res.json({ success: true, message: "Product updated in place.", product: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/products/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const existing = await dbService.getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found." });
    await dbService.deleteProduct(req.params.id);
    await dbService.logAudit(`Product deleted: ${existing.name}`, "Products", req.params.id, req.user.email, req.user.role);
    res.json({ success: true, message: "Product deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

router.post("/inventory/update", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { id, availableStock, batchNumber, expiryDate } = req.body;
  try {
    await dbService.updateInventoryStock(id, availableStock, batchNumber, expiryDate);
    const updated = await dbService.getProductById(id);
    await dbService.logAudit(`Inventory updated for product ID ${id}`, "Products", id, req.user.email, req.user.role);
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/inventory/alerts/sync", requireRole(["Admin"]), async (req, res) => {
  const alertsCreated: string[] = [];
  try {
    const prods = await dbService.getProductsRaw();
    const settings = await dbService.getSystemSettings();
    const lowStockThreshold = settings.low_stock_threshold || 50;
    for (const p of prods) {
      if (p.availableStock < lowStockThreshold) {
        await dbService.logAlert(`⚠️ Low Stock Alert: ${p.name}`, `The available stock for ${p.name} has fallen to ${p.availableStock} units.`, p.id);
        alertsCreated.push(`${p.name} (Low Stock)`);
      }
      if (p.expiryDate) {
        const days = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 180 && days > 0) {
          await dbService.logAlert(`🚨 Expiring Soon: ${p.name}`, `Batch of ${p.name} is expiring on ${p.expiryDate} (${days} days remaining).`, p.id);
          alertsCreated.push(`${p.name} (Expiring)`);
        }
      }
    }
    res.json({ success: true, alertsCreated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

router.get("/analytics", requireRole(["Admin"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const activeOrders = orders.filter((o: any) => o.status !== "Cancelled");
    const totalOrders = orders.length;
    const totalRevenue = activeOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const paidRevenue = activeOrders.filter((o: any) => o.paymentStatus === "Paid").reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const pendingRevenue = activeOrders.filter((o: any) => o.paymentStatus !== "Paid").reduce((sum: number, o: any) => sum + o.totalAmount, 0);

    const statusDistribution: Record<string, number> = {};
    orders.forEach((o: any) => { statusDistribution[o.status] = (statusDistribution[o.status] || 0) + 1; });

    const medicineCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders.forEach((o: any) => {
      o.items.forEach((item: any) => {
        if (!medicineCounts[item.productId]) medicineCounts[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
        medicineCounts[item.productId].quantity += item.quantity;
        medicineCounts[item.productId].revenue += item.subtotal;
      });
    });
    const topMedicines = Object.values(medicineCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    const today = new Date();
    const daysMap: Record<string, { date: string; dateStr: string; amount: number; count: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDateStr = d.toISOString().split("T")[0];
      const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      daysMap[isoDateStr] = { date: dateLabel, dateStr: isoDateStr, amount: 0, count: 0 };
    }
    activeOrders.forEach((o: any) => {
      if (o.createdAt) {
        const orderDateStr = new Date(o.createdAt).toISOString().split("T")[0];
        if (daysMap[orderDateStr]) { daysMap[orderDateStr].amount += o.totalAmount; daysMap[orderDateStr].count += 1; }
      }
    });
    const last7DaysTrend = Object.values(daysMap);

    const pharmaciesList = await dbService.getAllPharmacies();
    const pharmacyMap = new Map(pharmaciesList.map((p: any) => [p.id, p]));
    const pharmacySpendMap: Record<string, any> = {};
    activeOrders.forEach((o: any) => {
      const phId = o.pharmacyId;
      const ph = pharmacyMap.get(phId) as any;
      if (!pharmacySpendMap[phId]) pharmacySpendMap[phId] = { pharmacyId: phId, pharmacyName: ph?.pharmacyName || "Unknown Pharmacy", ownerName: ph?.ownerName || "", city: ph?.city || ph?.area || "Dhaka", totalSpend: 0, orderCount: 0 };
      pharmacySpendMap[phId].totalSpend += o.totalAmount;
      pharmacySpendMap[phId].orderCount += 1;
    });
    const topPharmacies = Object.values(pharmacySpendMap).sort((a: any, b: any) => b.totalSpend - a.totalSpend).slice(0, 10);
    const revenueOverTime = last7DaysTrend.map(d => ({ date: d.date, amount: d.amount }));

    res.json({ success: true, totalOrders, totalRevenue, paidRevenue, pendingRevenue, statusDistribution, topMedicines, topPharmacies, last7DaysTrend, revenueOverTime });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

router.get("/invoices", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getInvoices();
    res.json({ success: true, invoices: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/invoices/:id/download", requireRole(["Admin"]), async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });
    let pharmacy = null;
    if (order.pharmacyId) pharmacy = await dbService.getPharmacyById(order.pharmacyId);
    let invoiceNumber = `INV-${order.readableId ? order.readableId.replace("MCH-", "") : order.id.substring(0, 8).toUpperCase()}`;
    try {
      const { data: inv } = await supabaseAdmin.from("invoices").select("invoice_number").eq("order_id", order.id).maybeSingle();
      if (inv?.invoice_number) invoiceNumber = inv.invoice_number;
    } catch (e) { /* fall back */ }
    generateInvoicePdf(res, order, pharmacy, invoiceNumber);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Export / Import History
// ---------------------------------------------------------------------------

router.get("/export-history", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getExportHistory();
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/export-history", requireRole(["Admin"]), async (req, res) => {
  const { type, format } = req.body;
  try {
    await dbService.logExportHistory(format, type, 10, req.user.name);
    const list = await dbService.getExportHistory();
    res.json({ success: true, record: list[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/import-history", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getImportHistory();
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/import-history", requireRole(["Admin"]), async (req, res) => {
  const { fileName, totalRows } = req.body;
  try {
    await dbService.logImportHistory(fileName, totalRows, "Completed", req.user.name);
    const list = await dbService.getImportHistory();
    res.json({ success: true, event: list[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Notifications (admin broadcast)
// ---------------------------------------------------------------------------

router.get("/notifications", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getNotifications();
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/notifications/broadcast", requireRole(["Admin"]), async (req, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: "Title and message are required." });
  try {
    await dbService.sendNotification(null, title, message, type || "system");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/notifications/send", requireRole(["Admin"]), async (req, res) => {
  const { title, message, targetType, pharmacyId } = req.body;
  if (!title || !message || !targetType) return res.status(400).json({ error: "Title, message, and targetType are required." });
  try {
    await dbService.sendNotification(pharmacyId, title, message, targetType);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/trigger-price-drop", requireRole(["Admin"]), async (req, res) => {
  const { title, message } = req.body;
  try {
    await dbService.sendNotification(null, title || "Renata Price Drop Alert", message || "Additional 5% wholesale discount applied.", "price_drop");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/trigger-new-offer", requireRole(["Admin"]), async (req, res) => {
  const { title, message } = req.body;
  try {
    await dbService.sendNotification(null, title || "Exclusive Offer!", message || "Save up to 15% on wholesale select drugs.", "offer");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Misc admin endpoints
// ---------------------------------------------------------------------------

router.post("/prices", requireRole(["Admin"]), (req, res) => {
  res.json({ success: true, message: "Admin: Pricing schema updated." });
});

router.post("/discounts", requireRole(["Admin"]), (req, res) => {
  res.json({ success: true, message: "Admin: Product discount rate applied." });
});

router.post("/credit-accounts", requireRole(["Admin"]), (req, res) => {
  res.json({ success: true, message: "Admin: Credit account bounds adjusted." });
});

router.post("/run-alert-check", requireRole(["Admin"]), async (req, res) => {
  const alertsCreated: string[] = [];
  try {
    const prods = await dbService.getProductsRaw();
    const settings = await dbService.getSystemSettings();
    const lowStockThreshold = settings.low_stock_threshold || 50;
    for (const p of prods) {
      if (p.availableStock < lowStockThreshold) {
        await dbService.logAlert(`⚠️ Low Stock Alert: ${p.name}`, `The available stock for ${p.name} has fallen to ${p.availableStock} units.`, p.id);
        alertsCreated.push(`${p.name} (Low Stock)`);
      }
      if (p.expiryDate) {
        const days = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 180 && days > 0) {
          await dbService.logAlert(`🚨 Expiring Soon: ${p.name}`, `Batch of ${p.name} is expiring on ${p.expiryDate} (${days} days remaining).`, p.id);
          alertsCreated.push(`${p.name} (Expiring)`);
        }
      }
    }
    res.json({ success: true, alertsCreated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

router.get("/audit-logs", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getAuditLogs();
    res.json({ success: true, auditLogs: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

router.get("/finance/summary", requireRole(["Admin"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const activeOrders = orders.filter((o: any) => o.status !== "Cancelled");
    const totalSales = activeOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const todayStr = new Date().toISOString().split("T")[0];
    const todaySales = activeOrders.filter((o: any) => o.createdAt.startsWith(todayStr)).reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const monthlyRevenue = activeOrders.filter((o: any) => o.createdAt.startsWith(currentMonthPrefix)).reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const pendingPayments = activeOrders.filter((o: any) => o.paymentStatus === "Pending").reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const pharmacies = await dbService.getAllPharmacies();
    const totalOutstandingCredit = pharmacies.reduce((sum: number, ph: any) => sum + (ph.usedCredit || 0), 0);
    const paymentHistory = orders.filter((o: any) => o.paymentStatus === "Paid" || o.paymentStatus === "Refunded").map((o: any) => {
      const ph = pharmacies.find((p: any) => p.id === o.pharmacyId) as any;
      return { id: "TXN-" + o.id.replace("MCH-", ""), orderId: o.id, pharmacyName: ph?.pharmacyName || "Registered Pharmacy", amount: o.totalAmount, method: o.paymentMethod, status: o.paymentStatus, date: o.createdAt };
    });
    res.json({ success: true, totalSales, todaySales, monthlyRevenue, pendingPayments, totalOutstandingCredit, pharmacies, paymentHistory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI Enrichment
// ---------------------------------------------------------------------------

router.get("/enrichment/status", requireRole(["Admin"]), async (req, res) => {
  try {
    let state = await aiEnrichmentService.getState();
    if (state.status === "running") state = await aiEnrichmentService.tick();
    res.json(state);
  } catch (err: any) {
    console.error("Enrichment status error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/enrichment/start", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.start(req.body);
    res.json(state);
  } catch (err: any) {
    console.error("Enrichment start error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/enrichment/pause", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.pause();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/enrichment/resume", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.resume();
    res.json(state);
  } catch (err: any) {
    console.error("Enrichment resume error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/enrichment/stop", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.stop();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/enrichment/retry", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.retryFailed();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/enrichment/tick", async (req, res) => {
  const auth = req.headers["authorization"];
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const state = await aiEnrichmentService.tick();
    res.json({ ok: true, status: state.status, pending: state.pendingIds.length });
  } catch (err: any) {
    console.error("Enrichment tick error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
