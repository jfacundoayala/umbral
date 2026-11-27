# Prueba de punta a punta

`npm run e2e` (en `app/`, con `npm run dev` corriendo) recorre exponer, continuar, apoyar, favorito y cobrar en la red de pruebas, con un navegador sin ventana. **Gasta XLM de testnet** (los carga friendbot) y **crea obras y huellas reales** en la base, con el título "Prueba de punta a punta". No corre con `npm test`.
Se configura con `UMBRAL_URL` (por defecto `http://localhost:5173/?prueba#/`), `UMBRAL_NAVEGADOR` (ruta a Edge o Chrome) y `UMBRAL_PUERTO_CDP`. Deja capturas en `e2e-capturas/` y los comprobantes en `e2e-registro.json`.
**La limpieza es manual:** después de correrla, borrá desde el panel de Supabase las obras "Prueba de punta a punta" y sus huellas.
