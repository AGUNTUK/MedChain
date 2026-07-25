const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `    if (filter === "deals") {
      query = query.order("discount_percentage", { ascending: false });
    } else if (filter === "frequent") {
      query = query.order("sold_stock", { referencedTable: "inventory", ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }`;

const replacement = `    if (filter === "deals") {
      query = query.order("discount_percentage", { ascending: false });
    } else if (filter === "frequent") {
      query = query.order("sold_stock", { referencedTable: "inventory", ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }`;

// Wait, actually I will add a simple cache mechanism in server.ts for get products
