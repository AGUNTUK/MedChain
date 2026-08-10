import { Router } from "express";
import * as dbService from "../../src/lib/dbService.js";
import { requireRole } from "../middleware.js";

const router = Router();

router.get("/dashboard", requireRole(["Admin", "Depot Staff"]), (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the MediChain Depot Portal.",
    role: req.user.role,
    capabilities: [
      "View Assigned Orders",
      "Update Packing Status",
      "Manage Inventory",
      "Update Batch Information",
      "Manage Expiry Tracking"
    ],
    timestamp: new Date().toISOString()
  });
});

router.get("/assigned-orders", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const pendingDepotOrders = orders.filter((o: any) => o.status === "Processing" || o.status === "Packed");
    res.json({ success: true, orders: pendingDepotOrders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/orders", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    res.json({ success: true, orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders/:id/accept", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, "Confirmed");
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    const io = req.app.get("io");
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders/:id/process", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, "Processing");
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    const io = req.app.get("io");
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders/:id/pack", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, "Packed");
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    const io = req.app.get("io");
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders/:id/assign-delivery", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { assignedRiderId } = req.body;
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, "Out for Delivery", undefined, assignedRiderId);
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    const io = req.app.get("io");
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/delivery-staff", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { data, error } = await dbService.getDeliveryStaff();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, staff: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/update-packing", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { orderId, status } = req.body;
  if (!orderId || !status) {
    return res.status(400).json({ error: "Missing orderId or status parameter." });
  }
  try {
    const { error } = await dbService.updateOrderStatus(orderId, status);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: `Depot: Order packing status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/batch-info", requireRole(["Admin", "Depot Staff"]), (req, res) => {
  res.json({ success: true, message: "Depot: Expiry logs and batch information updated." });
});

export default router;
