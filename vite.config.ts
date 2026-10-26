import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative base so the build works under a GitHub Pages sub-path (/feedbackyard/).
  base: './',
  plugins: [react()],
})
