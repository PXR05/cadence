import nodeAdapter from "@sveltejs/adapter-node";
import cfAdapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const isCloudflare = process.env.ADAPTER === "cf";

const adapter = isCloudflare ? cfAdapter : nodeAdapter;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
};

export default config;
