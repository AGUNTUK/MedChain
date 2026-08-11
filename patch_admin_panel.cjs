const fs = require('fs');

let adminPanel = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');

// Replace recharts import
adminPanel = adminPanel.replace(/import \{\s*AreaChart,[\s\S]*?Legend\s*\} from "recharts";/, '');

// Add React.lazy and Suspense imports if not present (Suspense is usually imported, but let's just add it dynamically)
// We already have `import React, { useState, useEffect, useMemo } from "react";`
adminPanel = adminPanel.replace(
  'import React, { useState, useEffect, useMemo } from "react";',
  'import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";\n\nconst AdminCharts = lazy(() => import("./AdminCharts"));'
);

// Replace the chart block.
const blockStart = '<div className="space-y-6 animate-fade-in">';
const innerStart = '{/* B2B Analytics Dashboard */}';
const blockEnd = '{/* SCREEN 2: MEDICINE PRODUCT CATALOG MANAGEMENT */}';

const startIndex = adminPanel.indexOf(innerStart);
// Actually, it's easier to replace with a regex or string replacement.
// Let's use string split and join.

const parts = adminPanel.split('{/* B2B Analytics Dashboard */}');
if (parts.length > 1) {
  const endParts = parts[1].split('                      {/* SCREEN 2: MEDICINE PRODUCT CATALOG MANAGEMENT */}');
  
  // We need to keep the space-y-6 animate-fade-in div wrapper which wraps BOTH the dashboard stats AND the charts.
  // Wait, no. The <div className="space-y-6 animate-fade-in"> contains the quick stats AND the charts.
  // Let's check.
}
