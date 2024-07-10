/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    hookTimeout: 60000,
  },
})