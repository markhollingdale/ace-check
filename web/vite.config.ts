import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Inline the main CSS bundle into index.html so the first render is not
// blocked by a stylesheet request (Tailwind CSS for a small SPA is tiny).
function inlineCss(): Plugin {
  let outDir = 'dist';
  return {
    name: 'acecheck-inline-css',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const assetsDir = path.join(outDir, 'assets');
      let cssFile: string | undefined;
      try {
        cssFile = readdirSync(assetsDir).find((f) => f.endsWith('.css'));
      } catch {
        return;
      }
      if (!cssFile) return;
      const htmlPath = path.join(outDir, 'index.html');
      const html = readFileSync(htmlPath, 'utf8');
      const style = readFileSync(path.join(assetsDir, cssFile), 'utf8');
      const next = html.replace(
        /<link rel="stylesheet"[^>]*>/,
        () => `<style>\n${style}\n</style>`,
      );
      writeFileSync(htmlPath, next);
      rmSync(path.join(assetsDir, cssFile), { force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), inlineCss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3210',
        changeOrigin: true,
      },
    },
  },
});
