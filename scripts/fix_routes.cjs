const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

// The routes we want to move:
const routesToMove = `app.post("/api/admin/enrichment/start", requireRole(["Admin"]), async (req, res) => {
  try {
    await aiEnrichmentService.start(req.body);
    res.json({ success: true, message: "Enrichment started" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/enrichment/pause", requireRole(["Admin"]), async (req, res) => {
  aiEnrichmentService.pause();
  res.json({ success: true, message: "Enrichment paused" });
});

app.post("/api/admin/enrichment/resume", requireRole(["Admin"]), async (req, res) => {
  aiEnrichmentService.resume();
  res.json({ success: true, message: "Enrichment resumed" });
});

app.post("/api/admin/enrichment/stop", requireRole(["Admin"]), async (req, res) => {
  aiEnrichmentService.stop();
  res.json({ success: true, message: "Enrichment stopped" });
});

app.post("/api/admin/enrichment/retry", requireRole(["Admin"]), async (req, res) => {
  aiEnrichmentService.retryFailed();
  res.json({ success: true, message: "Failed items reset" });
});`;

// Remove them from where they currently are
content = content.replace(routesToMove, '');

// Put them right after the status route
const statusRoute = `app.get("/api/admin/enrichment/status", requireRole(["Admin"]), async (req, res) => {
  res.json(aiEnrichmentService.getState());
});`;

content = content.replace(statusRoute, statusRoute + '\n\n' + routesToMove);

fs.writeFileSync('server.ts', content);
