const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error("Missing required Supabase env vars:");
  for (const name of missing) console.error(`- ${name}`);
  process.exit(1);
}

console.log("Supabase env check passed.");
console.log(`- VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL}`);
console.log("- VITE_SUPABASE_PUBLISHABLE_KEY: present");
console.log("- SUPABASE_SERVICE_ROLE_KEY: present");
