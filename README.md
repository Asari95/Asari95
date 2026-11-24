# JEHOVÁ JIREH — Boutique & Accessories

Catálogo inicial conectado a Supabase.

## Configuración
1. Abre `config.js`.
2. Reemplaza `PEGA_AQUI_TU_PROJECT_URL` por tu Project URL.
3. Reemplaza `PEGA_AQUI_TU_PUBLISHABLE_KEY` por tu Publishable key.
4. Publica estos archivos mediante GitHub Pages o Cloudflare Pages.

La clave publishable (o anon heredada) está diseñada para uso público. Nunca agregues `service_role` ni claves `secret` al sitio.

## Base de datos
La página lee `public.products` y muestra solo registros con `active = true`.
La política RLS de lectura pública debe permitir SELECT a `anon` y `authenticated` con `using (active = true)`.

Este primer prototipo solo muestra productos. Todavía no permite administrar inventario ni registrar pedidos.
