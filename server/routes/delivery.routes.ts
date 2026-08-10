import { Router } from "express";
import * as dbService from "../../src/lib/dbService.js";
import { requireRole } from "../middleware.js";

const router = Router();

router.get("/dashboard", requireRole(["Admin", "Delivery Staff"]), (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the MediChain Delivery Companion API.",
    role: req.user.role,
    capabilities: ["View Assigned Deliveries", "Update Delivery Status", "Mark Delivered"],
    timestamp: new Date().toISOString()
  });
});

router.get("/orders", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const assignedDeliveries = orders.filter((o: any) => o.status === "Packed" || o.status === "Out for Delivery");
    res.json({ success: true, orders: assignedDeliveries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/status/:id", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  const { status, otp, notes } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Missing status parameter." });
  }
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (status === "Delivered") {
      if (!otp || String(otp) !== String(order.handoverOtp)) {
        return res.status(400).json({ error: "Invalid OTP. Handover verification failed." });
      }
    }

    let finalNotes = order.notes || "";
    if (status === "Failed" && notes) {
      finalNotes = finalNotes ? `${finalNotes}\nFailure Reason: ${notes}` : `Failure Reason: ${notes}`;
    }

    const { error } = await dbService.updateOrderStatus(req.params.id, status, status === "Failed" ? finalNotes : undefined);
    if (error) return res.status(400).json({ error: error.message });

    const io = req.app.get("io");
    if (io) {
      const updated = await dbService.getOrderById(req.params.id);
      io.to(`order_${req.params.id}`).emit("order_status_updated", updated);
      io.to("role_Admin").emit("admin_order_updated", updated);
    }

    res.json({ success: true, message: `Delivery Status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const completedDeliveries = orders.filter(
      (o: any) => o.status === "Delivered" || o.status === "Completed" || o.status === "Failed"
    );
    res.json({ success: true, orders: completedDeliveries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
