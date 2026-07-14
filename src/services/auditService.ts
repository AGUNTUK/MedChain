export const auditService = {
  async log(action: string, module: string, description: string, entity_type: string, entity_id: string, metadata: any = {}) {
    await fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, module, description, entity_type, entity_id, metadata }),
    });
  },
  async getLogs() {
    const res = await fetch("/api/admin/audit-logs");
    return res.json();
  }
};
