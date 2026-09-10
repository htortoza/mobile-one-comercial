// Mockup de venta — sin backend, todo vive en memoria (window.MOCK_DATA, ver data.js).
// ponytail: un solo archivo con funciones/plantillas, sin framework — sobra para una demo
// de una pestaña sin persistencia entre recargas.

const DATA = window.MOCK_DATA;
let giftcardSeq = 1;

// ── Persistencia liviana entre paginas (misma pestaña) ──────────────────
// Cada .html recarga data.js desde cero al navegar — sin esto, borrar un
// carro o agregar productos se "olvidaba" apenas se volvia a la lista.
function guardarEstado() {
  try {
    sessionStorage.setItem("mockCartState", JSON.stringify({ carros: DATA.carros, direcciones: DATA.direcciones, clientes: DATA.clientes }));
  } catch (e) {}
}
function cargarEstado() {
  try {
    const raw = sessionStorage.getItem("mockCartState");
    if (!raw) return;
    const guardado = JSON.parse(raw);
    if (guardado.carros) DATA.carros = guardado.carros;
    if (guardado.direcciones) DATA.direcciones = guardado.direcciones;
    // Sin esto, el credito ya gastado (cliente.credito decrementado en
    // confirmarCobro) se perdia al navegar de cobro.html a documento.html —
    // cada pagina recarga data.js desde cero, con el credito original.
    if (guardado.clientes) DATA.clientes = guardado.clientes;
  } catch (e) {}
}
function reiniciarDemo() {
  sessionStorage.removeItem("mockCartState");
  window.location.href = "index.html";
}
// Los carritos de demo no se "gastan" al cobrar — pedido explicito: poder
// repetir el flujo de pago las veces que haga falta sin editar data.js a
// mano. Se llama al salir de la boleta (Nueva venta), asi que el cliente
// SI ve el carro quedar Pagado/solo-lectura en la boleta mientras la mira,
// pero al volver a la lista ya esta listo para usarse de nuevo.
function reiniciarCarroDemo(carro, cliente) {
  if (cliente) {
    (carro.lineasPago || []).forEach((l) => {
      if (l.medio === "CREDITO") cliente.credito += l.monto;
    });
  }
  carro.estado = "ABIERTO";
  carro.estadoLabel = "Abierto";
  carro.lineasPago = [];
  delete carro.docNumero;
  delete carro.docFecha;
  delete carro.impreso;
  delete carro.correoEnviado;
  delete carro.correoDocumento;
  guardarEstado();
}
cargarEstado();

