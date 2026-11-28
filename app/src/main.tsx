import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// Si publicamos una versión nueva con la página abierta, los pedazos viejos ya no existen:
// se recarga una sola vez para traer la versión nueva en vez de quedar en blanco.
window.addEventListener('vite:preloadError', (e) => {
  if (sessionStorage.getItem('umbral-recargada')) return
  sessionStorage.setItem('umbral-recargada', '1')
  e.preventDefault()
  location.reload()
})
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('umbral-recargada'), 10_000))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
