# Críos & Rango 2026 — 0.1.0

Primera base de desarrollo del nuevo theme propio.

## Objetivos de esta versión

- Theme independiente de Salient, Nectar y WPBakery.
- Mobile-first.
- Integración WooCommerce mediante soporte oficial, hooks y CSS.
- Sin overrides de plantillas WooCommerce en esta versión.
- Home propia: hero compartido con la configuración de la app, categorías, novedades y Outlet.
- Navegación móvil inferior inspirada en la app.
- Header, footer, búsqueda, páginas y estados básicos.

## Instalación

1. Apariencia > Temas > Añadir nuevo > Subir tema.
2. Subir el ZIP.
3. En producción, no activar todavía: usar previsualización o staging.
4. Comprobar que el plugin WooCommerce está activo.
5. Configurar logo y menús desde WordPress.

## Dependencias funcionales

- WooCommerce para catálogo, carrito, checkout y cuenta.
- Opcional: `Críos & Rango — Configuración de inicio` para reutilizar los Hero de la app.

## No incluido todavía

- Diseño final de ficha de producto.
- Filtros visuales equivalentes a la app.
- Rediseño completo de carrito/checkout/cuenta/pedidos/wallet.
- Migración de contenido WPBakery.
- Ajustes SEO/performance finales.

## 0.1.1

- Fallback visual de categorías usando la imagen de un producto cuando la categoría no tiene miniatura.
- Oculta el mensaje promocional de puntos de WPLoyalty únicamente en los listados de producto.
- Simplifica las tarjetas del catálogo móvil: sin botón “Seleccionar opciones”, título a dos líneas y precio más compacto.
- No modifica cálculo, saldo ni redención de puntos.

## 0.2.0
- Corrige el header cuando el menú de WordPress contiene árboles profundos de categorías.
- Limita temporalmente la navegación visible al primer nivel durante la fase Home.
- Cambia a navegación compacta por debajo de 1100 px.
- Ajusta el offset del admin bar de WordPress en móvil.
