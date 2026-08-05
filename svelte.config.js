import nodeAdapter from "@sveltejs/adapter-node";
import cfAdapter from "@sveltejs/adapter-cloudflare";
import staticAdapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const isCloudflare = process.env.ADAPTER === "cf";
const isStatic = process.env.ADAPTER === "static";

const adapter = isCloudflare
  ? cfAdapter
  : isStatic
    ? staticAdapter
    : nodeAdapter;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
};

export default config;
