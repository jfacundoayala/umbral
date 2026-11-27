# umbral-app

App web de UMBRAL: React 19, Vite y TypeScript.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # compila y revisa tipos
npm run lint
```

| Archivo | Qué hace |
|---|---|
| `src/config.ts` | Red, contrato, monedas y base de datos. Solo datos públicos. |
| `src/billetera.ts` | Ingreso y firma con Stellar Wallets Kit. |
| `src/umbral.ts` | Acciones del contrato y cálculo del código de cada huella. |
| `src/contrato/cliente.ts` | Cliente generado desde el contrato compilado. No se edita a mano. |

Las variables `VITE_CONTRATO_ID`, `VITE_MONEDA_ID`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_CLAVE_PUBLICA` cambian los valores por defecto. Ninguna es secreta.
