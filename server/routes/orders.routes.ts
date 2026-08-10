import { Router } from "express";
import PDFDocument from "pdfkit";
import { supabaseAdmin } from "../../src/lib/supabaseAdmin.js";
import * as dbService from "../../src/lib/dbService.js";
import { requireAuth, requireRole } from "../middleware.js";

const router = Router();

// ---------------------------------------------------------------------------
// Invoice PDF generator (shared helper)
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
  doc
    .fillColor(grayText)
    .fontSize(9)
    .text("Plot 12, Tejgaon Industrial Area\nDhaka-1208, Bangladesh\nPhone: +880 1700-000000\nEmail: accounts@medichain.bd.com", 40, 88);

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
  doc
    .font("Helvetica")
    .fillColor(order.paymentStatus === "Paid" ? "#16a34a" : "#dc2626")
    .text((order.paymentStatus || "Pending").toUpperCase(), 400, billingY + 48);

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
    if (position > 700) {
      doc.addPage();
      position = 40;
    }

    if (alternate) {
      doc.rect(40, position - 5, doc.page.width - 80, 20).fill(lightGray);
    }
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
// Routes
// ---------------------------------------------------------------------------

router.get("/orders", requireAuth, async (req, res) => {
  try {
    let user = await dbService.getUserById(req.user.id).catch(() => null);
    if (!user) user = req.user;
    if (user?.role === "Pharmacy Owner") {
      const pharmacy = await dbService.getPharmacyProfile(req.user.id);
      if (!pharmacy) return res.json([]);
      const orders = await dbService.getOrders(pharmacy.id);
      return res.json(orders);
    } else if (user?.role === "Admin" || user?.role === "Depot Staff" || user?.role === "Delivery Staff") {
      const orders = await dbService.getOrders();
      return res.json(orders);
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders", requireAuth, async (req, res) => {
  const { paymentMethod, notes, deliveryAddress, paymentStatus, transactionId } = req.body;

  try {
    const cartItems = await dbService.getCart(req.user.id);
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const itemIds = cartItems.map((item: any) => String(item.productId || "").trim()).filter(Boolean);
    if (itemIds.length === 0) {
      return res.status(400).json({ error: "No valid product items in your cart." });
    }

    let { data: products, error } = await supabaseAdmin.from("products").select("*").in("id", itemIds);

    if (error) {
      console.error("Error querying products during order creation:", error);
      return res.status(400).json({ error: `Failed to query products: ${error.message}` });
    }

    const productMap = new Map<string, any>();
    (products || []).forEach((p: any) => {
      if (p.id) productMap.set(String(p.id).trim().toLowerCase(), p);
    });

    const validItemIds = [];
    for (const itemId of itemIds) {
      const normalizedId = String(itemId).trim().toLowerCase();
      if (!productMap.has(normalizedId)) {
        const directProd = await dbService.getProductById(itemId);
        if (directProd) {
          productMap.set(normalizedId, directProd);
          validItemIds.push(itemId);
        }
      } else {
        validItemIds.push(itemId);
      }
    }

    if (validItemIds.length === 0) {
      return res.status(400).json({ error: "No valid product items in your cart." });
    }

    const validCartItems = cartItems.filter((item: any) => validItemIds.includes(String(item.productId || "").trim()));

    const pharmacy = await dbService.getPharmacyProfile(req.user.id);
    if (!pharmacy) {
      return res.status(400).json({ error: "Pharmacy verification profile not found." });
    }

    const st = (pharmacy.verificationStatus || "").toString().toLowerCase();
    if (st !== "approved" && st !== "verified") {
      return res.status(403).json({ error: "Your account is pending admin approval. You cannot place orders until verified." });
    }

    const result = await dbService.createOrderTransaction(req.user.id, pharmacy.id, {
      paymentMethod,
      notes,
      paymentStatus,
      transactionId,
      items: validCartItems.map((item: any) => ({ productId: item.productId, quantity: item.quantity })),
      deliveryAddress
    });

    await dbService.saveCart(req.user.id, []);

    res.json({ success: true, orderId: result.order.id, order: result.order });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/payments/process", requireAuth, async (req, res) => {
  const { orderId, paymentMethod, amount, transactionId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: "Missing order ID" });
  }

  try {
    const generatedTrxId =
      transactionId ||
      `PGW-${(paymentMethod || "GATEWAY").toUpperCase().substring(0, 5)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const result = await dbService.processPaymentGatewayTransaction(orderId, paymentMethod || "bKash", generatedTrxId, amount);

    res.json({
      success: true,
      message: `Payment of ৳${result.amount.toLocaleString()} processed successfully via ${paymentMethod || "bKash"} Gateway`,
      transactionId: generatedTrxId,
      orderId: result.orderId,
      status: result.status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Payment processing failed" });
  }
});

router.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/orders/:id/invoice", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    let pharmacy = null;
    if (order.pharmacyId) {
      pharmacy = await dbService.getPharmacyById(order.pharmacyId);
    }

    let invoiceNumber = `INV-${order.readableId ? order.readableId.replace("MCH-", "") : order.id.substring(0, 8).toUpperCase()}`;
    try {
      const { data: inv } = await supabaseAdmin.from("invoices").select("invoice_number").eq("order_id", order.id).maybeSingle();
      if (inv?.invoice_number) invoiceNumber = inv.invoice_number;
    } catch (e) {
      // fall back to default
    }

    generateInvoicePdf(res, order, pharmacy, invoiceNumber);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders/:id/cancel", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status !== "Pending" && order.status !== "Confirmed") {
      return res.status(400).json({ error: "Cannot cancel order that is already being processed." });
    }

    const { error } = await dbService.updateOrderStatus(req.params.id, "Cancelled");
    if (error) return res.status(500).json({ error: error.message });

    const updated = await dbService.getOrderById(req.params.id);
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders/:id/status", requireAuth, async (req, res) => {
  const { status, otp } = req.body;
  const role = req.user.role;

  if (role === "Pharmacy Owner") {
    return res.status(403).json({ error: "Unauthorized. Pharmacy Owners cannot alter order status manually." });
  }

  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (role === "Admin") {
      if (status !== "Confirmed" && status !== "Cancelled") {
        return res.status(403).json({ error: "Admin can only confirm or cancel orders." });
      }
    } else if (role === "Depot Staff") {
      if (status !== "Processing" && status !== "Packed" && status !== "Out for Delivery") {
        return res.status(403).json({ error: "Depot staff can only set Processing, Packed, or Out for Delivery." });
      }
    } else if (role === "Delivery Staff") {
      if (status !== "Out for Delivery" && status !== "Delivered") {
        return res.status(403).json({ error: "Delivery staff can only set Out for Delivery or Delivered." });
      }
      if (status === "Delivered") {
        if (!otp || String(otp) !== String(order.handoverOtp)) {
          return res.status(400).json({ error: "Invalid OTP. Handover verification failed." });
        }
      }
    }

    const { error } = await dbService.updateOrderStatus(req.params.id, status);
    if (error) return res.status(500).json({ error: error.message });

    const updated = await dbService.getOrderById(req.params.id);

    const io = req.app.get("io");
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", updated);
      io.to("role_Admin").emit("admin_order_updated", updated);
    }

    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders/:id/return", requireAuth, async (req, res) => {
  const { reason, productId, quantity } = req.body;
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({ error: "Only delivered orders can be requested for return." });
    }

    const targetProdId = productId || order.items[0]?.productId;
    const targetQty = quantity || order.items[0]?.quantity || 1;

    await dbService.createReturnRequest(req.params.id, targetProdId, targetQty, reason || "Damage");
    const updated = await dbService.getOrderById(req.params.id);
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders/:id/approve-return", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getReturns();
    const rItem = list.find((r: any) => r.orderId === req.params.id);
    if (!rItem) {
      return res.status(404).json({ error: "Return request not found." });
    }

    await dbService.approveReturn(rItem.id, req.user.id);
    const order = await dbService.getOrderById(req.params.id);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders/:id/reorder", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const newCart = [];
    for (const item of order.items) {
      const product = await dbService.getProductById(item.productId);
      if (product) {
        const addQty = Math.min(item.quantity, product.availableStock);
        if (addQty > 0) {
          newCart.push({ productId: item.productId, quantity: addQty });
        }
      }
    }

    await dbService.saveCart(req.user.id, newCart);
    res.json({ success: true, cartCount: newCart.reduce((acc, c) => acc + c.quantity, 0) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
