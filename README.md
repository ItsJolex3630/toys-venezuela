# 🧸 Toys Venezuela - Sitio Web y Tienda Oficial

Repositorio de código y producción para el despliegue de **Toys Venezuela** (C.C. San Diego, Carabobo) en **Cloudflare Pages**.

## 🚀 Arquitectura Dual Device (Adaptativa)
El repositorio contiene soporte nativo para dos experiencias complementarias:
1. **`index.html` (Entrada Adaptativa Inteligente):**
   - Detecta automáticamente el rendimiento del dispositivo (memoria RAM, núcleos de CPU, conexión de red y preferencias de movimiento reducido).
   - Enruta instantáneamente a la versión óptima sin pantallas en blanco ni ralentización.
2. **`animado.html` (Experiencia Visual Completa):**
   - Diseñada para dispositivos modernos y de alto rendimiento.
   - Incluye animación de bienvenida, rayos rotatorios en el hero, keyframes interactivos y venta flash.
3. **`sencillo.html` (Experiencia Ligera / Dispositivos Modestos):**
   - Diseñada para teléfonos sencillos, ahorro de batería o conexiones lentas.
   - Carga ultrarrápida, 0 lag y catálogo completo accesible al instante.
4. **Selector Manual:** Ambas versiones incluyen un botón en la barra superior para alternar entre "⚡ Modo Ligero" y "✨ Modo Animado" con memoria en `localStorage`.

## 🌐 Despliegue en Cloudflare Pages
- **Proyecto:** `toys-venezuela`
- **Dominio Pages:** `https://toys-venezuela.pages.dev`
- **Ramas:** `main`
- **Modalidad:** Direct Upload
- **Comando de despliegue:**
  ```bash
  npx wrangler pages deploy . --project-name toys-venezuela --branch main
  ```

## 🔒 Seguridad
- `.gitignore` estricto con exclusión total de variables `.env*` y datos sensibles.
