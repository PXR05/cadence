import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { execSync } from "child_process";

function hash(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(16);
}

let commitHash = "unknown";
try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.warn("Could not determine Git commit hash:", e);
  commitHash = hash(new Date().toISOString());
}

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  define: {
    "import.meta.env.COMMIT_HASH": JSON.stringify(commitHash),
    "import.meta.env.BUILD_DATE": JSON.stringify(
      new Date().toLocaleString("en-DE"),
    ),
  },
});
