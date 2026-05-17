// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://fasha-xx.github.io',
  base: '/legal-ai-site',
  integrations: [tailwindcss(), mdx()],
  vite: {
    plugins: [tailwindcss()]
  }
});
