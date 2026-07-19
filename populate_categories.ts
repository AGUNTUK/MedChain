import { supabaseAdmin } from "./src/lib/supabaseAdmin";

const categories = [
  "Tablet", "Capsule", "Syrup", "Suspension", "Drops", "Injection", "Infusion", "Inhaler",
  "Cream", "Ointment", "Gel", "Lotion", "Powder", "Sachet", "Oral Solution", "Oral Saline",
  "Eye Drop", "Eye Ointment", "Ear Drop", "Nasal Spray", "Suppository", "Pessary", "Patch",
  "Insulin", "Vaccine", "Medical Devices", "Surgical Items", "Dressing", "Bandage", "Gloves",
  "Masks", "Test Kits", "Nebulizer Solution", "Herbal", "Ayurvedic", "Homeopathic", "Vitamins",
  "Supplements", "Baby Care", "Personal Care", "Diabetic Care", "First Aid", "Others"
];

async function populateCategories() {
  try {
    console.log(`Starting to insert ${categories.length} categories...`);
    
    for (const name of categories) {
      const { error } = await supabaseAdmin
        .from("categories")
        .upsert([{ name, description: name }], { onConflict: 'name' });
      
      if (error) {
        console.error(`Error upserting category '${name}':`, error.message);
      } else {
        console.log(`Upserted category: ${name}`);
      }
    }
    
    console.log("Finished processing categories.");
  } catch (error) {
    console.error("Error:", error);
  }
}

populateCategories();
