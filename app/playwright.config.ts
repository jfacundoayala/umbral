import { defineConfig, devices } from "@playwright/test";

// Pruebas de punta a punta que solo leen: recorren la web como una persona, sin firmar ni pagar nada.
// Por defecto prueban la versión compilada en esta máquina; con UMBRAL_URL prueban la publicada.
const URL_BASE = process.env.UMBRAL_URL ?? "http://localhost:4180";

export default defineConfig({
  testDir: "pw",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "pw-informe" }]],
  use: { baseURL: URL_BASE, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.UMBRAL_URL
    ? undefined
    : { command: "npm run build && npx vite preview --port 4180 --strictPort", url: URL_BASE, reuseExistingServer: true, timeout: 180_000 },
});