function clp(monto) {
  return "$" + Math.round(monto).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ── Despacho: regular (fecha a elegir) vs express (mas caro, rango horario) ──
const COSTO_DESPACHO_REGULAR = 3990;
const COSTO_DESPACHO_EXPRESS = 6990;
const RANGOS_HORARIO_EXPRESS = ["09:00 - 12:00", "12:00 - 15:00", "15:00 - 18:00", "18:00 - 21:00"];
const RANGOS_HORARIO_REGULAR = ["10:00 - 13:00", "13:00 - 16:00", "16:00 - 19:00"];
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const MESES_ANIO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechasDespachoRegular(n = 6) {
  const out = [];
  const hoy = new Date();
  for (let i = 1; out.length < n; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    if (d.getDay() === 0) continue; // sin despacho domingo
    out.push({ value: d.toISOString().slice(0, 10), label: `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} ${MESES_ANIO[d.getMonth()]}` });
  }
  return out;
}
function labelFechaDespacho(value) {
  return fechasDespachoRegular(30).find((f) => f.value === value)?.label || value;
}

// ── Calendario horizontal fecha+horario (retiro en tienda, despacho regular)
// Un solo control reusado en todos lados donde se elige fecha y horario
// juntos: columnas de dias con overflow-x, horarios apilados debajo de cada
// una — tocar un horario elige fecha+hora en un solo paso.
function calendarioHorarioHtml(fechas, horarios, fechaSel, horarioSel) {
  return fechas
    .map((f) => {
      const [diaAbrev, diaNum] = f.label.split(" ");
      return `
      <div class="calendario-horario__dia">
        <div class="calendario-horario__dia-header">
          <span class="calendario-horario__dia-letra">${esc(diaAbrev.charAt(0))}</span>
          <span class="calendario-horario__dia-num">${esc(diaNum)}</span>
        </div>
        ${horarios
          .map(
            (r) => `
          <button type="button" class="calendario-horario__slot ${fechaSel === f.value && horarioSel === r ? "calendario-horario__slot--activo" : ""}" data-fecha="${f.value}" data-horario="${r}">${r.replace(" - ", "<br>")}</button>`,
          )
          .join("")}
      </div>`;
    })
    .join("");
}
function wireCalendarioHorario(container, onSelect) {
  container.querySelectorAll(".calendario-horario__slot").forEach((btn) => {
    btn.addEventListener("click", () => onSelect(btn.dataset.fecha, btn.dataset.horario));
  });
}
// Mismos chips de horario, sin columna de fecha (Express: hoy/manana
// implicito, no se elige dia) — misma fila de wireCalendarioHorario.
function rangosHorarioHtml(horarios, horarioSel) {
  return horarios
    .map(
      (r) => `
    <button type="button" class="calendario-horario__slot ${horarioSel === r ? "calendario-horario__slot--activo" : ""}" data-horario="${r}">${r.replace(" - ", "<br>")}</button>`,
    )
    .join("");
}

// ── Cobro / documento ────────────────────────────────────────────────────
function enmascararGiftcard(codigo) {
  const c = String(codigo || "");
  return c.length <= 4 ? c : "···" + c.slice(-4);
}
function formatearFechaHora(d) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MESES_ANIO[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}
function medioEtiqueta(medio) {
  return { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", GIFTCARD: "Giftcard", CREDITO: "Credito" }[medio] || medio;
}
function medioSigla(medio) {
  return { EFECTIVO: "$", TARJETA: "T", GIFTCARD: "G", CREDITO: "C" }[medio] || "?";
}
function clienteDelCarro(carro) {
  return carro.clienteRut ? DATA.clientes.find((c) => c.rut === carro.clienteRut) || null : null;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function catalogoPorSku(sku) {
  return DATA.catalogo.find((a) => a.sku === sku);
}

function qs(param) {
  return new URLSearchParams(window.location.search).get(param);
}

const ICONS = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3"/><line x1="4" y1="12" x2="20" y2="12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  despacho: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  suggest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
};

// ── Colores de variante (swatch visual en el selector) ──────────────────
const COLOR_HEX = {
  Negro: "#1a1a1a", Blanco: "#f5f5f5", Rojo: "#e0313a", Azul: "#1A1AE6",
  Gris: "#8a8a8a", Beige: "#d8c9a3", Verde: "#1e7a3c",
};
function colorHex(nombre) {
  return COLOR_HEX[nombre] || "#c7c7f5";
}


const ESTADO_COLOR = {
  ABIERTO: { fondo: "var(--verde-fondo)", texto: "var(--verde-texto)" },
  EN_COBRO: { fondo: "var(--naranja-fondo)", texto: "var(--naranja-texto)" },
  PAGADO: { fondo: "var(--azul-estado-fondo)", texto: "var(--azul-estado-texto)" },
  ANULADO: { fondo: "var(--gris-estado-fondo)", texto: "var(--gris-estado-texto)" },
};

function mostrarToast(mensaje) {
  const screen = document.querySelector(".app-screen");
  let toast = screen.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    screen.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.classList.add("visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

// ── Calculo de precios/totales (compartido lista + detalle) ────────────
function precioLinea(art, linea) {
  if (art.tipo === "giftcard") {
    return { unitario: linea.montoGiftcard, subtotal: linea.montoGiftcard, tachado: null };
  }
  let unitario = art.precioOferta ?? art.precio;
  let tachado = art.precioOferta != null ? art.precio : null;
  if (linea.promocionAplicadaId) {
    const promo = (art.promociones || []).find((p) => p.id === linea.promocionAplicadaId);
    if (promo) {
      unitario = Math.max(0, art.precio - promo.ahorroUnitario);
      tachado = art.precio;
    }
  }
  return { unitario, subtotal: unitario * linea.cantidad, tachado };
}

function calcularCarro(carro) {
  let subtotalBruto = 0;
  let totalConDescuentoProducto = 0;
  let items = 0;
  carro.lineas.forEach((l) => {
    const art = catalogoPorSku(l.sku);
    if (!art) return;
    const { subtotal } = precioLinea(art, l);
    const bruto = art.tipo === "giftcard" ? l.montoGiftcard : art.precio * l.cantidad;
    subtotalBruto += bruto;
    totalConDescuentoProducto += subtotal;
    items += l.cantidad;
  });
  const descuentoProductos = subtotalBruto - totalConDescuentoProducto;
  let descuentoCarrito = 0;
  if (carro.promocionCarritoAplicadaId) {
    const promo = DATA.promocionesCarrito.find((p) => p.id === carro.promocionCarritoAplicadaId);
    if (promo) descuentoCarrito = Math.round(totalConDescuentoProducto * promo.porcentaje);
  }
  // Regular tambien tiene costo (mas barato que Express) — pedido explicito:
  // "ponle un precio al despacho, por que lo dejaste gratis".
  const costoDespacho = carro.lineas
    .filter((l) => l.esDespacho)
    .reduce((s, l) => s + (l.tipoDespacho === "express" ? COSTO_DESPACHO_EXPRESS : COSTO_DESPACHO_REGULAR), 0);
  return {
    subtotalBruto,
    descuentoProductos,
    descuentoCarrito,
    costoDespacho,
    total: totalConDescuentoProducto - descuentoCarrito + costoDespacho,
    items,
  };
}

// ── Pantalla: lista de carros ─────────────────────────────────────────
function initListaCarros() {
  const cont = document.getElementById("lista-carros");
  if (!cont) return;

  document.getElementById("titulo-tienda").textContent = `${DATA.tienda.nombre} · ${DATA.tienda.vendedor}`;

  const input = document.getElementById("buscar-carro");
  const render = () => {
    const query = (input.value || "").trim().toLowerCase();
    const carros = DATA.carros
      .filter((c) => c.id !== "nuevo")
      .filter((c) => !query || c.cliente.toLowerCase().includes(query) || c.numero.toLowerCase().includes(query));

    if (carros.length === 0) {
      cont.innerHTML = `
        <div class="estado-vacio">
          <div class="estado-vacio__icono">${ICONS.search}</div>
          <div class="estado-vacio__titulo">Sin resultados</div>
          <div class="estado-vacio__detalle">Ningun carro coincide con "${esc(query)}".</div>
        </div>`;
      return;
    }

    cont.innerHTML = carros
      .map((c) => {
        const { total, items } = calcularCarro(c);
        const color = ESTADO_COLOR[c.estado];
        return `
        <div class="tarjeta-carro" data-id="${c.id}">
          <div class="tarjeta-carro__fila-top">
            <span class="tarjeta-carro__numero">${c.numero}</span>
            <span class="chip-estado" style="background:${color.fondo};color:${color.texto}">${c.estadoLabel}</span>
          </div>
          <div class="tarjeta-carro__cliente">${esc(c.cliente)}</div>
          <div class="tarjeta-carro__fila-bottom">
            <span class="tarjeta-carro__items">${items} ${items === 1 ? "producto" : "productos"}</span>
            <span class="tarjeta-carro__total">${clp(total)}</span>
          </div>
        </div>`;
      })
      .join("");

    cont.querySelectorAll(".tarjeta-carro").forEach((el) => {
      el.addEventListener("click", () => {
        window.location.href = `carrito.html?id=${el.dataset.id}`;
      });
    });
  };

  input.addEventListener("input", render);
  document.getElementById("fab-nuevo-carro").addEventListener("click", () => {
    window.location.href = "carrito.html?id=nuevo";
  });
  const dropdown = document.getElementById("dropdown-menu-lista");
  document.getElementById("btn-menu-lista").addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("abierto");
  });
  document.addEventListener("click", () => dropdown.classList.remove("abierto"));
  document.getElementById("opt-reiniciar-demo").addEventListener("click", reiniciarDemo);
  render();
}

// ── Pantalla: detalle carrito ────────────────────────────────────────
function initCarritoDetalle() {
  const contLineas = document.getElementById("lineas-carrito");
  if (!contLineas) return;

  const carroId = qs("id") || DATA.carros[0].id;
  const carro = DATA.carros.find((c) => c.id === carroId) || DATA.carros[0];
  const editable = carro.estado === "ABIERTO";

  // ── Sheet generico (drawer que sube desde abajo) — variante y recomendacion
  // viven aca. El resto (eliminar carro, monto giftcard) usa el dialogo
  // centrado de abajo, igual que en la app real.
  const sheetOverlay = document.getElementById("sheet-overlay");
  const sheetEl = document.getElementById("sheet");

  function abrirSheet(html, wire) {
    sheetEl.innerHTML = html;
    sheetEl.querySelectorAll(".sheet__cerrar").forEach((b) => b.addEventListener("click", cerrarSheet));
    sheetEl.querySelectorAll(".sheet__volver").forEach((b) => b.addEventListener("click", () => mostrarListaAgregarProducto()));
    if (wire) wire(sheetEl);
    sheetOverlay.classList.add("abierto");
  }
  function cerrarSheet() {
    sheetOverlay.classList.remove("abierto");
  }
  sheetOverlay.addEventListener("click", (e) => { if (e.target === sheetOverlay) cerrarSheet(); });

  // ── Dialogo centrado (AlertDialog) ────────────────────────────────────
  const dialogOverlay = document.getElementById("dialog-overlay");
  const dialogBox = document.getElementById("dialog-box");

  function abrirDialogo(html, wire) {
    dialogBox.innerHTML = html;
    if (wire) wire(dialogBox);
    dialogOverlay.classList.add("abierto");
  }
  function cerrarDialogo() {
    dialogOverlay.classList.remove("abierto");
  }
  dialogOverlay.addEventListener("click", (e) => { if (e.target === dialogOverlay) cerrarDialogo(); });

  // ── Encabezado ─────────────────────────────────────────────────────
  function renderEncabezado() {
    guardarEstado();
    document.getElementById("titulo-carro").textContent = carro.numero;
    document.getElementById("subtitulo-carro").textContent = carro.cliente;
    document.getElementById("tipo-documento").textContent = " · " + carro.tipoDocumento;

    const banner = document.getElementById("banner-solo-lectura");
    if (!editable) {
      const msg = {
        EN_COBRO: "Este carro esta en proceso de cobro — solo lectura.",
        PAGADO: "Este carro ya fue pagado — solo lectura.",
        ANULADO: "Este carro fue anulado.",
      }[carro.estado] || "Solo lectura.";
      banner.textContent = msg;
      banner.style.display = "block";
      document.getElementById("btn-menu").parentElement.style.display = "none";
      document.getElementById("acciones-fila").style.display = "none";
      document.getElementById("btn-cobrar").style.display = "none";
    }
  }

  // ── Lineas del carrito ───────────────────────────────────────────────
  function obtenerStockDisponible(art, linea) {
    if (linea.tiendaOrigenNombre) return null;
    if (art.variantes) {
      if (linea.colorSeleccionado) {
        const v = art.variantes.find((x) => x.color === linea.colorSeleccionado);
        return (v ? v.stock : 0) - linea.cantidad;
      }
      return art.variantes.reduce((n, v) => n + v.stock, 0) - linea.cantidad;
    }
    return art.stock - linea.cantidad;
  }

  function tarjetaSimpleOKitHtml(idx, art, l, esKit) {
    const { unitario, subtotal, tachado } = precioLinea(art, l);
    const stockDisponible = obtenerStockDisponible(art, l);
    const puedeReducir = l.cantidad > 1;
    const precioHtml = tachado != null
      ? `<del>${clp(tachado)}</del> ${clp(unitario)} c/u × ${l.cantidad}`
      : `${clp(unitario)} c/u × ${l.cantidad}`;
    const colorHtml = l.colorSeleccionado
      ? `<div class="tarjeta-linea__variante" style="display:flex;align-items:center;gap:5px"><span class="swatch swatch--sm" style="background:${colorHex(l.colorSeleccionado)}"></span>Color: ${esc(l.colorSeleccionado)}${art.variante ? ` · ${esc(art.variante)}` : ""}</div>`
      : art.variante ? `<div class="tarjeta-linea__variante">${esc(art.variante)}</div>` : "";
    const subtituloExtra = esKit
      ? `<div class="tarjeta-linea__variante">Incluye: ${art.componentes.map((s) => catalogoPorSku(s).nombre).join(" + ")}</div>`
      : `${art.unidadMedida ? `<span class="tarjeta-linea__chip-um">${esc(art.unidadMedida)}</span>` : ""}${colorHtml}`;
    const promo = l.promocionAplicadaId ? (art.promociones || []).find((p) => p.id === l.promocionAplicadaId) : null;
    const tienePromos = !esKit && (art.promociones || []).length > 0;

    const direccion = l.esDespacho && l.direccionId ? DATA.direcciones.find((d) => d.id === l.direccionId) : null;
    // Direccion/tipo/fecha/receptor van en lineas separadas a propósito — antes
    // era un solo <span> truncado con "..." y, apenas el texto crecia (tipo +
    // fecha + horario + nombre de quien recibe), todo eso quedaba invisible
    // detras del corte. Solo la direccion (envio-texto) se trunca, el resto
    // (envio-detalle) nunca.
    const detalleTipo = l.tipoDespacho === "express"
      ? `Express (+${clp(COSTO_DESPACHO_EXPRESS)}) · ${esc(l.rangoHorarioDespacho || "")}`
      : l.tipoDespacho === "regular"
        ? `Regular (+${clp(COSTO_DESPACHO_REGULAR)}) · ${esc(labelFechaDespacho(l.fechaDespacho))}${l.rangoHorarioDespacho ? " · " + esc(l.rangoHorarioDespacho) : ""}`
        : "";
    const retiroTexto = !l.esDespacho && !esKit && l.fechaRetiro
      ? `Retira: ${esc(labelFechaDespacho(l.fechaRetiro))} · ${esc(l.horarioRetiro || "")}`
      : null;
    const nombreReceptorLinea = l.nombreReceptor ? `Recibe: ${esc(l.nombreReceptor)}` : "";

    return `
      <div class="tarjeta-linea ${l.esDespacho ? "tarjeta-linea--despacho" : ""}" data-index="${idx}">
        <div class="tarjeta-linea__fila1">
          <div class="tarjeta-linea__img">${art.icono}</div>
          <div class="tarjeta-linea__info">
            <div class="tarjeta-linea__nombre">${esc(art.nombre)}</div>
            ${subtituloExtra}
            ${l.tiendaOrigenNombre ? `<div class="tarjeta-linea__variante">Desde: ${esc(l.tiendaOrigenNombre)}</div>` : ""}
            ${direccion ? `
            <div class="tarjeta-linea__envio">
              <div class="tarjeta-linea__envio-info">
                <div class="tarjeta-linea__envio-texto">Envio a: ${esc(direccion.direccion)}</div>
                ${detalleTipo ? `<div class="tarjeta-linea__envio-detalle">${detalleTipo}</div>` : ""}
                ${nombreReceptorLinea ? `<div class="tarjeta-linea__envio-detalle">${nombreReceptorLinea}</div>` : ""}
              </div>
              ${editable ? `<button class="link-inline" data-accion="cambiar-direccion">Cambiar</button>` : ""}
            </div>` : ""}
            ${!direccion && !esKit && retiroTexto ? `
            <div class="tarjeta-linea__envio">
              <div class="tarjeta-linea__envio-info">
                <div class="tarjeta-linea__envio-texto">${retiroTexto}</div>
                ${nombreReceptorLinea ? `<div class="tarjeta-linea__envio-detalle">${nombreReceptorLinea}</div>` : ""}
              </div>
              ${editable ? `<button class="link-inline" data-accion="cambiar-retiro">Cambiar</button>` : ""}
            </div>` : ""}
            ${!direccion && !esKit && !retiroTexto && editable ? `
            <button class="link-inline" data-accion="cambiar-retiro" style="margin-top:2px">+ Retiro programado</button>` : ""}
          </div>
          ${art.precioOferta != null && !promo ? `<span class="chip-oferta">OFERTA</span>` : ""}
          ${promo ? `<span class="chip-oferta">DESC.</span>` : ""}
          ${editable ? `<button class="btn-eliminar" data-accion="eliminar">${ICONS.trash}</button>` : ""}
        </div>
        <div class="tarjeta-linea__fila2">
          <div class="tarjeta-linea__precio">${precioHtml}</div>
          <div class="tarjeta-linea__totales">
            <span class="label">Total</span><span class="tarjeta-linea__subtotal ${tachado != null ? "tarjeta-linea__subtotal--oferta" : ""}">${clp(subtotal)}</span>
          </div>
        </div>
        <div class="tarjeta-linea__fila3">
          ${editable ? `
          <div class="stepper">
            <button class="stepper__menos" data-accion="menos" ${puedeReducir ? "" : "disabled"}>${ICONS.minus}</button>
            <span class="stepper__num">${l.cantidad}</span>
            <button class="stepper__mas" data-accion="mas">${ICONS.plus}</button>
          </div>
          <span class="disp-stock ${stockDisponible !== null && stockDisponible <= 0 ? "disp-stock--agotado" : ""}">${stockDisponible === null ? "Disp: red" : `Disp: ${stockDisponible}`}</span>
          ` : `<span class="disp-stock">Cantidad: ${l.cantidad}</span>`}
        </div>
        ${editable && !esKit ? `
        <div class="tarjeta-linea__fila4">
          <button class="chip-toggle ${l.esDespacho ? "chip-toggle--activo" : ""}" data-accion="despacho">${l.esDespacho ? ICONS.home : ICONS.store} ${l.esDespacho ? "Despacho" : "Se lleva"}</button>
          ${tienePromos ? `<button class="link-promo" data-accion="promo">${promo ? "Cambiar descuento" : "Desc. disponible"}</button>` : ""}
        </div>` : ""}
      </div>`;
  }

  function tarjetaGiftcardHtml(idx, art, l) {
    return `
      <div class="tarjeta-linea" data-index="${idx}">
        <div class="tarjeta-linea__fila1">
          <div class="tarjeta-linea__img">${art.icono}</div>
          <div class="tarjeta-linea__info">
            <div class="tarjeta-linea__nombre">${esc(art.nombre)}</div>
            <div class="tarjeta-linea__variante">Codigo: GFT-${1000 + idx}</div>
          </div>
          ${editable ? `<button class="btn-eliminar" data-accion="eliminar">${ICONS.trash}</button>` : ""}
        </div>
        <div class="tarjeta-linea__fila2">
          <div class="tarjeta-linea__precio">Monto ingresado</div>
          <div class="tarjeta-linea__totales">
            <span class="label">Total</span><span class="tarjeta-linea__subtotal">${clp(l.montoGiftcard)}</span>
          </div>
        </div>
      </div>`;
  }

  function renderLineas() {
    if (carro.lineas.length === 0) {
      contLineas.innerHTML = `
        <div class="estado-vacio">
          <div class="estado-vacio__icono">${ICONS.cart}</div>
          <div class="estado-vacio__titulo">Carro vacio</div>
          <div class="estado-vacio__detalle">${editable ? "Agrega productos escaneando o buscando por nombre y SKU." : "Este carro no tiene productos."}</div>
        </div>`;
    } else {
      // Se lleva = default (giftcard/kit, o simple sin despacho ni retiro
      // programado) — no hace falta texto ni configuracion, el cliente se
      // lo lleva altiro. Retiro en tienda queda solo para lo que de verdad
      // se programo para pasar a buscar despues (l.fechaRetiro).
      const llevar = [];
      const retiro = [];
      const despacho = [];
      carro.lineas.forEach((l, idx) => {
        const art = catalogoPorSku(l.sku);
        if (!art) return;
        const html =
          art.tipo === "giftcard" ? tarjetaGiftcardHtml(idx, art, l) : tarjetaSimpleOKitHtml(idx, art, l, art.tipo === "kit");
        if (art.tipo === "giftcard" || art.tipo === "kit") llevar.push(html);
        else if (l.esDespacho) despacho.push(html);
        else if (l.fechaRetiro) retiro.push(html);
        else llevar.push(html);
      });

      let html = "";
      if (llevar.length) html += `<div class="separador-seccion">Se lleva</div>` + llevar.join("");
      if (retiro.length) html += `<div class="separador-seccion">Retiro en tienda</div>` + retiro.join("");
      if (despacho.length) html += `<div class="separador-seccion">Para despacho</div>` + despacho.join("");
      contLineas.innerHTML = html;
    }

    if (!editable) return;

    contLineas.querySelectorAll(".tarjeta-linea").forEach((el) => {
      const idx = Number(el.dataset.index);
      const linea = carro.lineas[idx];
      const art = catalogoPorSku(linea.sku);

      el.querySelector('[data-accion="menos"]')?.addEventListener("click", () => {
        linea.cantidad -= 1;
        if (linea.cantidad <= 0) carro.lineas.splice(idx, 1);
        renderLineas();
        renderFooter();
      });
      el.querySelector('[data-accion="mas"]')?.addEventListener("click", () => {
        const stockDisponible = obtenerStockDisponible(art, linea) ?? 1;
        if (stockDisponible <= 0) abrirSheetMultitienda(idx);
        else {
          linea.cantidad += 1;
          renderLineas();
          renderFooter();
        }
      });
      el.querySelector('[data-accion="eliminar"]')?.addEventListener("click", () => {
        carro.lineas.splice(idx, 1);
        renderLineas();
        renderFooter();
      });
      el.querySelector('[data-accion="despacho"]')?.addEventListener("click", () => {
        if (!linea.esDespacho) {
          if (!linea.direccionId) abrirSheetDireccion(idx);
          else { linea.esDespacho = true; renderLineas(); renderFooter(); }
        } else {
          linea.esDespacho = false;
          if (!linea.fechaRetiro) abrirSheetRetiro(idx);
          else { renderLineas(); renderFooter(); }
        }
      });
      el.querySelector('[data-accion="cambiar-direccion"]')?.addEventListener("click", () => abrirSheetDireccion(idx));
      el.querySelector('[data-accion="cambiar-retiro"]')?.addEventListener("click", () => abrirSheetRetiro(idx));
      el.querySelector('[data-accion="promo"]')?.addEventListener("click", () => abrirSheetPromoProducto(idx));
    });
  }

  // ── Footer / total ────────────────────────────────────────────────────
  function renderFooter() {
    guardarEstado();
    const { total, items, subtotalBruto, descuentoProductos, descuentoCarrito, costoDespacho } = calcularCarro(carro);
    const desglose = document.getElementById("footer-desglose");
    const btnCobrar = document.getElementById("btn-cobrar");
    const promoLink = document.getElementById("footer-promo-link");
    const hayEnvioDomicilio = carro.lineas.some((l) => l.esDespacho);

    let filas = "";
    if (descuentoProductos > 0 || descuentoCarrito > 0 || hayEnvioDomicilio) {
      filas += `<div class="footer-total__linea-desc"><span>Subtotal</span><span>${clp(subtotalBruto)}</span></div>`;
      if (descuentoProductos > 0) {
        filas += `<div class="footer-total__linea-desc"><span>Descuentos en productos</span><span>-${clp(descuentoProductos)}</span></div>`;
      }
      if (descuentoCarrito > 0) {
        filas += `<div class="footer-total__linea-desc"><span>Descuento en carrito</span><span>-${clp(descuentoCarrito)}</span></div>`;
      }
      // Se muestra siempre que haya al menos 1 producto en despacho, aunque
      // sea Regular (gratis) — es un concepto de cobro propio, no solo el
      // recargo de Express (pedido explicito: "verlo como concepto de cobro").
      if (hayEnvioDomicilio) {
        filas += `<div class="footer-total__linea-desc"><span>Despacho a domicilio</span><span>${costoDespacho > 0 ? "+" + clp(costoDespacho) : "Gratis"}</span></div>`;
      }
    }
    desglose.innerHTML = filas;

    document.getElementById("footer-items").textContent = items > 0 ? ` · ${items} ${items === 1 ? "producto" : "productos"}` : "";
    document.getElementById("footer-total-monto").textContent = clp(total);
    if (editable) btnCobrar.disabled = carro.lineas.length === 0;

    if (editable && carro.lineas.length > 0 && DATA.promocionesCarrito.length > 0) {
      promoLink.style.display = "inline";
      promoLink.textContent = carro.promocionCarritoAplicadaId ? " · Cambiar descuento" : " · Desc. disponible";
      promoLink.onclick = abrirSheetPromoCarrito;
    } else {
      promoLink.style.display = "none";
    }

    const btnEnvio = document.getElementById("btn-envio-rapido");
    const lineasSimples = carro.lineas.filter((l) => {
      const art = catalogoPorSku(l.sku);
      return art && !art.tipo;
    });
    if (editable && lineasSimples.length > 0) {
      btnEnvio.style.display = "flex";
      const todosEnDespacho = lineasSimples.every((l) => l.esDespacho);
      btnEnvio.classList.toggle("icon-btn--activo", todosEnDespacho);
      btnEnvio.onclick = () => {
        if (todosEnDespacho) {
          lineasSimples.forEach((l) => (l.esDespacho = false));
          mostrarToast("Despacho desactivado para todo el carro");
        } else {
          lineasSimples.forEach((l) => {
            l.esDespacho = true;
            if (!l.direccionId) l.direccionId = DATA.direcciones[0].id;
            if (!l.tipoDespacho) {
              l.tipoDespacho = "regular";
              l.fechaDespacho = fechasDespachoRegular()[0].value;
            }
          });
          mostrarToast("Todo el carro se enviara a domicilio");
        }
        renderLineas();
        renderFooter();
      };
    } else {
      btnEnvio.style.display = "none";
    }
  }

  // ── Agregar linea + venta cruzada ("lleva algo mas") ──────────────────
  function agregarLineaAlCarro(sku, opts = {}) {
    const color = opts.colorSeleccionado || null;
    const existente = carro.lineas.find((l) => l.sku === sku && (l.colorSeleccionado || null) === color);
    if (existente) existente.cantidad += 1;
    else carro.lineas.push({ sku, cantidad: 1, esDespacho: false, colorSeleccionado: color });
  }

  // Despues de agregar un producto: si tiene venta cruzada configurada
  // ("recomienda"), muestra el paso de sugerencias; si no, vuelve a la lista.
  function despuesDeAgregar(sku) {
    const art = catalogoPorSku(sku);
    const disponibles = (art.recomienda || []).filter((s) => !carro.lineas.some((l) => l.sku === s));
    if (disponibles.length > 0) mostrarRecomendacionesSheet(sku, disponibles);
    else mostrarListaAgregarProducto();
  }

  // ── Paso: sugerencias "lleva algo mas" (venta cruzada) ────────────────
  function mostrarRecomendacionesSheet(origenSku, skusReco) {
    const origen = catalogoPorSku(origenSku);
    const items = skusReco.map((s) => catalogoPorSku(s));
    abrirSheet(
      `
      <div class="sheet__handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="sheet__titulo" style="display:flex;align-items:center;gap:8px">
          <span style="color:var(--azul-primario);display:flex">${ICONS.suggest}</span><span>Ofrece tambien</span>
        </div>
        <button class="icon-btn sheet__cerrar" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="sheet__detalle">Los clientes que llevan ${esc(origen.nombre)} suelen sumar:</div>
      <div class="sheet__lista" id="sheet-lista-reco"></div>
      <button class="btn-cobrar" id="reco-listo" style="width:100%;height:auto;padding:18px;margin-top:8px;font-size:16px">Listo, seguir comprando</button>`,
      (root) => {
        const lista = root.querySelector("#sheet-lista-reco");
        lista.innerHTML = items
          .map(
            (reco) => `
          <div class="sheet__item" data-sku="${reco.sku}">
            <div class="tarjeta-linea__img" style="width:36px;height:36px;font-size:17px">${reco.icono}</div>
            <div class="sheet__item-info">
              <div class="sheet__item-nombre">${esc(reco.nombre)}</div>
              <div class="sheet__item-detalle">${clp(reco.precioOferta ?? reco.precio)}</div>
            </div>
            <button class="sheet__item-agregar" data-accion="agregar-reco" data-sku="${reco.sku}">${ICONS.plus}</button>
          </div>`,
          )
          .join("");
        lista.querySelectorAll('[data-accion="agregar-reco"]').forEach((btn) => {
          btn.addEventListener("click", () => {
            const sku = btn.dataset.sku;
            agregarLineaAlCarro(sku);
            renderLineas();
            renderFooter();
            mostrarToast(`${catalogoPorSku(sku).nombre} agregado`);
            btn.disabled = true;
            btn.innerHTML = ICONS.check;
          });
        });
        root.querySelector("#reco-listo").addEventListener("click", () => mostrarListaAgregarProducto());
      },
    );
  }

  // ── Paso: elegir color (productos con variantes) ──────────────────────
  function mostrarColorSheet(sku) {
    const art = catalogoPorSku(sku);
    let colorSel = null;
    abrirSheet(
      `
      <div class="sheet__handle"></div>
      <div class="sheet__header-row">
        <button class="icon-btn sheet__volver" aria-label="Volver">${ICONS.back}</button>
        <div class="sheet__titulo">Elige el color</div>
        <button class="icon-btn sheet__cerrar" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="sheet__detalle">${esc(art.nombre)}${art.variante ? " · " + esc(art.variante) : ""}</div>
      <div id="lista-colores" style="margin-top:8px"></div>
      <button class="btn-cobrar" id="color-confirmar" style="width:100%;margin-top:12px" disabled>Agregar</button>`,
      (root) => {
        const lista = root.querySelector("#lista-colores");
        const btnConfirmar = root.querySelector("#color-confirmar");
        lista.innerHTML = art.variantes
          .map(
            (v) => `
          <div class="radio-row ${v.stock <= 0 ? "radio-row--agotado" : ""}" data-color="${esc(v.color)}">
            <span class="swatch" style="background:${colorHex(v.color)}"></span>
            <div style="flex:1">${esc(v.color)}</div>
            <span class="sheet__item-detalle ${v.stock <= 0 ? "disp-stock--agotado" : ""}">${v.stock <= 0 ? "Sin stock" : `Stock: ${v.stock}`}</span>
          </div>`,
          )
          .join("");
        lista.querySelectorAll(".radio-row").forEach((row) => {
          row.addEventListener("click", () => {
            if (row.classList.contains("radio-row--agotado")) return;
            colorSel = row.dataset.color;
            lista.querySelectorAll(".swatch").forEach((s) => s.classList.remove("swatch--sel"));
            row.querySelector(".swatch").classList.add("swatch--sel");
            btnConfirmar.disabled = false;
          });
        });
        btnConfirmar.addEventListener("click", () => {
          agregarLineaAlCarro(sku, { colorSeleccionado: colorSel });
          renderLineas();
          renderFooter();
          mostrarToast(`${art.nombre} (${colorSel}) agregado`);
          despuesDeAgregar(sku);
        });
      },
    );
  }

  // ── Dialogo: monto de giftcard ─────────────────────────────────────────
  function abrirDialogoMontoGiftcard(sku) {
    abrirDialogo(
      `
      <div class="dialog-box__titulo">Monto de la giftcard</div>
      <div class="dialog-box__texto">Ingresa el monto que el cliente quiere cargar en la giftcard.</div>
      <input class="dialog-box__input" id="input-monto-giftcard" type="number" min="1000" step="1000" placeholder="Ej: 20000" />
      <div class="dialog-box__acciones">
        <button class="btn-outline" id="dg-cancelar">Cancelar</button>
        <button class="btn-cobrar" id="dg-confirmar" style="width:auto;flex:1">Agregar</button>
      </div>`,
      (root) => {
        root.querySelector("#dg-cancelar").addEventListener("click", cerrarDialogo);
        root.querySelector("#dg-confirmar").addEventListener("click", () => {
          const monto = Number(root.querySelector("#input-monto-giftcard").value);
          if (!monto || monto <= 0) {
            mostrarToast("Ingresa un monto valido");
            return;
          }
          carro.lineas.push({ sku, cantidad: 1, montoGiftcard: monto, esDespacho: false, id: `gc-${giftcardSeq++}` });
          cerrarDialogo();
          cerrarSheet();
          renderLineas();
          renderFooter();
          mostrarToast("Giftcard agregada");
        });
      },
    );
  }

  // ── Sheet: agregar producto (Buscar / Escanear) ───────────────────────
  function mostrarListaAgregarProducto() {
    abrirSheet(
      `
      <div class="sheet__handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="sheet__titulo">Agregar producto</div>
        <button class="icon-btn sheet__cerrar" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="sheet__detalle">Escribe el nombre o SKU del producto.</div>
      <div class="sheet__buscador">${ICONS.search}<input id="sheet-buscar-input" type="text" placeholder="Nombre o SKU" /></div>
      <div class="sheet__lista" id="sheet-lista"></div>`,
      (root) => {
        const input = root.querySelector("#sheet-buscar-input");
        const lista = root.querySelector("#sheet-lista");
        const render = () => {
          const query = (input.value || "").trim().toLowerCase();
          const resultados = DATA.catalogo.filter((a) => !query || a.nombre.toLowerCase().includes(query) || a.sku.toLowerCase().includes(query));
          if (resultados.length === 0) {
            lista.innerHTML = `<div class="sheet__item-detalle" style="padding:12px 0">Sin resultados para "${esc(query)}".</div>`;
            return;
          }
          lista.innerHTML = resultados
            .map((a) => {
              let detalle;
              let sinStock = false;
              if (a.tipo === "giftcard") {
                detalle = "Monto a definir al agregar";
              } else if (a.variantes) {
                const stockTotal = a.variantes.reduce((n, v) => n + v.stock, 0);
                detalle = `${clp(a.precioOferta ?? a.precio)} · ${a.variantes.length} colores disponibles`;
                sinStock = stockTotal <= 0;
              } else {
                const enCarro = carro.lineas.filter((l) => l.sku === a.sku).reduce((n, l) => n + l.cantidad, 0);
                const disponible = a.stock - enCarro;
                detalle = `SKU: ${a.sku} · ${clp(a.precioOferta ?? a.precio)} · Stock: ${disponible}`;
                sinStock = disponible <= 0;
              }
              return `
              <div class="sheet__item" data-sku="${a.sku}">
                <div class="tarjeta-linea__img" style="width:36px;height:36px;font-size:17px">${a.icono}</div>
                <div class="sheet__item-info">
                  <div class="sheet__item-nombre">${esc(a.nombre)}</div>
                  <div class="sheet__item-detalle">${sinStock ? "Sin stock local — pide desde otra tienda al agregarlo" : detalle}</div>
                </div>
                <button class="sheet__item-agregar" data-accion="agregar" data-sin-stock="${sinStock}">${ICONS.plus}</button>
              </div>`;
            })
            .join("");

          lista.querySelectorAll('[data-accion="agregar"]').forEach((btn) => {
            btn.addEventListener("click", () => {
              const sku = btn.closest(".sheet__item").dataset.sku;
              const art = catalogoPorSku(sku);
              if (art.tipo === "giftcard") {
                abrirDialogoMontoGiftcard(sku);
                return;
              }
              if (art.variantes) {
                mostrarColorSheet(sku);
                return;
              }
              agregarLineaAlCarro(sku);
              renderLineas();
              renderFooter();
              if (btn.dataset.sinStock === "true") {
                const idx = carro.lineas.findIndex((l) => l.sku === sku);
                cerrarSheet();
                abrirSheetMultitienda(idx);
              } else {
                mostrarToast(`${art.nombre} agregado`);
                despuesDeAgregar(sku);
              }
            });
          });
        };
        input.addEventListener("input", render);
        render();
      },
    );
  }

  // ── Sheet: direccion + tipo de despacho ─────────────────────────────────
  function abrirSheetDireccion(idx) {
    const linea = carro.lineas[idx];
    let tipoSel = linea.tipoDespacho || "regular";
    let fechaSel = linea.fechaDespacho || null;
    let horarioSel = linea.rangoHorarioDespacho || null;
    const fechas = fechasDespachoRegular();

    abrirSheet(
      `
      <div class="sheet__handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="sheet__titulo">Direccion de despacho</div>
        <button class="icon-btn sheet__cerrar" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="sheet__detalle">Selecciona donde se enviara este producto.</div>
      <div id="lista-direcciones"></div>
      <div class="sheet__nueva-direccion" id="form-nueva-direccion" style="display:none">
        <input class="sheet__input" id="nueva-dir-calle" type="text" placeholder="Calle y numero" />
        <input class="sheet__input" id="nueva-dir-comuna" type="text" placeholder="Comuna" style="margin-top:8px" />
        <button class="btn-cobrar" id="btn-guardar-direccion" style="width:100%;margin-top:8px">Usar esta direccion</button>
      </div>
      <button class="btn-outline" id="btn-nueva-direccion" style="height:auto;padding:12px;margin-top:8px">+ Agregar nueva direccion</button>

      <div class="sheet__subtitulo">Tipo de despacho</div>
      <div style="display:flex;gap:8px">
        <button class="chip-toggle" id="tipo-regular" style="flex:1;justify-content:center">Regular (+${clp(COSTO_DESPACHO_REGULAR)})</button>
        <button class="chip-toggle" id="tipo-express" style="flex:1;justify-content:center">Express (+${clp(COSTO_DESPACHO_EXPRESS)})</button>
      </div>
      <div id="opciones-despacho"></div>

      <div class="sheet__subtitulo">Quien recibe</div>
      <input class="sheet__input" id="input-nombre-receptor" type="text" placeholder="Nombre de quien recibe" value="${esc(linea.nombreReceptor || "")}" />

      <button class="btn-cobrar" id="btn-confirmar-despacho" style="width:100%;margin-top:12px" disabled>Confirmar despacho</button>`,
      (root) => {
        const listaEl = root.querySelector("#lista-direcciones");
        const btnRegular = root.querySelector("#tipo-regular");
        const btnExpress = root.querySelector("#tipo-express");
        const opcionesEl = root.querySelector("#opciones-despacho");
        const inputReceptor = root.querySelector("#input-nombre-receptor");
        const btnConfirmar = root.querySelector("#btn-confirmar-despacho");

        function pintarDirecciones() {
          listaEl.innerHTML = DATA.direcciones
            .map(
              (d) => `
            <div class="radio-row" data-id="${d.id}">
              <span class="radio-dot ${linea.direccionId === d.id ? "radio-dot--activo" : ""}"></span>
              <div>
                <div>${esc(d.direccion)}</div>
                <div class="sheet__item-detalle">${esc(d.comuna)}</div>
              </div>
            </div>`,
            )
            .join("");
          listaEl.querySelectorAll(".radio-row").forEach((row) => {
            row.addEventListener("click", () => {
              linea.direccionId = row.dataset.id;
              pintarDirecciones();
              actualizarConfirmar();
            });
          });
        }

        function pintarOpcionesDespacho() {
          btnRegular.classList.toggle("chip-toggle--activo", tipoSel === "regular");
          btnExpress.classList.toggle("chip-toggle--activo", tipoSel === "express");
          if (tipoSel === "regular") {
            opcionesEl.innerHTML = `
              <div class="sheet__subtitulo">Elige fecha y horario</div>
              <div class="calendario-horario">${calendarioHorarioHtml(fechas, RANGOS_HORARIO_REGULAR, fechaSel, horarioSel)}</div>`;
            wireCalendarioHorario(opcionesEl, (fecha, horario) => {
              fechaSel = fecha;
              horarioSel = horario;
              pintarOpcionesDespacho();
              actualizarConfirmar();
            });
          } else {
            opcionesEl.innerHTML = `
              <div class="sheet__subtitulo">Elige un rango horario</div>
              <div class="calendario-horario">${rangosHorarioHtml(RANGOS_HORARIO_EXPRESS, horarioSel)}</div>`;
            wireCalendarioHorario(opcionesEl, (_fecha, horario) => {
              horarioSel = horario;
              pintarOpcionesDespacho();
              actualizarConfirmar();
            });
          }
        }

        function actualizarConfirmar() {
          const listo = linea.direccionId && (tipoSel === "regular" ? fechaSel && horarioSel : horarioSel) && inputReceptor.value.trim();
          btnConfirmar.disabled = !listo;
        }
        inputReceptor.addEventListener("input", actualizarConfirmar);

        btnRegular.addEventListener("click", () => { tipoSel = "regular"; horarioSel = null; pintarOpcionesDespacho(); actualizarConfirmar(); });
        btnExpress.addEventListener("click", () => { tipoSel = "express"; horarioSel = null; pintarOpcionesDespacho(); actualizarConfirmar(); });

        pintarDirecciones();
        pintarOpcionesDespacho();
        actualizarConfirmar();

        root.querySelector("#btn-nueva-direccion").addEventListener("click", () => {
          root.querySelector("#form-nueva-direccion").style.display = "block";
        });
        root.querySelector("#btn-guardar-direccion").addEventListener("click", () => {
          const calle = root.querySelector("#nueva-dir-calle").value.trim();
          const comuna = root.querySelector("#nueva-dir-comuna").value.trim();
          if (!calle || !comuna) {
            mostrarToast("Completa calle y comuna");
            return;
          }
          const nueva = { id: `d-${Date.now()}`, direccion: calle, comuna };
          DATA.direcciones.push(nueva);
          linea.direccionId = nueva.id;
          root.querySelector("#form-nueva-direccion").style.display = "none";
          pintarDirecciones();
          actualizarConfirmar();
        });

        btnConfirmar.addEventListener("click", () => {
          linea.esDespacho = true;
          linea.tipoDespacho = tipoSel;
          linea.fechaDespacho = tipoSel === "regular" ? fechaSel : null;
          linea.rangoHorarioDespacho = horarioSel;
          linea.nombreReceptor = inputReceptor.value.trim();
          cerrarSheet();
          renderLineas();
          renderFooter();
          mostrarToast("Despacho configurado");
        });
      },
    );
  }

  // ── Sheet: horario de retiro en tienda ──────────────────────────────────
  function abrirSheetRetiro(idx) {
    const linea = carro.lineas[idx];
    let fechaSel = linea.fechaRetiro || null;
    let horarioSel = linea.horarioRetiro || null;
    const fechas = fechasDespachoRegular();

    abrirSheet(
      `
      <div class="sheet__handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="sheet__titulo">Retiro en tienda</div>
        <button class="icon-btn sheet__cerrar" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="sheet__detalle">Elige cuando el cliente pasara a retirar en ${esc(DATA.tienda.nombre)}. Desliza para ver mas fechas.</div>
      <div class="calendario-horario" id="calendario-retiro"></div>

      <div class="sheet__subtitulo">Quien retira</div>
      <input class="sheet__input" id="input-nombre-receptor" type="text" placeholder="Nombre de quien retira" value="${esc(linea.nombreReceptor || "")}" />

      <button class="btn-cobrar" id="btn-confirmar-retiro" style="width:100%;margin-top:12px" disabled>Confirmar retiro</button>`,
      (root) => {
        const calendarioEl = root.querySelector("#calendario-retiro");
        const inputReceptor = root.querySelector("#input-nombre-receptor");
        const btnConfirmar = root.querySelector("#btn-confirmar-retiro");

        function actualizarConfirmar() {
          btnConfirmar.disabled = !(fechaSel && horarioSel && inputReceptor.value.trim());
        }
        inputReceptor.addEventListener("input", actualizarConfirmar);

        function pintarCalendario() {
          calendarioEl.innerHTML = calendarioHorarioHtml(fechas, RANGOS_HORARIO_REGULAR, fechaSel, horarioSel);
          wireCalendarioHorario(calendarioEl, (fecha, horario) => {
            fechaSel = fecha;
            horarioSel = horario;
            pintarCalendario();
            actualizarConfirmar();
          });
        }
        pintarCalendario();

        actualizarConfirmar();

        btnConfirmar.addEventListener("click", () => {
          linea.fechaRetiro = fechaSel;
          linea.horarioRetiro = horarioSel;
          linea.nombreReceptor = inputReceptor.value.trim();
          cerrarSheet();
          renderLineas();
          renderFooter();
          mostrarToast("Retiro configurado");
        });
      },
    );
  }

  // ── Sheet: promocion por producto ─────────────────────────────────────
  function abrirSheetPromoProducto(idx) {
    const linea = carro.lineas[idx];
    const art = catalogoPorSku(linea.sku);
    abrirSheet(
      `
      <div class="sheet__handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="sheet__titulo">Ofertas para ${esc(art.nombre)}</div>
        <button class="icon-btn sheet__cerrar" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div id="lista-promos-producto"></div>`,
      (root) => {
        const listaEl = root.querySelector("#lista-promos-producto");
        const opciones = [{ id: null, descripcion: "Sin descuento" }, ...art.promociones];
        listaEl.innerHTML = opciones
          .map(
            (p) => `
          <div class="radio-row" data-id="${p.id ?? ""}">
            <span class="radio-dot ${linea.promocionAplicadaId === p.id ? "radio-dot--activo" : ""}"></span>
            <div style="flex:1">${esc(p.descripcion)}</div>
            ${p.ahorroUnitario ? `<span style="color:var(--azul-primario);font-weight:600">-${clp(p.ahorroUnitario)}</span>` : ""}
          </div>`,
          )
          .join("");
        listaEl.querySelectorAll(".radio-row").forEach((row) => {
          row.addEventListener("click", () => {
            linea.promocionAplicadaId = row.dataset.id || null;
            cerrarSheet();
            renderLineas();
            renderFooter();
          });
        });
      },
    );
  }

  // ── Sheet: promocion de carrito ────────────────────────────────────────
  function abrirSheetPromoCarrito() {
    abrirSheet(
      `
      <div class="sheet__handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="sheet__titulo">Ofertas para este carrito</div>
        <button class="icon-btn sheet__cerrar" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div id="lista-promos-carrito"></div>`,
      (root) => {
        const listaEl = root.querySelector("#lista-promos-carrito");
        const opciones = [{ id: null, descripcion: "Sin descuento" }, ...DATA.promocionesCarrito];
        listaEl.innerHTML = opciones
          .map(
            (p) => `
          <div class="radio-row" data-id="${p.id ?? ""}">
            <span class="radio-dot ${carro.promocionCarritoAplicadaId === p.id ? "radio-dot--activo" : ""}"></span>
            <div style="flex:1">${esc(p.descripcion)}</div>
          </div>`,
          )
          .join("");
        listaEl.querySelectorAll(".radio-row").forEach((row) => {
          row.addEventListener("click", () => {
            carro.promocionCarritoAplicadaId = row.dataset.id || null;
            cerrarSheet();
            renderFooter();
          });
        });
      },
    );
  }

  // ── Sheet: multitienda ─────────────────────────────────────────────────
  function abrirSheetMultitienda(idx) {
    const linea = carro.lineas[idx];
    const art = catalogoPorSku(linea.sku);
    let tiendaSel = null;
    let modalidadSel = "retiro";
    abrirSheet(
      `
      <div class="sheet__handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="sheet__titulo">Sin stock local</div>
        <button class="icon-btn sheet__cerrar" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="sheet__detalle">${esc(art.nombre)} no tiene mas stock en esta tienda. Puedes pedirlo a otra tienda de la red.</div>
      <div class="sheet__subtitulo">Disponible en:</div>
      <div id="lista-tiendas"></div>
      <div class="sheet__subtitulo">Modalidad:</div>
      <div id="lista-modalidad"></div>
      <button class="btn-cobrar" id="btn-confirmar-multitienda" style="width:100%;margin-top:12px" disabled>Confirmar</button>`,
      (root) => {
        const listaTiendas = root.querySelector("#lista-tiendas");
        const listaModalidad = root.querySelector("#lista-modalidad");
        const btnConfirmar = root.querySelector("#btn-confirmar-multitienda");

        listaTiendas.innerHTML = DATA.tiendasRed
          .map(
            (t) => `
          <div class="radio-row" data-id="${t.id}">
            <span class="radio-dot"></span>
            <div style="flex:1">${esc(t.nombre)}</div>
            <span class="sheet__item-detalle">Stock: ${t.stock}</span>
          </div>`,
          )
          .join("");
        listaModalidad.innerHTML = `
          <div class="radio-row" data-modalidad="retiro"><span class="radio-dot radio-dot--activo"></span><div>Retiro en otra tienda</div></div>
          <div class="radio-row" data-modalidad="despacho"><span class="radio-dot"></span><div>Despacho a domicilio</div></div>`;

        listaTiendas.querySelectorAll(".radio-row").forEach((row) => {
          row.addEventListener("click", () => {
            tiendaSel = row.dataset.id;
            listaTiendas.querySelectorAll(".radio-dot").forEach((d) => d.classList.remove("radio-dot--activo"));
            row.querySelector(".radio-dot").classList.add("radio-dot--activo");
            btnConfirmar.disabled = false;
          });
        });
        listaModalidad.querySelectorAll(".radio-row").forEach((row) => {
          row.addEventListener("click", () => {
            modalidadSel = row.dataset.modalidad;
            listaModalidad.querySelectorAll(".radio-dot").forEach((d) => d.classList.remove("radio-dot--activo"));
            row.querySelector(".radio-dot").classList.add("radio-dot--activo");
          });
        });
        btnConfirmar.addEventListener("click", () => {
          const tienda = DATA.tiendasRed.find((t) => t.id === tiendaSel);
          linea.cantidad += 1;
          linea.tiendaOrigenNombre = tienda.nombre;
          if (modalidadSel === "despacho") {
            linea.esDespacho = true;
            if (!linea.direccionId) linea.direccionId = DATA.direcciones[0].id;
            if (!linea.tipoDespacho) {
              linea.tipoDespacho = "regular";
              linea.fechaDespacho = fechasDespachoRegular()[0].value;
            }
          }
          cerrarSheet();
          renderLineas();
          renderFooter();
          mostrarToast(`Solicitado desde ${tienda.nombre}`);
        });
      },
    );
  }

  // ── Sheet: cambiar cliente ─────────────────────────────────────────────
  function abrirSheetCliente() {
    abrirSheet(
      `
      <div class="sheet__handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="sheet__titulo">Cambiar cliente</div>
        <button class="icon-btn sheet__cerrar" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="sheet__buscador">${ICONS.search}<input id="input-buscar-cliente" type="text" placeholder="Nombre o RUT" /></div>
      <div class="sheet__lista" id="lista-clientes"></div>`,
      (root) => {
        const input = root.querySelector("#input-buscar-cliente");
        const lista = root.querySelector("#lista-clientes");
        const pintar = () => {
          const query = (input.value || "").trim().toLowerCase();
          const todos = [{ rut: null, nombre: "Cliente generico" }, ...DATA.clientes];
          const filtrados = todos.filter((c) => !query || c.nombre.toLowerCase().includes(query) || (c.rut || "").includes(query));
          lista.innerHTML = filtrados
            .map(
              (c) => `
            <div class="radio-row" data-rut="${c.rut ?? ""}" data-nombre="${esc(c.nombre)}">
              <span class="radio-dot ${carro.clienteRut === c.rut ? "radio-dot--activo" : ""}"></span>
              <div>
                <div>${esc(c.nombre)}</div>
                ${c.rut ? `<div class="sheet__item-detalle">${c.rut}</div>` : ""}
              </div>
            </div>`,
            )
            .join("");
          lista.querySelectorAll(".radio-row").forEach((row) => {
            row.addEventListener("click", () => {
              carro.clienteRut = row.dataset.rut || null;
              carro.cliente = row.dataset.nombre;
              cerrarSheet();
              renderEncabezado();
              mostrarToast("Cliente actualizado");
            });
          });
        };
        input.addEventListener("input", pintar);
        pintar();
      },
    );
  }

  // ── Sheet: cambiar tipo de documento ────────────────────────────────────
  function abrirSheetTipoDocumento() {
    let tipoSel = carro.tipoDocumento;
    abrirSheet(
      `
      <div class="sheet__handle"></div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="sheet__titulo">Tipo de documento</div>
        <button class="icon-btn sheet__cerrar" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div id="lista-tipo-doc"></div>
      <div id="form-factura" style="display:${tipoSel === "Factura" ? "block" : "none"}"></div>
      <button class="btn-cobrar" id="btn-guardar-doc" style="width:100%;margin-top:12px">Guardar</button>`,
      (root) => {
        const listaEl = root.querySelector("#lista-tipo-doc");
        const formEl = root.querySelector("#form-factura");
        const df = carro.datosFactura || { rut: "", razonSocial: "", giro: "", correo: "", direccion: "" };

        const pintarLista = () => {
          listaEl.innerHTML = ["Boleta", "Factura"]
            .map(
              (t) => `
            <div class="radio-row" data-tipo="${t}">
              <span class="radio-dot ${tipoSel === t ? "radio-dot--activo" : ""}"></span>
              <div>${t}</div>
            </div>`,
            )
            .join("");
          listaEl.querySelectorAll(".radio-row").forEach((row) => {
            row.addEventListener("click", () => {
              tipoSel = row.dataset.tipo;
              formEl.style.display = tipoSel === "Factura" ? "block" : "none";
              pintarLista();
            });
          });
        };
        pintarLista();

        formEl.innerHTML = `
          <input class="sheet__input" id="f-rut" type="text" placeholder="RUT empresa" value="${esc(df.rut)}" style="margin-top:8px" />
          <input class="sheet__input" id="f-razon" type="text" placeholder="Razon social" value="${esc(df.razonSocial)}" style="margin-top:8px" />
          <input class="sheet__input" id="f-giro" type="text" placeholder="Giro" value="${esc(df.giro)}" style="margin-top:8px" />
          <input class="sheet__input" id="f-correo" type="email" placeholder="Correo" value="${esc(df.correo)}" style="margin-top:8px" />
          <input class="sheet__input" id="f-direccion" type="text" placeholder="Direccion" value="${esc(df.direccion)}" style="margin-top:8px" />`;

        root.querySelector("#btn-guardar-doc").addEventListener("click", () => {
          carro.tipoDocumento = tipoSel;
          if (tipoSel === "Factura") {
            const val = (id) => root.querySelector(id).value.trim();
            const rut = val("#f-rut"), razonSocial = val("#f-razon");
            if (!rut || !razonSocial) {
              mostrarToast("RUT y razon social son obligatorios");
              return;
            }
            carro.datosFactura = { rut, razonSocial, giro: val("#f-giro"), correo: val("#f-correo"), direccion: val("#f-direccion") };
          }
          cerrarSheet();
          renderEncabezado();
          mostrarToast("Tipo de documento actualizado");
        });
      },
    );
  }

  // ── Dialogo: eliminar carro ─────────────────────────────────────────────
  function abrirDialogoEliminarCarro() {
    abrirDialogo(
      `
      <div class="dialog-box__titulo">Eliminar carro</div>
      <div class="dialog-box__texto">El carro ${carro.numero} y todos sus productos seran eliminados. Esta accion no se puede deshacer.</div>
      <div class="dialog-box__acciones">
        <button class="btn-outline" id="del-cancelar">Cancelar</button>
        <button class="btn-cobrar" id="del-confirmar" style="width:auto;flex:1;background:var(--rojo-error)">Eliminar</button>
      </div>`,
      (root) => {
        root.querySelector("#del-cancelar").addEventListener("click", cerrarDialogo);
        root.querySelector("#del-confirmar").addEventListener("click", () => {
          carro.estado = "ANULADO";
          carro.estadoLabel = "Anulado";
          carro.lineas = [];
          guardarEstado();
          window.location.href = "index.html";
        });
      },
    );
  }

  // ── Wire general ─────────────────────────────────────────────────────
  renderEncabezado();
  renderLineas();
  renderFooter();

  document.getElementById("btn-volver").addEventListener("click", () => (window.location.href = "index.html"));

  document.getElementById("btn-cobrar").addEventListener("click", () => {
    window.location.href = `cobro.html?id=${carro.id}`;
  });

  const dropdown = document.getElementById("dropdown-menu");
  document.getElementById("btn-menu").addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("abierto");
  });
  document.addEventListener("click", () => dropdown.classList.remove("abierto"));
  document.getElementById("opt-cambiar-cliente").addEventListener("click", () => { dropdown.classList.remove("abierto"); abrirSheetCliente(); });
  document.getElementById("opt-cambiar-documento").addEventListener("click", () => { dropdown.classList.remove("abierto"); abrirSheetTipoDocumento(); });
  document.getElementById("opt-eliminar-carro").addEventListener("click", () => { dropdown.classList.remove("abierto"); abrirDialogoEliminarCarro(); });

  document.getElementById("btn-buscar").addEventListener("click", mostrarListaAgregarProducto);
  document.getElementById("btn-escanear").addEventListener("click", mostrarListaAgregarProducto);
}

