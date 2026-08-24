import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDirectory = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        margin: resolve(rootDirectory, 'index.html'),
        pricing: resolve(rootDirectory, 'pricing.html'),
        modelQuote: resolve(rootDirectory, 'model-quote.html'),
      },
    },
  },
})
