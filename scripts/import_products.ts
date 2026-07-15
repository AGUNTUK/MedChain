
import fs from 'fs';
import { importBulkCatalog } from '../src/lib/importService.js';
import { addOrUpdateProduct, getProductsRaw } from '../src/lib/dbService.js';

async function runImport() {
  const csvContent = fs.readFileSync('./src/raw_products.csv', 'utf-8');
  const existingProducts = await getProductsRaw();
  
  console.log("Starting bulk import...");
  
  const result = importBulkCatalog(csvContent, existingProducts);
  
  console.log(`Import processed. Success: ${result.successCount}, Errors: ${result.errorCount}`);
  
  let processed = 0;
  for (const product of result.importedProducts) {
    await addOrUpdateProduct(product as any);
    processed++;
    if (processed % 10 === 0) console.log(`Processed ${processed} products...`);
  }
  
  console.log("Import completed.");
}

runImport().catch(console.error);
