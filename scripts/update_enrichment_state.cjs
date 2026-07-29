const fs = require('fs');
let content = fs.readFileSync('src/lib/aiEnrichmentService.ts', 'utf-8');

// Remove local fs stuff
content = content.replace(/import fs from "fs";\nimport path from "path";\n/, '');
content = content.replace(/const DATA_DIR = path\.join\(process\.cwd\(\), "data"\);\nconst STATE_FILE = path\.join\(DATA_DIR, "enrichment_state\.json"\);\n\nif \(\!fs\.existsSync\(DATA_DIR\)\) \{\n  fs\.mkdirSync\(DATA_DIR, \{ recursive: true \}\);\n\}\n/, '');

// Add cloud sync functions
const cloudSync = `
// --- Cloud State Persistence ---
async function loadStateFromCloud() {
  try {
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("message")
      .eq("type", "ai_enrichment_state")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const cloudState = JSON.parse(data[0].message);
      // Merge, but keep logs limited in memory
      state = { ...DEFAULT_STATE, ...cloudState, logs: state.logs };
      if (state.status === "running") {
        state.status = "paused"; // Pause if resuming from crash
      }
    }
  } catch (e) {
    console.error("Failed to load enrichment state from cloud", e);
  }
}

async function saveStateToCloud() {
  try {
    const stateToSave = { ...state, logs: [] }; // Don't bloat the state object with logs
    const { data } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("type", "ai_enrichment_state")
      .limit(1);

    if (data && data.length > 0) {
      await supabaseAdmin.from("notifications").update({ message: JSON.stringify(stateToSave), created_at: new Date().toISOString() }).eq("id", data[0].id);
    } else {
      await supabaseAdmin.from("notifications").insert({
        title: "AI Enrichment State",
        message: JSON.stringify(stateToSave),
        type: "ai_enrichment_state",
        read: true
      });
    }
  } catch (e) {
    console.error("Failed to save enrichment state to cloud", e);
  }
}
`;

content = content.replace(
  /\/\/ Load state from disk[\s\S]*?const saveState = \(\) => \{\n  try \{\n    fs\.writeFileSync\(STATE_FILE, JSON\.stringify\(state, null, 2\)\);\n  \} catch \(e\) \{\n    console\.error\("Failed to save enrichment state", e\);\n  \}\n\};/,
  cloudSync
);

content = content.replace(/saveState\(\);/g, 'saveStateToCloud();');

// Also update addLog to write to cloud audit
const newAddLog = `
async function addLog(log: Omit<EnrichmentLog, "timestamp">) {
  const fullLog = { ...log, timestamp: new Date().toISOString() };
  state.logs.unshift(fullLog);
  if (state.logs.length > 500) state.logs.pop();
  
  // Persist important logs to cloud
  if (log.status === "error" || log.status === "needs_review" || log.status === "success") {
    try {
      await supabaseAdmin.from("notifications").insert({
        title: \`Enrichment \${log.status}: \${log.productName}\`,
        message: JSON.stringify(fullLog),
        type: "ai_enrichment_job_log",
        related_id: log.productId,
        read: true
      });
    } catch(e) {}
  }
}
`;
content = content.replace(/const addLog = \([\s\S]*?\}\n\};/m, newAddLog);

fs.writeFileSync('src/lib/aiEnrichmentService.ts', content);
console.log('Done');
