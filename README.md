# Mockup carrito Mobile One POS

Mockup visual del carrito de compra (HTML/CSS/JS puro, sin build, sin backend).
Objetivo: que un vendedor lo muestre a un cliente para vender, no es la app real
ni un desarrollo funcional completo.

## Cómo abrirlo

Doble clic en `index.html` (funciona offline, sin servidor).

Para probarlo en un navegador con recarga en caliente durante desarrollo:

```bash
cd mockup-web
python3 -m http.server 8080
```

Abrir `http://localhost:8080/index.html`.

## Estructura

- `index.html` — lista "Carros activos"
- `carrito.html` — detalle de un carro (la pantalla principal del mockup)
- `cobro.html` — medios de pago (Efectivo/Tarjeta/Giftcard), calca
  `PagoScreen.kt` de la app real
- `documento.html` — boleta/factura tras el cobro, calca `DocumentoScreen.kt`
- `style.css` — todo el estilo. Colores/radios/tipografía calcados de
  `app/src/main/java/.../core/ui/theme/Color.kt`, `Dimens.kt`, `Shape.kt` de la
  app real. Desktop: teléfono centrado con marco+notch sobre fondo oscuro.
  Mobile real (`≤480px`): pantalla completa sin marco.
- `app.js` — toda la lógica (un solo archivo, sin framework)
- `data.js` — catálogo, carros, clientes, direcciones, etc. Fuente de verdad
  que carga el mockup (`window.MOCK_DATA`)
- `data.json` — mismo contenido que `data.js`, como referencia/entregable
  (no lo carga el mockup, es solo documentación de los datos)

## Qué está implementado

Pantalla lista (`index.html`):
- Buscar por cliente/número, chips de estado, FAB "Nuevo carro"
- Menú ⋮ → "Reiniciar datos de demo"

Pantalla carrito (`carrito.html`):
- Agregar/quitar productos, stepper de cantidad, eliminar línea
- Precios con oferta automática (tachado) y total recalculado en vivo
- **Variantes de color** (ej. Zapatilla): al agregar un producto con
  `variantes` en el catálogo, se abre un selector de color **dentro del
  drawer** (sheet), con swatch por color y stock por color. Colores sin
  stock se ven atenuados y no son seleccionables.
- **"Lleva algo más" (venta cruzada)**: si el producto agregado tiene
  `recomienda` en el catálogo, se muestra un paso **dentro del mismo
  drawer** con hasta 4 productos sugeridos, cada uno con su propio botón
  "+". Configurado hoy para: Zapatilla, Audífonos, Set Sábanas, Mochila,
  Polerón, Lámpara.
- Despacho a domicilio: toggle por línea, separa el carrito en secciones
  "Retiro en tienda" / "Para despacho", selector de dirección (+ agregar
  dirección nueva)
- Promociones por producto y por carrito (sheets con radio, se ve el ahorro)
- Multitienda: si se agota el stock local, sheet para pedir desde otra
  tienda de la red + elegir modalidad (retiro/despacho)
- Giftcard: producto especial, pide monto **en un diálogo modal** (no en el
  drawer) antes de agregarse, sin stepper, código generado
- Kits/combos: tarjeta propia mostrando qué incluye, con su propio stepper
- Cambiar cliente / cambiar tipo de documento (Boleta ↔ Factura + formulario
  de datos de empresa): sheets
- Eliminar carro: **diálogo modal** (no en el drawer), con confirmación
  destructiva en rojo
- Carritos no-ABIERTO (Pagado / En cobro / Anulado) pasan a solo lectura
  (banner, sin edición, sin footer de cobro)
- Persistencia con `sessionStorage` durante la sesión del navegador (borrar
  un carro o agregar productos se mantiene al navegar entre páginas). Se
  reinicia con "Reiniciar datos de demo" o cerrando la pestaña.

Pantalla cobro (`cobro.html`), calca `PagoScreen.kt`:
- Resumen (cliente, tipo doc, despacho, total, "por asignar")
- Agregar Efectivo (monto recibido + vuelto en vivo) o Giftcard (código) vía
  mosaico + diálogo modal. Editar/eliminar línea de efectivo.
