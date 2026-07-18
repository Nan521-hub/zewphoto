import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    sourcemap: 'hidden',
  },
  server: {
    fs: {
      // 项目路径含特殊字符（~ 和中文），关闭严格检查以避免 403
      strict: false,
      allow: [
        projectRoot,
        resolve(projectRoot, '.'),
        resolve(projectRoot, '..'),
      ],
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
})
