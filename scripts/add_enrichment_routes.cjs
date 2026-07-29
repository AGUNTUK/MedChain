const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const importStatement = 'import { aiEnrichmentService } from "./src/lib/aiEnrichmentService.js";\n';
if (!content.includes('aiEnrichmentService')) {
  // Find a good place to put it
  const importMatch = content.match(/import .* from .*\n/g);
  const lastImport = importMatch[importMatch.length - 1];
  content = content.replace(lastImport, lastImport + importStatement);
}

const routes = `
// --- AI PRODUCT ENRICHMENT ROUTES ---
app.get("/api/admin/enrichment/status", requireRole(["Admin"]), async (req, res) => {
  res.json(aiEnrichmentService.getState());
});

app.post("/api/admin/enrichment/start", requireRole(["Admin"]), async (req, res) => {
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
});
`;

if (!content.includes('/api/admin/enrichment/status')) {
  // insert before the end
  content = content.replace('const gracefulShutdown', routes + '\n  const gracefulShutdown');
  fs.writeFileSync('server.ts', content);
  console.log("Routes added");
} else {
  console.log("Routes already exist");
}
