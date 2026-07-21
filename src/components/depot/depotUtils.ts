/**
 * MediChain Depot Warehouse Utility Functions
 */

export const getRackLocation = (productId: string, name: string, category: string): string => {
  const saved = localStorage.getItem(`medichain_rack_${productId}`);
  if (saved) return saved;

  // Deterministic fallback based on name & category
  const firstChar = name.charAt(0).toUpperCase();
  const index = (firstChar.charCodeAt(0) % 5) + 1; // 1 to 5
  let section = "A";
  if (category === "Syrup" || category === "Suspension") section = "B";
  else if (category === "Injection" || category === "Infusion") section = "C";
  else if (category === "Cream" || category === "Ointment" || category === "Gel" || category === "Lotion") section = "D";
  else if (category === "Supplement" || category === "Vitamins") section = "E";
  
  const shelf = (name.length % 4) + 1;
  return `Rack ${section}-${index.toString().padStart(2, "0")}, Shelf ${shelf}`;
};

export const saveRackLocation = (productId: string, location: string): void => {
  localStorage.setItem(`medichain_rack_${productId}`, location);
};

// Simulated Delivery Riders list
export interface Rider {
  id: string;
  name: string;
  phone: string;
  status: "Available" | "En Route" | "Off Duty";
}

export const RIDERS: Rider[] = [
  { id: "R-1", name: "Sajjad Hossain", phone: "+8801712345671", status: "Available" },
  { id: "R-2", name: "Kamal Uddin", phone: "+8801812345672", status: "Available" },
  { id: "R-3", name: "Sumon Ali", phone: "+8801912345673", status: "Available" },
  { id: "R-4", name: "Rakibul Islam", phone: "+8801512345674", status: "Available" }
];
