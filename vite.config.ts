import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { version } from './package.json' with { type: 'json' }

export default defineConfig({
  // Relative base so the build works under a GitHub Pages sub-path (/feedbackyard/).
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react()],
})
