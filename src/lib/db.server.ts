import { neon } from "@neondatabase/serverless";

// Conexão HTTP com o Neon: funciona em Node, Vercel e Cloudflare sem pool.
export function db() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL não está configurada.");
  return neon(url);
}
