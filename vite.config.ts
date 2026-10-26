import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CI verifies build output at ./web/dist (see .github/workflows/deploy.yml),
// so emit the production build there instead of the default ./dist.
export default defineConfig({
  plugins: [react(), {
    name: 'release-metadata',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build.json',
        source: JSON.stringify({ commit: process.env.VITE_COMMIT_SHA ?? 'development' }),
      })
    },
  }],
  build: {
    outDir: 'web/dist',
    emptyOutDir: true,
  },
})
