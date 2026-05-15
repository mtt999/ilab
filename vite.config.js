import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isMobile = process.env.BUILD_TARGET === 'mobile'

export default defineConfig({
  plugins: [react()],
  base: isMobile ? '/' : '/ilab/',
  build: {
    outDir: isMobile ? 'dist' : 'docs',
  },
})
