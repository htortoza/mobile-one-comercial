// Mismo contenido que data.json, expuesto como variable global — así el mockup
// abre directo con doble clic (file://) sin bloquearse por CORS al hacer fetch().
window.MOCK_DATA = {
  tienda: { nombre: "Tienda Providencia", vendedor: "Vendedor Demo" },

  clientes: [
    { rut: "11.111.111-1", nombre: "Maria Fernandez" },
    { rut: "22.222.222-2", nombre: "Comercial Rios SpA" },
    { rut: "33.333.333-3", nombre: "Pedro Soto" },
    { rut: "44.444.444-4", nombre: "Javiera Munoz" },
    // Empresa con linea de credito propia (ver cobro.html) — el resto de
    // clientes/empresas no tiene campo `credito`, eso es lo que gatea si se
    // muestra el medio de pago "Credito" en el cobro.
    { rut: "76.543.210-5", nombre: "Distribuidora Andina Ltda.", credito: 1350298 },
  ],

  direcciones: [
    { id: "d1", direccion: "Av. Providencia 1234, depto 56", comuna: "Providencia" },
    { id: "d2", direccion: "Los Militares 5620", comuna: "Las Condes" },
  ],

  tiendasRed: [
    { id: "t1", nombre: "Tienda Las Condes", stock: 4 },
    { id: "t2", nombre: "Tienda Mall Plaza Oeste", stock: 2 },
    { id: "t3", nombre: "Centro de Distribucion", stock: 12 },
  ],

  promocionesCarrito: [
    { id: "pc1", descripcion: "10% dcto en el total del carrito", porcentaje: 0.10 },
  ],

  catalogo: [
    { sku: "ZAP-1042", nombre: "Zapatilla Urbana Runner", variante: "Talla 42", precio: 39990, precioOferta: null, unidadMedida: null, stock: 8, icono: "👟",
      promociones: [{ id: "pp1", descripcion: "2x1 en zapatillas", ahorroUnitario: 39990 }],
      variantes: [
        { color: "Negro", stock: 8 },
        { color: "Blanco", stock: 3 },
        { color: "Rojo", stock: 0 },
      ],
      recomienda: ["ACC-1001", "ACC-1003", "ACC-1004", "ACC-1005"] },
    { sku: "AUD-2210", nombre: "Audifonos Bluetooth ProSound", variante: null, precio: 24990, precioOferta: 17990, unidadMedida: null, stock: 5, icono: "🎧",
      recomienda: ["ACC-1002", "ACC-1006", "ACC-1007", "ACC-1008"] },
    { sku: "POL-3305", nombre: "Poleron Unisex Basico", variante: "Gris - Talla M", precio: 15990, precioOferta: null, unidadMedida: null, stock: 12, icono: "🧥",
      promociones: [{ id: "pp2", descripcion: "15% dcto por pago efectivo", ahorroUnitario: 2399 }],
      recomienda: ["ACC-1013", "ACC-1014", "ACC-1015", "ACC-1001"] },
    { sku: "CAR-4090", nombre: "Cargador USB-C 30W", variante: null, precio: 8990, precioOferta: null, unidadMedida: "Pack de 2", stock: 3, icono: "🔌" },
    { sku: "SAB-5120", nombre: "Set Sabanas 2 Plazas", variante: "Beige", precio: 21990, precioOferta: 16990, unidadMedida: null, stock: 0, icono: "🛏️",
      recomienda: ["HOG-2001", "HOG-2002", "HOG-2003", "HOG-2004"] },
    { sku: "CAM-9010", nombre: "Cama Box American", variante: "2 plazas", precio: 249990, precioOferta: 219990, unidadMedida: null, stock: 3, icono: "🛏️",
      recomienda: ["HOG-2001", "HOG-2002", "HOG-2003"] },
    { sku: "MOC-6011", nombre: "Mochila Notebook 15\"", variante: "Negro", precio: 27990, precioOferta: null, unidadMedida: null, stock: 6, icono: "🎒",
      recomienda: ["ACC-1009", "ACC-1010", "ACC-1011", "ACC-1012"] },
    { sku: "TAZ-7200", nombre: "Taza Termica Acero", variante: null, precio: 6990, precioOferta: null, unidadMedida: null, stock: 20, icono: "☕" },
    { sku: "LAM-8815", nombre: "Lampara LED Escritorio", variante: "Blanco", precio: 12990, precioOferta: 9990, unidadMedida: null, stock: 4, icono: "💡",
      recomienda: ["ACC-1016", "ACC-1017", "ACC-1018", "ACC-1008"] },
    { sku: "KIT-2201", nombre: "Combo Escritorio", tipo: "kit", componentes: ["CAR-4090", "LAM-8815"], precio: 19990, stock: 5, icono: "📦" },
    { sku: "GFT-0001", nombre: "Giftcard Mobile One", tipo: "giftcard", precio: 0, stock: 999, icono: "🎁" },

    // ── Accesorios / venta cruzada ("lleva algo mas") ─────────────────
    { sku: "ACC-1001", nombre: "Calcetines Deportivos Antibacteriales", variante: null, precio: 4990, precioOferta: null, unidadMedida: "Pack de 3", stock: 25, icono: "🧦" },
    { sku: "ACC-1002", nombre: "Estuche Protector para Audifonos", variante: null, precio: 5990, precioOferta: null, unidadMedida: null, stock: 15, icono: "🧳" },
    { sku: "ACC-1003", nombre: "Plantillas Ortopedicas Confort", variante: null, precio: 6990, precioOferta: null, unidadMedida: null, stock: 18, icono: "🦶" },
    { sku: "ACC-1004", nombre: "Kit Limpieza para Calzado", variante: null, precio: 5490, precioOferta: null, unidadMedida: null, stock: 20, icono: "🧽" },
    { sku: "ACC-1005", nombre: "Cordones de Repuesto", variante: null, precio: 2990, precioOferta: null, unidadMedida: null, stock: 30, icono: "🎗️" },
    { sku: "ACC-1006", nombre: "Cable Auxiliar 3.5mm", variante: null, precio: 3990, precioOferta: null, unidadMedida: null, stock: 22, icono: "🔗" },
    { sku: "ACC-1007", nombre: "Almohadillas de Repuesto", variante: null, precio: 4490, precioOferta: null, unidadMedida: null, stock: 16, icono: "⚪" },
    { sku: "ACC-1008", nombre: "Power Bank Compacto 10.000mAh", variante: null, precio: 14990, precioOferta: null, unidadMedida: null, stock: 10, icono: "🔋" },
    { sku: "ACC-1009", nombre: "Candado de Seguridad", variante: null, precio: 3490, precioOferta: null, unidadMedida: null, stock: 20, icono: "🔒" },
    { sku: "ACC-1010", nombre: "Funda Impermeable para Mochila", variante: null, precio: 5990, precioOferta: null, unidadMedida: null, stock: 14, icono: "☔" },
    { sku: "ACC-1011", nombre: "Organizador de Cables", variante: null, precio: 3990, precioOferta: null, unidadMedida: null, stock: 25, icono: "🗂️" },
    { sku: "ACC-1012", nombre: "Botella de Agua Deportiva", variante: null, precio: 4990, precioOferta: null, unidadMedida: null, stock: 22, icono: "🥤" },
    { sku: "ACC-1013", nombre: "Bufanda de Lana", variante: null, precio: 7990, precioOferta: null, unidadMedida: null, stock: 12, icono: "🧣" },
    { sku: "ACC-1014", nombre: "Gorro de Invierno", variante: null, precio: 5990, precioOferta: null, unidadMedida: null, stock: 16, icono: "🧢" },
    { sku: "ACC-1015", nombre: "Guantes Termicos", variante: null, precio: 6490, precioOferta: null, unidadMedida: null, stock: 14, icono: "🧤" },
    { sku: "ACC-1016", nombre: "Extension Electrica Multiple", variante: null, precio: 8990, precioOferta: null, unidadMedida: null, stock: 12, icono: "🔌" },
    { sku: "ACC-1017", nombre: "Organizador de Escritorio", variante: null, precio: 6990, precioOferta: null, unidadMedida: null, stock: 15, icono: "🗃️" },
    { sku: "ACC-1018", nombre: "Mousepad Ergonomico", variante: null, precio: 4990, precioOferta: null, unidadMedida: null, stock: 20, icono: "🖱️" },
    { sku: "HOG-2001", nombre: "Almohada Viscoelastica", variante: null, precio: 12990, precioOferta: null, unidadMedida: null, stock: 10, icono: "🛌" },
    { sku: "HOG-2002", nombre: "Plumon 2 Plazas", variante: null, precio: 24990, precioOferta: null, unidadMedida: null, stock: 6, icono: "🧺" },
    { sku: "HOG-2003", nombre: "Protector de Colchon Impermeable", variante: null, precio: 15990, precioOferta: null, unidadMedida: null, stock: 8, icono: "💧" },
    { sku: "HOG-2004", nombre: "Juego de Toallas", variante: null, precio: 11990, precioOferta: null, unidadMedida: null, stock: 14, icono: "🧻" },
  ],

  carros: [
    {
      id: "c-231", numero: "BO-00231", cliente: "Maria Fernandez", clienteRut: "11.111.111-1",
      estado: "ABIERTO", estadoLabel: "Abierto", tipoDocumento: "Boleta", datosFactura: null,
      promocionCarritoAplicadaId: null,
      lineas: [
        { sku: "ZAP-1042", cantidad: 1, esDespacho: false },
        { sku: "AUD-2210", cantidad: 1, esDespacho: false },
        { sku: "TAZ-7200", cantidad: 2, esDespacho: false },
      ],
    },
    {
      id: "c-228", numero: "BO-00228", cliente: "Cliente generico", clienteRut: null,
      estado: "EN_COBRO", estadoLabel: "En cobro", tipoDocumento: "Boleta", datosFactura: null,
      promocionCarritoAplicadaId: null,
      lineas: [
        { sku: "MOC-6011", cantidad: 1, esDespacho: false },
        { sku: "CAR-4090", cantidad: 1, esDespacho: false },
      ],
    },
    {
      id: "c-219", numero: "FA-00219", cliente: "Comercial Rios SpA", clienteRut: "22.222.222-2",
      estado: "PAGADO", estadoLabel: "Pagado", tipoDocumento: "Factura",
      datosFactura: { rut: "22.222.222-2", razonSocial: "Comercial Rios SpA", giro: "Venta al por menor", correo: "contacto@rios.cl", direccion: "Av. Apoquindo 3200, of. 12" },
      promocionCarritoAplicadaId: null,
      lineas: [
        { sku: "SAB-5120", cantidad: 2, esDespacho: false },
        { sku: "LAM-8815", cantidad: 3, esDespacho: false },
      ],
    },
    {
      id: "c-205", numero: "BO-00205", cliente: "Cliente generico", clienteRut: null,
      estado: "ANULADO", estadoLabel: "Anulado", tipoDocumento: "Boleta", datosFactura: null,
      promocionCarritoAplicadaId: null,
      lineas: [],
    },
    {
      id: "nuevo", numero: "BO-00232", cliente: "Cliente generico", clienteRut: null,
      estado: "ABIERTO", estadoLabel: "Abierto", tipoDocumento: "Boleta", datosFactura: null,
      promocionCarritoAplicadaId: null,
      lineas: [],
    },

    // ── Carritos demo para probar cobro (ver skill ux: pedido explicito de
    // cliente generico / persona / empresa / empresa-con-credito) ──────────
    {
      id: "c-240", numero: "BO-00240", cliente: "Cliente generico", clienteRut: null,
      estado: "ABIERTO", estadoLabel: "Abierto", tipoDocumento: "Boleta", datosFactura: null,
      promocionCarritoAplicadaId: null,
      lineas: [
        { sku: "TAZ-7200", cantidad: 2, esDespacho: false },
        { sku: "ACC-1006", cantidad: 1, esDespacho: false },
      ],
    },
    {
      id: "c-241", numero: "BO-00241", cliente: "Pedro Soto", clienteRut: "33.333.333-3",
      estado: "ABIERTO", estadoLabel: "Abierto", tipoDocumento: "Boleta", datosFactura: null,
      promocionCarritoAplicadaId: null,
      lineas: [
        { sku: "POL-3305", cantidad: 1, esDespacho: false },
        { sku: "CAR-4090", cantidad: 1, esDespacho: false },
      ],
    },
    {
      id: "c-242", numero: "FA-00242", cliente: "Comercial Rios SpA", clienteRut: "22.222.222-2",
      estado: "ABIERTO", estadoLabel: "Abierto", tipoDocumento: "Factura",
      datosFactura: { rut: "22.222.222-2", razonSocial: "Comercial Rios SpA", giro: "Venta al por menor", correo: "contacto@rios.cl", direccion: "Av. Apoquindo 3200, of. 12" },
      promocionCarritoAplicadaId: null,
      lineas: [
        { sku: "MOC-6011", cantidad: 1, esDespacho: false },
        { sku: "LAM-8815", cantidad: 2, esDespacho: false },
      ],
    },
    {
      id: "c-243", numero: "FA-00243", cliente: "Distribuidora Andina Ltda.", clienteRut: "76.543.210-5",
      estado: "ABIERTO", estadoLabel: "Abierto", tipoDocumento: "Factura",
      datosFactura: { rut: "76.543.210-5", razonSocial: "Distribuidora Andina Ltda.", giro: "Distribucion mayorista", correo: "contacto@andina.cl", direccion: "Camino La Farfana 890, bodega 4" },
      promocionCarritoAplicadaId: null,
      lineas: [
        { sku: "AUD-2210", cantidad: 1, esDespacho: false },
        { sku: "KIT-2201", cantidad: 1, esDespacho: false },
      ],
    },
  ],
};
