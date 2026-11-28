/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // vitest corre las pruebas de src/; las de punta a punta (pw/) las corre Playwright.
  test: { include: ['src/**/*.test.{ts,tsx}'] },
})