// ── Pantalla: cobro (medios de pago) ────────────────────────────────────
function initCobro() {
  const cont = document.getElementById("contenido-cobro");
  if (!cont) return;

  const carroId = qs("id") || DATA.carros[0].id;
  const carro = DATA.carros.find((c) => c.id === carroId) || DATA.carros[0];
  carro.lineasPago = carro.lineasPago || [];
  const cliente = clienteDelCarro(carro);

  const dialogOverlay = document.getElementById("dialog-overlay");
  const dialogBox = document.getElementById("dialog-box");
  function abrirDialogo(html, wire) {
    dialogBox.innerHTML = html;
    if (wire) wire(dialogBox);
    dialogOverlay.classList.add("abierto");
  }
  function cerrarDialogo() {
    dialogOverlay.classList.remove("abierto");
  }
  dialogOverlay.addEventListener("click", (e) => { if (e.target === dialogOverlay) cerrarDialogo(); });

  let procesando = false;
  let lineaProcesandoId = null;
  let textoProcesando = "Procesando";

  function pendienteActual(excluirId) {
    const { total } = calcularCarro(carro);
    const asignado = carro.lineasPago.filter((l) => l.id !== excluirId).reduce((s, l) => s + l.monto, 0);
    return Math.max(0, total - asignado);
  }

  function esperar(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function lineaPagoHtml(l) {
    const enProceso = l.id === lineaProcesandoId;
    const etiqueta = medioEtiqueta(l.medio) + (l.medio === "GIFTCARD" && l.codigoGiftcard ? " " + enmascararGiftcard(l.codigoGiftcard) : "");
    return `
      <div class="linea-pago" data-id="${l.id}">
        <div class="icono-medio">${medioSigla(l.medio)}</div>
        <div class="linea-pago__info">
          <div class="linea-pago__medio">${esc(etiqueta)}</div>
          <div class="linea-pago__monto">${clp(l.monto)}</div>
          ${l.medio === "TARJETA" && l.voucher ? `<div class="linea-pago__monto">${esc(l.voucher)}</div>` : ""}
          ${l.medio === "EFECTIVO" && l.montoRecibido > l.monto ? `<div class="linea-pago__vuelto">Vuelto: ${clp(l.montoRecibido - l.monto)}</div>` : ""}
        </div>
        ${enProceso
          ? `<span class="spinner spinner--oscuro"></span>`
          : `<div class="linea-pago__acciones">
              ${l.estado === "APROBADO" ? `<span class="linea-pago__estado linea-pago__estado--aprobado">Aprobado</span>` : ""}
              ${!procesando && l.medio === "EFECTIVO" ? `<button class="btn-eliminar" data-accion="editar-pago" data-id="${l.id}">${ICONS.edit}</button>` : ""}
              ${!procesando ? `<button class="btn-eliminar" data-accion="eliminar-pago" data-id="${l.id}">${ICONS.close}</button>` : ""}
            </div>`}
      </div>`;
  }

  function render() {
    guardarEstado();
    document.getElementById("subtitulo-cobro").textContent = carro.numero;
    document.getElementById("btn-volver-cobro").style.visibility = procesando ? "hidden" : "visible";

    const { total, subtotalBruto, descuentoProductos, descuentoCarrito, costoDespacho } = calcularCarro(carro);
    const pendiente = pendienteActual();
    const hayDespacho = carro.lineas.filter((l) => l.esDespacho).length;
    const yaEfectivo = carro.lineasPago.some((l) => l.medio === "EFECTIVO");
    const yaCredito = carro.lineasPago.some((l) => l.medio === "CREDITO");
    const tieneCredito = cliente && cliente.credito > 0;
    const puedeAgregar = !procesando && pendiente > 0;
    const textoBoton = procesando ? textoProcesando : pendiente > 0 ? "Terminar cobro con tarjeta" : "Confirmar cobro";
    // Mismo desglose que el footer del carrito: total del carrito primero
    // (subtotal, sin descuento), despues cada descuento/recargo, y recien
    // abajo el Total ya con todo aplicado.
    const hayDesglose = descuentoProductos > 0 || descuentoCarrito > 0 || hayDespacho > 0;

    cont.innerHTML = `
      <div class="card">
        <div class="fila-resumen"><span>Cliente</span><span>${esc(carro.cliente)}</span></div>
        ${tieneCredito ? `
        <div class="banner-credito">
          <span class="banner-credito__label">Credito disponible</span>
          <span class="banner-credito__monto">${clp(cliente.credito)}</span>
        </div>` : ""}
        <div class="fila-resumen"><span>Tipo</span><span>${esc(carro.tipoDocumento)}</span></div>
        ${hayDesglose ? `<div class="fila-resumen"><span>Subtotal</span><span>${clp(subtotalBruto)}</span></div>` : ""}
        ${descuentoProductos > 0 ? `<div class="fila-resumen"><span>Descuentos en productos</span><span>-${clp(descuentoProductos)}</span></div>` : ""}
        ${descuentoCarrito > 0 ? `<div class="fila-resumen"><span>Descuento en carrito</span><span>-${clp(descuentoCarrito)}</span></div>` : ""}
        ${hayDespacho > 0 ? `<div class="fila-resumen"><span>Despacho a domicilio</span><span>${hayDespacho} producto(s)${costoDespacho > 0 ? " · +" + clp(costoDespacho) : " · Gratis"}</span></div>` : ""}
        <div class="fila-resumen fila-resumen--total"><span>Total</span><span>${clp(total)}</span></div>
        ${pendiente > 0 ? `<div class="fila-resumen fila-resumen--pendiente"><span>Por asignar</span><span>${clp(pendiente)}</span></div>` : ""}
      </div>

      <div class="seccion-label">Medios de pago</div>
      ${carro.lineasPago.length ? carro.lineasPago.map(lineaPagoHtml).join("") : `<span class="disp-stock">Aun no hay medios agregados.</span>`}

      ${puedeAgregar ? `
      <div class="seccion-label">Agregar medio de pago</div>
      <div class="mosaico-fila">
        ${!yaEfectivo ? `<div class="mosaico-medio" id="mosaico-efectivo"><div class="icono-medio">$</div><span>Efectivo</span></div>` : ""}
        <div class="mosaico-medio" id="mosaico-giftcard"><div class="icono-medio">G</div><span>Giftcard</span></div>
        ${tieneCredito && !yaCredito ? `<div class="mosaico-medio" id="mosaico-credito"><div class="icono-medio">C</div><span>Credito</span></div>` : ""}
      </div>` : ""}

      <button class="btn-cobrar" id="btn-confirmar-cobro" style="width:100%;margin-top:16px" ${procesando ? "disabled" : ""}>
        ${procesando ? `<span class="spinner"></span>` : ""}${esc(textoBoton)}
      </button>`;

    cont.querySelector("#mosaico-efectivo")?.addEventListener("click", () => abrirDialogoEfectivo());
    cont.querySelector("#mosaico-giftcard")?.addEventListener("click", () => abrirDialogoGiftcardPago());
    cont.querySelector("#mosaico-credito")?.addEventListener("click", () => abrirDialogoCredito());
    cont.querySelectorAll('[data-accion="editar-pago"]').forEach((btn) => {
      btn.addEventListener("click", () => abrirDialogoEfectivo(btn.dataset.id));
    });
    cont.querySelectorAll('[data-accion="eliminar-pago"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        carro.lineasPago = carro.lineasPago.filter((l) => l.id !== btn.dataset.id);
        render();
      });
    });
    cont.querySelector("#btn-confirmar-cobro")?.addEventListener("click", confirmarCobro);
  }

  // ── Dialogo: Efectivo (agregar o editar) — monto recibido + vuelto en vivo
  function abrirDialogoEfectivo(editandoId) {
    const lineaExistente = editandoId ? carro.lineasPago.find((l) => l.id === editandoId) : null;
    const pendienteBase = pendienteActual(editandoId);
    abrirDialogo(
      `
      <div class="dialog-box__titulo">Efectivo</div>
      <input class="dialog-box__input" id="input-monto-efectivo" type="number" min="1" placeholder="Ej: 20000" value="${lineaExistente ? lineaExistente.montoRecibido : ""}" />
      <div class="fila-resumen" id="fila-vuelto" style="margin-top:8px"><span>Vuelto</span><span id="vuelto-valor">${clp(0)}</span></div>
      <div class="dialog-box__acciones">
        <button class="btn-outline" id="ef-cancelar">Cancelar</button>
        <button class="btn-cobrar" id="ef-confirmar" style="width:auto;flex:1">${lineaExistente ? "Guardar" : "Agregar"}</button>
      </div>`,
      (root) => {
        const input = root.querySelector("#input-monto-efectivo");
        const vueltoEl = root.querySelector("#vuelto-valor");
        const actualizarVuelto = () => {
          const monto = Number(input.value) || 0;
          vueltoEl.textContent = clp(Math.max(0, monto - pendienteBase));
        };
        input.addEventListener("input", actualizarVuelto);
        actualizarVuelto();
        root.querySelector("#ef-cancelar").addEventListener("click", cerrarDialogo);
        root.querySelector("#ef-confirmar").addEventListener("click", () => {
          const monto = Number(input.value);
          if (!monto || monto <= 0) {
            mostrarToast("Ingresa un monto valido");
            return;
          }
          const montoAsignado = Math.min(monto, pendienteBase);
          if (lineaExistente) {
            lineaExistente.monto = montoAsignado;
            lineaExistente.montoRecibido = monto;
          } else {
            carro.lineasPago.push({ id: `p-${Date.now()}`, medio: "EFECTIVO", monto: montoAsignado, montoRecibido: monto, estado: "PENDIENTE" });
          }
          cerrarDialogo();
          render();
        });
      },
    );
  }

  // ── Dialogo: Giftcard como medio de pago — solo pide el codigo ─────────
  function abrirDialogoGiftcardPago() {
    abrirDialogo(
      `
      <div class="dialog-box__titulo">Giftcard</div>
      <div class="dialog-box__texto">Ingresa el codigo de la giftcard del cliente.</div>
      <input class="dialog-box__input" id="input-codigo-giftcard-pago" type="text" placeholder="Codigo de giftcard" />
      <div class="dialog-box__acciones">
        <button class="btn-outline" id="gc-cancelar">Cancelar</button>
        <button class="btn-cobrar" id="gc-confirmar" style="width:auto;flex:1">Aplicar</button>
      </div>`,
      (root) => {
        root.querySelector("#gc-cancelar").addEventListener("click", cerrarDialogo);
        root.querySelector("#gc-confirmar").addEventListener("click", () => {
          const codigo = root.querySelector("#input-codigo-giftcard-pago").value.trim();
          if (!codigo) {
            mostrarToast("Ingresa un codigo");
            return;
          }
          const monto = pendienteActual();
          carro.lineasPago.push({ id: `p-${Date.now()}`, medio: "GIFTCARD", monto, codigoGiftcard: codigo, estado: "PENDIENTE" });
          cerrarDialogo();
          render();
        });
      },
    );
  }

  // ── Dialogo: Credito de empresa — sin monto que tipear, se aplica el
  // maximo posible de una vez y se avisa cuanto queda disponible despues
  // (pedido explicito: decirle al cliente cuanto credito tiene y que el
  // carro le sale gratis/mas barato por eso). El descuento real al saldo
  // del cliente ocurre recien al confirmar el cobro (confirmarCobro), igual
  // que Tarjeta — mientras tanto esta linea solo "reserva" el monto.
  function abrirDialogoCredito() {
    const monto = Math.min(pendienteActual(), cliente.credito);
    const saldoRestante = cliente.credito - monto;
    abrirDialogo(
      `
      <div class="dialog-box__titulo">Credito disponible</div>
      <div class="dialog-box__texto">
        ${esc(cliente.nombre)} tiene ${clp(cliente.credito)} de credito disponible.
        Se aplicaran ${clp(monto)} a este carro${monto >= pendienteActual() ? " — queda pagado con esto" : ""}.
      </div>
      <div class="fila-resumen" style="margin-top:8px"><span>Saldo despues de este cobro</span><span>${clp(saldoRestante)}</span></div>
      <div class="dialog-box__acciones">
        <button class="btn-outline" id="cr-cancelar">Cancelar</button>
        <button class="btn-cobrar" id="cr-confirmar" style="width:auto;flex:1">Aplicar credito</button>
      </div>`,
      (root) => {
        root.querySelector("#cr-cancelar").addEventListener("click", cerrarDialogo);
        root.querySelector("#cr-confirmar").addEventListener("click", () => {
          carro.lineasPago.push({ id: `p-${Date.now()}`, medio: "CREDITO", monto, estado: "PENDIENTE" });
          cerrarDialogo();
          render();
        });
      },
    );
  }

  // ── Confirmar cobro: si queda pendiente lo cubre Tarjeta sola, luego
  // aprueba cada linea en secuencia (animacion de cobro) y va al documento.
  async function confirmarCobro() {
    const pendiente = pendienteActual();
    if (pendiente > 0) {
      textoProcesando = "Terminando cobro con tarjeta";
      carro.lineasPago.push({ id: `p-tarjeta-${Date.now()}`, medio: "TARJETA", monto: pendiente, estado: "PENDIENTE" });
    } else {
      textoProcesando = "Confirmando";
    }
    procesando = true;
    render();

    for (const linea of carro.lineasPago.filter((l) => l.estado !== "APROBADO")) {
      lineaProcesandoId = linea.id;
      render();
      await esperar(650);
      linea.estado = "APROBADO";
      if (linea.medio === "TARJETA") linea.voucher = "Voucher " + Math.floor(100000 + Math.random() * 900000);
      if (linea.medio === "CREDITO" && cliente) cliente.credito -= linea.monto;
      lineaProcesandoId = null;
      render();
    }

    carro.estado = "PAGADO";
    carro.estadoLabel = "Pagado";
    guardarEstado();
    await esperar(400);
    window.location.href = `documento.html?id=${carro.id}`;
  }

  document.getElementById("btn-volver-cobro").addEventListener("click", () => {
    window.location.href = `carrito.html?id=${carro.id}`;
  });

  render();
}

