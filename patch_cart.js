const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `    const cartItemsInDb = await dbService.getCart(req.user.id);
    const cartItems = [];
    let cartModified = false;
    
    for (const item of cartItemsInDb) {
      const product = await dbService.getProductById(item.productId);
      if (product) {
        cartItems.push({
          product,
          quantity: item.quantity
        });
      } else {
        cartModified = true;
      }
    }`;

const replacement = `    const cartItemsInDb = await dbService.getCart(req.user.id);
    const cartItems = [];
    let cartModified = false;
    
    if (cartItemsInDb.length > 0) {
      const productIds = cartItemsInDb.map((item: any) => item.productId);
      
      const { data: dbProducts, error } = await dbService.supabaseAdmin
        .from('products')
        .select('*, inventory(available_stock, reserved_stock, sold_stock, batch_number, expiry_date)')
        .in('id', productIds);
        
      if (!error && dbProducts) {
        // Map them
        const productMap = new Map();
        dbProducts.forEach((p: any) => {
          // map it just like getProductById does
          const mrpVal = p.mrp !== undefined && p.mrp !== null ? parseFloat(p.mrp) : 0;
          let sellingVal = 0;
          if (p.selling_price !== undefined && p.selling_price !== null && p.selling_price !== "") {
            sellingVal = parseFloat(p.selling_price);
          } else if (p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== "") {
            sellingVal = parseFloat(p.sellingPrice);
          } else {
            sellingVal = mrpVal;
          }
          
          const inv = Array.isArray(p.inventory) && p.inventory.length > 0 ? p.inventory[0] : (p.inventory || null);
          const stockVal = p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== ""
            ? parseInt(p.stock_quantity, 10)
            : (inv ? (inv.available_stock ?? 0) : (p.availableStock ?? 0));

          productMap.set(p.id, {
            id: String(p.id).trim(),
            name: p.name,
            genericName: p.generic_name || p.genericName || "Generic Medicine",
            company: p.company,
            category: p.category_name_fallback || p.category_id || p.category || "Tablet",
            strength: p.strength,
            packSize: p.pack_size || p.packSize,
            mrp: mrpVal,
            sellingPrice: sellingVal,
            discountPercentage: p.discount_percentage ? parseFloat(p.discount_percentage) : (mrpVal > 0 ? Math.round(((mrpVal - sellingVal) / mrpVal) * 100) : 0),
            availableStock: stockVal,
            reservedStock: inv ? (inv.reserved_stock ?? 0) : 0,
            soldStock: inv ? (inv.sold_stock ?? 0) : 0,
            batchNumber: p.batch_number || (inv ? (inv.batch_number || "") : "") || "B-MCH2026",
            expiryDate: p.expiry_date || (inv ? (inv.expiry_date || "") : "") || "2027-12-31",
            imageUrl: p.image_url || p.imageUrl || undefined,
          });
        });
        
        for (const item of cartItemsInDb) {
          const product = productMap.get(item.productId);
          if (product) {
            cartItems.push({
              product,
              quantity: item.quantity
            });
          } else {
            cartModified = true;
          }
        }
      } else {
        cartModified = true;
      }
    }`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
