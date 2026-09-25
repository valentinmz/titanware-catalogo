# Titanware · Tienda de componentes y PCs armadas

Sitio estático (sin servidor) pensado para GitHub Pages. Los clientes arman su PC con control de compatibilidad, eligen PCs armadas o compran componentes, y mandan el pedido por WhatsApp.

## Secciones

- **Inicio** (`#/`): accesos rápidos, PCs armadas y productos destacados.
- **Armá tu PC** (`#/armar`): paso a paso (procesador → mother → RAM → almacenamiento → placa de video → gabinete → fuente → cooler) mostrando solo lo compatible: socket, tipo de memoria, potencia de la fuente, cooler según socket y consumo, y video integrado.
- **PC Armadas** (`#/pcs`): equipos listos, por categoría; se pueden personalizar en el armador.
- **Catálogo** (`#/catalogo/<categoría>`): búsqueda, filtros por categoría, subcategoría y marca.
- **Carrito**: productos, PCs armadas y PCs a medida; el pedido se envía completo por WhatsApp.
- **Panel** (`admin.html`): productos, precios, stock, destacados, fotos, PCs armadas y actualización masiva pegando la lista del mayorista. Publica los cambios en el repositorio con un token de GitHub.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `assets/js/config.js` | WhatsApp, Instagram, ubicación, repositorio y categorías. **Lo único que se edita a mano.** |
| `data/catalogo.json` | Productos (se edita desde el panel). |
| `data/pcs.json` | PCs armadas (se edita desde el panel). |
| `assets/js/core.js` | Lectura de nombres, compatibilidad, carrito (compartido). |
| `assets/js/app.js` | La tienda. |
| `assets/js/admin.js` | El panel. |
| `assets/css/site.css` | Estilos (paleta Titanware). |
| `img/marcas/` | Logos de marcas. `img/productos/` guarda las fotos que se suben desde el panel. |

## Panel de administración

1. Crear un token en <https://github.com/settings/personal-access-tokens/new> con acceso solo a este repositorio y permiso **Contents: Read and write**.
2. Abrir `admin.html`, pegar el token y conectar (queda guardado solo en ese navegador).
3. Editar y tocar **Publicar cambios**: la tienda se actualiza en 1 o 2 minutos.

Sin token se puede entrar “sin conexión”, editar y descargar los archivos de `data/` para subirlos a mano a cualquier hosting.

## Probar en la computadora

Los datos se cargan con `fetch`, así que hace falta un servidor local (abrir el HTML con doble clic no alcanza). Por ejemplo:

```bash
npx serve .
```