// ── Pantalla: documento (boleta/factura tras el cobro) ──────────────────
function initDocumento() {
  const screen = document.getElementById("app-screen-documento");
  if (!screen) return;

  const carroId = qs("id") || DATA.carros[0].id;
  const carro = DATA.carros.find((c) => c.id === carroId) || DATA.carros[0];
  const cliente = clienteDelCarro(carro);

  screen.innerHTML = `<div class="documento-generando"><span class="spinner spinner--oscuro spinner--grande"></span><div>Generando documento...</div></div>`;

  setTimeout(() => {
    if (!carro.docNumero) {
      const prefijo = carro.tipoDocumento === "Factura" ? "FE" : "BE";
      carro.docNumero = carro.numero.replace(/^[A-Z]+/, prefijo);
      carro.docFecha = formatearFechaHora(new Date());
      guardarEstado();
    }
    renderDocumento();
  }, 700);

  function renderDocumento() {
    const { total, subtotalBruto, descuentoProductos, descuentoCarrito, costoDespacho } = calcularCarro(carro);
    const lineasPago = carro.lineasPago || [];
    const lineaEfectivo = lineasPago.find((l) => l.medio === "EFECTIVO");
    const vuelto = lineaEfectivo && lineaEfectivo.montoRecibido > lineaEfectivo.monto ? lineaEfectivo.montoRecibido - lineaEfectivo.monto : null;
    const hayDespacho = carro.lineas.some((l) => l.esDespacho);
    const tipoLabel = carro.tipoDocumento === "Factura" ? "Factura electronica" : "Boleta electronica";

    // Detalle de como se entrega esta linea — el costo de despacho express se
    // ve aca mismo, pegado al producto que lo genera (no solo en el total).
    function detalleEntregaTexto(l) {
      if (l.esDespacho) {
        const direccion = l.direccionId ? DATA.direcciones.find((d) => d.id === l.direccionId) : null;
        const tipo = l.tipoDespacho === "express"
          ? `Express (+${clp(COSTO_DESPACHO_EXPRESS)}) · ${l.rangoHorarioDespacho || ""}`
          : `Regular (+${clp(COSTO_DESPACHO_REGULAR)}) · ${labelFechaDespacho(l.fechaDespacho)}${l.rangoHorarioDespacho ? " · " + l.rangoHorarioDespacho : ""}`;
        return `${direccion ? esc(direccion.direccion) + " · " : ""}${tipo}`;
      }
      if (l.fechaRetiro) {
        return `Retira: ${labelFechaDespacho(l.fechaRetiro)} · ${esc(l.horarioRetiro || "")}`;
      }
      return "";
    }

    function filaProductoHtml(art, l) {
      if (art.tipo === "giftcard") {
        return `<div class="fila-linea-producto"><div><div class="fila-linea-producto__nombre">${esc(art.nombre)}</div></div><div class="fila-linea-producto__monto">${clp(l.montoGiftcard)}</div></div>`;
      }
      const { unitario, subtotal, tachado } = precioLinea(art, l);
      const detalle = tachado != null
        ? `<del>${clp(tachado)}</del> ${clp(unitario)} x ${l.cantidad}`
        : `${l.cantidad} x ${clp(unitario)}`;
      const detalleEntrega = detalleEntregaTexto(l);
      return `
      <div class="fila-linea-producto">
        <div>
          <div class="fila-linea-producto__nombre">${esc(art.nombre)}</div>
          <div class="fila-linea-producto__detalle">${detalle}</div>
          ${detalleEntrega ? `<div class="fila-linea-producto__detalle">${detalleEntrega}</div>` : ""}
        </div>
        <div class="fila-linea-producto__monto">${clp(subtotal)}</div>
      </div>`;
    }

    // Se agrupa por como el cliente se lleva cada producto — kits/giftcards
    // se entregan ahi mismo, el resto queda en retiro o despacho segun lo
    // configurado en el carrito (l.esDespacho). Grupo sin items no se pinta.
    const grupoLlevar = [];
    const grupoRetiro = [];
    const grupoEnvio = [];
    carro.lineas.forEach((l) => {
      const art = catalogoPorSku(l.sku);
      if (!art) return;
      const html = filaProductoHtml(art, l);
      if (art.tipo === "giftcard" || art.tipo === "kit") grupoLlevar.push(html);
      else if (l.esDespacho) grupoEnvio.push(html);
      else if (l.fechaRetiro) grupoRetiro.push(html);
      else grupoLlevar.push(html);
    });
    let filasProducto = "";
    if (grupoLlevar.length) filasProducto += `<div class="separador-seccion">Se lleva ahora</div>` + grupoLlevar.join("");
    if (grupoRetiro.length) filasProducto += `<div class="separador-seccion">Retiro en tienda</div>` + grupoRetiro.join("");
    if (grupoEnvio.length) filasProducto += `<div class="separador-seccion">Envio a domicilio</div>` + grupoEnvio.join("");

    const filasPago = lineasPago
      .map((l) => {
        const etiqueta = medioEtiqueta(l.medio) + (l.medio === "GIFTCARD" && l.codigoGiftcard ? " " + enmascararGiftcard(l.codigoGiftcard) : "");
        return `
        <div class="linea-pago linea-pago--compacta">
          <div class="icono-medio icono-medio--sm">${medioSigla(l.medio)}</div>
          <div class="linea-pago__info">
            <div class="linea-pago__medio">${esc(etiqueta)}</div>
            ${l.voucher ? `<div class="linea-pago__monto">${esc(l.voucher)}</div>` : ""}
          </div>
          <div class="linea-pago__monto">${clp(l.monto)}</div>
        </div>`;
      })
      .join("");

    screen.innerHTML = `
      <div class="contenido" style="padding-bottom:0">
        <div class="documento-check">
          <div class="documento-check__icono">${ICONS.checkCircle}</div>
          <div class="documento-check__titulo">Venta completada</div>
          <div class="documento-check__numero">${esc(carro.numero)}</div>
        </div>

        <div style="border-top:1px solid rgba(0,0,0,0.08);margin:4px 0 8px"></div>
        <div class="seccion-label">Documento emitido</div>
        <div class="fila-resumen"><span>Tipo</span><span>${tipoLabel}</span></div>
        <div class="fila-resumen"><span>N. de comprobante</span><span>${esc(carro.docNumero)}</span></div>
        <div class="fila-resumen"><span>Fecha</span><span>${esc(carro.docFecha)}</span></div>
        <div class="fila-resumen"><span>Cliente</span><span>${esc(carro.cliente)}</span></div>
        ${carro.tipoDocumento === "Boleta" && carro.clienteRut ? `<div class="fila-resumen"><span>RUT</span><span>${esc(carro.clienteRut)}</span></div>` : ""}

        <div style="border-top:1px solid rgba(0,0,0,0.08);margin:12px 0 8px"></div>
        <div class="seccion-label">Detalle de venta</div>
        ${filasProducto}
        <div style="border-top:1px solid rgba(0,0,0,0.08);margin:8px 0"></div>
        <div class="fila-resumen"><span>Subtotal</span><span>${clp(subtotalBruto)}</span></div>
        ${descuentoProductos > 0 ? `<div class="fila-resumen"><span>Descuentos en productos</span><span>-${clp(descuentoProductos)}</span></div>` : ""}
        ${descuentoCarrito > 0 ? `<div class="fila-resumen"><span>Descuento en carrito</span><span>-${clp(descuentoCarrito)}</span></div>` : ""}
        ${hayDespacho ? `<div class="fila-resumen"><span>Despacho a domicilio</span><span>${costoDespacho > 0 ? "+" + clp(costoDespacho) : "Gratis"}</span></div>` : ""}
        <div class="fila-resumen fila-resumen--total"><span>Total</span><span>${clp(total)}</span></div>

        <div style="border-top:1px solid rgba(0,0,0,0.08);margin:12px 0 8px"></div>
        <div class="seccion-label">Detalle de pago</div>
        ${filasPago}
        ${vuelto != null ? `
        <div class="fila-resumen"><span>Monto recibido</span><span>${clp(lineaEfectivo.montoRecibido)}</span></div>
        <div class="fila-resumen" style="font-weight:700"><span>Vuelto</span><span style="color:var(--azul-primario)">${clp(vuelto)}</span></div>` : ""}
        ${cliente && lineasPago.some((l) => l.medio === "CREDITO") ? `
        <div class="banner-credito" style="margin-top:8px">
          <span class="banner-credito__label">Credito disponible restante</span>
          <span class="banner-credito__monto">${clp(cliente.credito)}</span>
        </div>` : ""}

        ${hayDespacho ? `
        <div style="border-top:1px solid rgba(0,0,0,0.08);margin:8px 0"></div>
        <span class="disp-stock">Incluye envio de productos</span>` : ""}
      </div>

      <div class="documento-footer">
        <div class="documento-footer__fila">
          <button class="btn-outline" id="btn-imprimir" style="flex:1">${carro.impreso ? "Reimprimir" : "Imprimir"}</button>
          <button class="btn-outline" id="btn-correo" style="flex:1">${carro.correoEnviado ? "Reenviar correo" : "Enviar correo"}</button>
        </div>
        <button class="btn-cobrar" id="btn-nueva-venta" style="width:100%">Nueva venta</button>
      </div>

      <div class="dialog-overlay" id="dialog-overlay">
        <div class="dialog-box" id="dialog-box"></div>
      </div>`;

    document.getElementById("btn-imprimir").addEventListener("click", () => {
      carro.impreso = true;
      guardarEstado();
      renderDocumento();
      mostrarToastDocumento("Imprimiendo comprobante...");
    });
    document.getElementById("btn-correo").addEventListener("click", abrirDialogoCorreo);
    document.getElementById("btn-nueva-venta").addEventListener("click", () => {
      reiniciarCarroDemo(carro, cliente);
      window.location.href = "index.html";
    });
  }

  function abrirDialogoCorreo() {
    const dialogOverlay = document.getElementById("dialog-overlay");
    const dialogBox = document.getElementById("dialog-box");
    dialogBox.innerHTML = `
      <div class="dialog-box__titulo">Enviar por correo</div>
      <input class="dialog-box__input" id="input-correo-documento" type="email" placeholder="correo@ejemplo.cl" value="${esc(carro.correoDocumento || "")}" />
      <div class="dialog-box__acciones">
        <button class="btn-outline" id="co-cancelar">Cancelar</button>
        <button class="btn-cobrar" id="co-confirmar" style="width:auto;flex:1">Enviar</button>
      </div>`;
    dialogOverlay.classList.add("abierto");
    const cerrar = () => dialogOverlay.classList.remove("abierto");
    dialogOverlay.addEventListener("click", (e) => { if (e.target === dialogOverlay) cerrar(); }, { once: true });
    dialogBox.querySelector("#co-cancelar").addEventListener("click", cerrar);
    dialogBox.querySelector("#co-confirmar").addEventListener("click", () => {
      const correo = dialogBox.querySelector("#input-correo-documento").value.trim();
      if (!correo) {
        mostrarToastDocumento("Ingresa un correo valido");
        return;
      }
      carro.correoDocumento = correo;
      carro.correoEnviado = true;
      guardarEstado();
      cerrar();
      renderDocumento();
      mostrarToastDocumento(`Enviado a ${correo}`);
    });
  }

  function mostrarToastDocumento(mensaje) {
    let toast = screen.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      screen.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.classList.add("visible");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("visible"), 2200);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initListaCarros();
  initCarritoDetalle();
  initCobro();
  initDocumento();
});
