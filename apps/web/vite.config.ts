import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const ADSENSE_CLIENT = "ca-pub-8457266089811417";

function adsenseWebOnlyPlugin(mode: string): Plugin {
  return {
    name: "tango-adsense-web-only",
    transformIndexHtml() {
      if (mode !== "production") {
        return [];
      }

      return [
        {
          tag: "script",
          attrs: {
            async: true,
            src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
            crossorigin: "anonymous",
          },
          injectTo: "head",
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), adsenseWebOnlyPlugin(mode)],
  server: {
    port: 4173,
  },
  preview: {
    port: 4173,
  },
}));