- "Confirmar cobro" / "Terminar cobro con tarjeta" (si queda pendiente, se
  cubre solo con Tarjeta, igual que la app real) — anima cada línea de pago
  en secuencia (spinner → Aprobado) antes de ir al documento

Pantalla documento (`documento.html`), calca `DocumentoScreen.kt`:
- "Generando documento..." breve, luego boleta: check verde, N° de
  comprobante, detalle de venta y de pago, vuelto si aplica
- Imprimir (→ "Reimprimir"), Enviar por correo (diálogo con input), Nueva
  venta

## Reglas de diseño (para no romper esto al seguir iterando)

1. **Drawer (sheet que sube desde abajo) SOLO para**: elegir color/variante
   y la recomendación "lleva algo más". Todo lo demás que necesite
   confirmación bloqueante (eliminar carro, monto de giftcard) usa el
   **diálogo modal centrado** (`dialog-overlay`/`dialog-box` en
   `carrito.html` + `abrirDialogo()`/`cerrarDialogo()` en `app.js`) — así
   se decidió explícitamente, no cambiar sin pedirlo.
2. **El ícono de cada producto en el catálogo es un emoji** (👟🎧🧥🔌🛏️🎒☕
   💡📦🎁🧦🧳...) — funciona como la "imagen" del producto (no hay fotos
   reales). Nunca reemplazar estos por íconos SVG.
3. **Los íconos de interfaz (chrome) sí son SVG**: buscar, carrito vacío,
   despacho/camión, home/store del toggle retiro-despacho, check de
   confirmación, sugerencia (bombilla). Viven en el objeto `ICONS` en
   `app.js`.
4. Todo el mockup vive en 3 archivos JS/CSS/HTML planos — sin build step,
   sin dependencias externas, para poder abrirlo con doble clic.

## Cómo extender

- **Agregar un producto nuevo**: sumar una entrada en `catalogo` (en
  `data.js` y reflejarlo en `data.json`). Campos: `sku`, `nombre`,
  `variante` (subtítulo estático opcional), `precio`, `precioOferta`,
  `unidadMedida`, `stock`, `icono` (emoji).
- **Agregar variantes de color a un producto**: agregar
  `variantes: [{ color, stock }, ...]` a su entrada del catálogo. El
  selector de color se activa solo si existe ese campo.
- **Agregar una recomendación cruzada**: agregar `recomienda: [sku1, sku2,
  sku3, sku4]` (mínimo 4 recomendado) a la entrada del producto origen en
  el catálogo.
- **Agregar un kit/combo**: entrada con `tipo: "kit"`, `componentes:
  [sku1, sku2]`, `precio` (precio del combo).
- **Agregar una giftcard**: entrada con `tipo: "giftcard"`, `precio: 0`
  (el monto lo define el vendedor al agregarla).

## Pendiente / fuera de alcance (a propósito)

- Sin backend real, sin persistencia más allá de `sessionStorage`
- Sin escaneo real con cámara/lector físico (el botón "Escanear" abre el
  mismo buscador que "Buscar")
- Cobro sin pasarela real: Tarjeta/Giftcard se "aprueban" solos tras la
  animación, sin backend ni saldo real de giftcard
- Multitienda no descuenta stock real de la tienda origen, es ilustrativo

## Historial de decisiones relevantes

- El mockup replica el tema **claro** real de la app incluso en el fondo
  oscuro de escritorio — el fondo oscuro es solo el marco del teléfono en
  desktop, no un dark mode de la app.
- Se intentó inicialmente meter TODO (eliminar carro, monto giftcard,
  color, recomendación) dentro del drawer. Se revirtió: eliminar carro y
  monto giftcard deben ser diálogo modal, igual que en la app real
  (`AlertDialog` / `DialogoMontoGiftcardVenta`). Solo color y recomendación
  van en el drawer.
