import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { execSync } from "child_process";

let commitHash = "unknown";
try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.warn("Could not determine Git commit hash:", e);
}

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  define: {
    "import.meta.env.__COMMIT_HASH__": JSON.stringify(commitHash),
  },
});
