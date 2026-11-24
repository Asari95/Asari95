# JEHOVÁ JIREH — Boutique & Accessories

Catálogo inicial conectado a Supabase.

## Configuración
1. Abre `config.js`.
2. Reemplaza `https://lfcrjxbvvdukumdxpwof.supabase.co` por tu Project URL.
3. Reemplaza `sb_publishable_F2Nc5VJAdpPOzLgg6vbwNA_fIALCfPH` por tu Publishable key.
4. Publica estos archivos mediante GitHub Pages o Cloudflare Pages.

La clave publishable (o anon heredada) está diseñada para uso público. Nunca agregues `service_role` ni claves `secret` al sitio.

## Base de datos
La página lee `public.products` y muestra solo registros con `active = true`.
La política RLS de lectura pública debe permitir SELECT a `anon` y `authenticated` con `using (active = true)`.

Este primer prototipo solo muestra productos. Todavía no permite administrar inventario ni registrar pedidos.
