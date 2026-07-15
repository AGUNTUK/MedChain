import dotenv from "dotenv";
dotenv.config();

console.log("Available env keys:", Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("DB") || k.includes("DATABASE") || k.includes("URL") || k.includes("PASS") || k.includes("KEY")));
