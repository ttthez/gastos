// ---------- Datos ----------
const CATEGORIAS = [
  { id: 'super',    nombre: 'Súper',       emoji: '🛒' },
  { id: 'comer',    nombre: 'Salir a comer', emoji: '🍔' },
  { id: 'cafe',     nombre: 'Café',        emoji: '☕' },
  { id: 'transp',   nombre: 'Transporte',  emoji: '🚌' },
  { id: 'regalos',  nombre: 'Regalos',     emoji: '🎁' },
  { id: 'ocio',     nombre: 'Ocio',        emoji: '🎬' },
  { id: 'ropa',     nombre: 'Ropa',        emoji: '👕' },
  { id: 'salud',    nombre: 'Salud',       emoji: '💊' },
  { id: 'hogar',    nombre: 'Hogar',       emoji: '🏠' },
  { id: 'servicios',nombre: 'Servicios',   emoji: '💡' },
  { id: 'subs',     nombre: 'Suscripción', emoji: '📺' },
  { id: 'gym',      nombre: 'Gym',         emoji: '🏋️' },
  { id: 'viajes',   nombre: 'Viajes',      emoji: '✈️' },
  { id: 'mascotas', nombre: 'Mascotas',    emoji: '🐾' },
  { id: 'educ',     nombre: 'Educación',   emoji: '📚' },
  { id: 'otros',    nombre: 'Otros',       emoji: '•' },
];
// Con qué se pagó: sirve para saber cuánto fue en efectivo y cuánto viene en el resumen de la tarjeta
const MEDIOS = [
  { id: 'efectivo', nombre: 'Efectivo',     emoji: '💵' },
  { id: 'mp',       nombre: 'Mercado Pago', emoji: '📱' },
  { id: 'debito',   nombre: 'Débito',       emoji: '🏦' },
  { id: 'tarjeta',  nombre: 'Tarjeta',      emoji: '💳' },
];
const MEDIO = Object.fromEntries(MEDIOS.map(m => [m.id, m]));
// Dónde está la plata líquida. Lo pagado con tarjeta no sale de acá: suma a la deuda hasta que pagás la tarjeta.
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo',     emoji: '💵' },
  { id: 'mp',       nombre: 'Mercado Pago', emoji: '📱' },
  { id: 'banco',    nombre: 'Banco',        emoji: '🏦' },
];
const CUENTA = Object.fromEntries(CUENTAS.map(c => [c.id, c]));
const CUENTA_DE_MEDIO = { efectivo: 'efectivo', mp: 'mp', debito: 'banco' };
const KEY = 'gastos-app-v1';

let db = cargar();
let mesActual = hoyISO().slice(0, 7); // 'YYYY-MM'
let edit = null; // { tipo: 'gasto'|'fijo', id?: string }
let catSel = null;
let monedaSel = 'ARS'; // moneda del gasto que estás cargando
let catFiltro = null;  // categoría tocada en Inicio: muestra solo sus gastos
let medioSel = null;   // medio de pago del gasto que estás cargando
let medioFiltro = null; // medio tocado en Inicio: muestra solo lo pagado así

// Las categorías se pueden agregar o quitar desde Ajustes; si nunca las tocaste se usan las de fábrica.
// "Otros" siempre existe: ahí van los gastos de una categoría que se quita.
let CAT = {};
const cats = () => db.categorias?.length ? db.categorias : CATEGORIAS;
function refrescarCats() {
  CAT = Object.fromEntries(cats().map(c => [c.id, c]));
  CAT.otros ??= CATEGORIAS.find(c => c.id === 'otros');
}
refrescarCats();

function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.gastos)) return { moneda: '$', fijos: [], pagos: {}, ...d };
  } catch {}
  return { moneda: '$', gastos: [], fijos: [], pagos: {} };
}
function guardar() { localStorage.setItem(KEY, JSON.stringify(db)); }

// ---------- Utilidades ----------
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function hoyISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function fmt(n) {
  const dec = Number.isInteger(n) ? 0 : 2;
  const s = Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return (n < 0 ? '-' : '') + db.moneda + s;
}
function parseMonto(str) {
  let s = String(str).replace(/\s|\$/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
function mesLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return s.replace(' de ', ' ');
}
function sumarMes(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function diaLabel(iso) {
  if (iso === hoyISO()) return 'Hoy';
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  if (f.toDateString() === ayer.toDateString()) return 'Ayer';
  return f.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' });
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Fijos vigentes en un mes: creados en o antes del mes, y no dados de baja antes
const fijosDelMes = ym => db.fijos.filter(f => f.desde <= ym && (!f.hasta || f.hasta >= ym));

// Dólares: un gasto en US$ guarda usd y la cotización (tc) y su monto en pesos.
// Los fijos en US$ se pasan a pesos con la cotización de Ajustes, así siguen el dólar.
const montoFijo = f => f.moneda === 'USD' ? Math.round(f.usd * (Number(db.tc) || f.tc || 0)) : f.monto;
const fmtUsd = n => 'US$ ' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
// "💳 Tarjeta · nota" debajo de cada gasto (los cargados antes del medio no lo muestran)
const detalle = (x, texto) => [x.medio && MEDIO[x.medio] ? `${MEDIO[x.medio].emoji} ${MEDIO[x.medio].nombre}` : '', texto ? esc(texto) : '']
  .filter(Boolean).join(' · ');
const amtHtml = (x, pesos) => x.moneda === 'USD' ? `${fmtUsd(x.usd)}<small>${fmt(pesos)}</small>` : fmt(pesos);

// ---------- Render ----------
function render() {
  refrescarCats();
  $('#mesLabel').textContent = mesLabel(mesActual);
  $('#monedaSym').textContent = db.moneda;
  $('#monedaInput').value = db.moneda;
  $('#tcInput').value = db.tc || '';
  renderInicio();
  renderFijos();
  renderCategoriasAjustes();
  renderCaja();
}

function renderInicio() {
  const gastos = db.gastos.filter(g => g.fecha.startsWith(mesActual))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  const fijos = fijosDelMes(mesActual);
  const totVar = gastos.reduce((s, g) => s + g.monto, 0);
  const totFijo = fijos.reduce((s, f) => s + montoFijo(f), 0);
  // lo pagado en pesos y lo pagado en dólares, cada uno con su número
  const enUsd = gastos.concat(fijos).filter(x => x.moneda === 'USD');
  const totUsd = enUsd.reduce((s, x) => s + Number(x.usd), 0);
  const usdEnPesos = enUsd.reduce((s, x) => s + (x.desde ? montoFijo(x) : x.monto), 0);
  $('#totalUsd').hidden = !totUsd;
  $('#totalUsd').innerHTML = `En pesos <b>${fmt(totVar + totFijo - usdEnPesos)}</b> · En dólares <b>${fmtUsd(totUsd)}</b> (${fmt(usdEnPesos)})`;
  $('#total').textContent = fmt(totVar + totFijo);
  $('#totalVar').textContent = fmt(totVar);
  $('#totalFijo').textContent = fmt(totFijo);

  // por categoría (variables + fijos)
  const porCat = {};
  gastos.forEach(g => { porCat[g.cat] ??= { v: 0, f: 0 }; porCat[g.cat].v += g.monto; });
  fijos.forEach(f => { porCat[f.cat] ??= { v: 0, f: 0 }; porCat[f.cat].f += montoFijo(f); });
  const filas = Object.entries(porCat).map(([id, x]) => ({ id, ...x, t: x.v + x.f })).sort((a, b) => b.t - a.t);
  const max = filas[0]?.t || 1;
  $('#porCategoria').innerHTML = filas.map(r => {
    const c = CAT[r.id] || CAT.otros;
    return `<button class="cat-row ${r.id === catFiltro ? 'sel' : ''}" data-filtro="${r.id}">
      <div class="head"><span>${c.emoji} ${c.nombre}</span><b>${fmt(r.t)}</b></div>
      <div class="bar" style="display:flex">
        <i style="width:${r.v / max * 100}%"></i><i class="fijo" style="width:${r.f / max * 100}%"></i>
      </div></button>`;
  }).join('');

  // por medio de pago (los gastos sin medio, de antes, van en "Sin dato")
  const porMedio = {};
  gastos.concat(fijos).forEach(x => {
    const k = MEDIO[x.medio] ? x.medio : 'sin';
    porMedio[k] = (porMedio[k] || 0) + (x.desde ? montoFijo(x) : x.monto);
  });
  const filasMedio = Object.entries(porMedio).sort((a, b) => b[1] - a[1]);
  const maxMedio = filasMedio[0]?.[1] || 1;
  $('#medioTitulo').hidden = !filasMedio.length;
  $('#porMedio').innerHTML = filasMedio.map(([id, t]) => {
    const m = MEDIO[id] || { emoji: '•', nombre: 'Sin dato' };
    return `<button class="cat-row ${id === medioFiltro ? 'sel' : ''}" data-filtro-medio="${id}">
      <div class="head"><span>${m.emoji} ${m.nombre}</span><b>${fmt(t)}</b></div>
      <div class="bar"><i style="width:${t / maxMedio * 100}%"></i></div></button>`;
  }).join('');

  if (catFiltro || medioFiltro) return renderFiltro(gastos, fijos);
  $('#movTitulo').textContent = 'Movimientos';

  // movimientos agrupados por día
  if (!gastos.length) {
    $('#movimientos').innerHTML = `<div class="empty">Sin gastos este mes.<br>Tocá <b>+</b> para cargar uno.</div>`;
    return;
  }
  let html = '', dia = '';
  for (const g of gastos) {
    if (g.fecha !== dia) { dia = g.fecha; html += `<div class="day">${diaLabel(dia)}</div>`; }
    const c = CAT[g.cat] || CAT.otros;
    html += `<button class="mov" data-gasto="${g.id}">
      <div class="emoji">${c.emoji}</div>
      <div class="info"><b>${c.nombre}</b>${detalle(g, g.nota) ? `<small>${detalle(g, g.nota)}</small>` : ''}</div>
      <div class="amt">${amtHtml(g, g.monto)}</div></button>`;
  }
  $('#movimientos').innerHTML = html;
}

// gastos de una sola categoría (o de un solo medio de pago) en el mes, cada uno con su fecha
function renderFiltro(gastosMes, fijosMes) {
  const porCat = !!catFiltro;
  const titulo = porCat ? (CAT[catFiltro] || CAT.otros) : (MEDIO[medioFiltro] || { emoji: '•', nombre: 'Sin dato' });
  const elegido = porCat
    ? x => (CAT[x.cat] ? x.cat : 'otros') === catFiltro
    : x => (MEDIO[x.medio] ? x.medio : 'sin') === medioFiltro;
  const gastos = gastosMes.filter(elegido);
  const fijos = fijosMes.filter(elegido);
  const total = gastos.reduce((s, g) => s + g.monto, 0) + fijos.reduce((s, f) => s + montoFijo(f), 0);
  $('#movTitulo').innerHTML = `${titulo.emoji} ${esc(titulo.nombre)} · ${fmt(total)} <button class="link" id="quitarFiltro">✕ ver todos</button>`;
  const fecha = iso => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };
  const emoji = x => (CAT[x.cat] || CAT.otros).emoji;
  // filtrando por medio se muestra la categoría; filtrando por categoría, el medio
  const sub = (x, texto) => porCat ? detalle(x, texto) : [esc((CAT[x.cat] || CAT.otros).nombre), texto ? esc(texto) : ''].filter(Boolean).join(' · ');
  let html = gastos.map(g => `<button class="mov" data-gasto="${g.id}">
      <div class="emoji">${emoji(g)}</div>
      <div class="info"><b>${fecha(g.fecha)} · ${diaLabel(g.fecha)}</b>${sub(g, g.nota) ? `<small>${sub(g, g.nota)}</small>` : ''}</div>
      <div class="amt">${amtHtml(g, g.monto)}</div></button>`).join('');
  html += fijos.map(f => `<button class="mov" data-fijo-ir="${f.id}">
      <div class="emoji">${emoji(f)}</div>
      <div class="info"><b>${esc(f.nombre)}</b><small>${sub(f, `Fijo mensual${f.dia ? ` · día ${f.dia}` : ''}`)}</small></div>
      <div class="amt">${amtHtml(f, montoFijo(f))}</div></button>`).join('');
  $('#movimientos').innerHTML = html || `<div class="empty">Sin gastos ${porCat ? 'de' : 'con'} ${esc(titulo.nombre)} este mes.</div>`;
}

function renderFijos() {
  const fijos = fijosDelMes(mesActual).sort((a, b) => (a.dia || 99) - (b.dia || 99));
  const pagados = db.pagos[mesActual] || [];
  $('#fijosTotal').textContent = fmt(fijos.reduce((s, f) => s + montoFijo(f), 0));
  $('#fijosPagados').textContent = `${fijos.filter(f => pagados.includes(f.id)).length}/${fijos.length}`;
  $('#fijosList').innerHTML = fijos.length ? fijos.map(f => {
    const c = CAT[f.cat] || CAT.otros;
    const on = pagados.includes(f.id);
    return `<div class="mov">
      <button class="check ${on ? 'on' : ''}" data-pago="${f.id}" aria-label="Marcar pagado">${on ? '✓' : ''}</button>
      <button class="mov fijo-btn" data-fijo="${f.id}">
        <div class="emoji">${c.emoji}</div>
        <div class="info"><b>${esc(f.nombre)}</b><small>${detalle(f, `${c.nombre}${f.dia ? ` · día ${f.dia}` : ''}`)}</small></div>
        <div class="amt">${amtHtml(f, montoFijo(f))}</div>
      </button></div>`;
  }).join('') : `<div class="empty">Agregá tus gastos fijos:<br>gym, suscripciones, alquiler…</div>`;
}

// ---------- Hoja de carga ----------
function renderCats() {
  $('#catGrid').innerHTML = cats().map(c =>
    `<button type="button" class="cat ${c.id === catSel ? 'sel' : ''}" data-cat="${c.id}"><span>${c.emoji}</span>${c.nombre}</button>`
  ).join('');
}

function renderMedios() {
  $('#medioToggle').innerHTML = MEDIOS.map(m =>
    `<button type="button" class="${m.id === medioSel ? 'sel' : ''}" data-medio="${m.id}">${m.emoji} ${m.nombre}</button>`
  ).join('');
}
$('#medioToggle').addEventListener('click', e => {
  const b = e.target.closest('[data-medio]');
  if (!b) return;
  medioSel = b.dataset.medio;
  renderMedios();
});

function abrirSheet(tipo, item) {
  edit = { tipo, id: item?.id };
  const esFijo = tipo === 'fijo';
  $('#sheetTitle').textContent = item ? (esFijo ? 'Editar fijo' : 'Editar gasto') : (esFijo ? 'Nuevo gasto fijo' : 'Nuevo gasto');
  monedaSel = item?.moneda === 'USD' ? 'USD' : 'ARS';
  const valor = item ? (monedaSel === 'USD' ? item.usd : item.monto) : '';
  $('#monto').value = item ? formatearMonto(String(valor).replace('.', ',')) : '';
  $('#tcGasto').value = item?.tc || db.tc || '';
  $('#nota').value = item?.nota || '';
  $('#nombre').value = item?.nombre || '';
  $('#nombreWrap').hidden = !esFijo;
  $('#nota').hidden = esFijo;
  $('#fecha').hidden = esFijo;
  $('#dia').hidden = !esFijo;
  $('#dia').value = item?.dia || '';
  // fecha por defecto: hoy si estás viendo el mes actual, si no el día 1 del mes que estás viendo
  $('#fecha').value = item?.fecha || (hoyISO().startsWith(mesActual) ? hoyISO() : mesActual + '-01');
  $('#deleteBtn').hidden = !item;
  catSel = item?.cat || (esFijo ? 'subs' : null);
  renderCats();
  // un gasto nuevo arranca con el último medio que usaste
  medioSel = item ? (MEDIO[item.medio] ? item.medio : null) : (MEDIO[db.medioUlt] ? db.medioUlt : null);
  renderMedios();
  aplicarMoneda();
  document.body.classList.add('open');
  ajustarMonto();
  setTimeout(() => (esFijo && !item ? $('#nombre') : $('#monto')).focus(), 250);
}
function aplicarMoneda() {
  const usd = monedaSel === 'USD';
  $('#monedaToggle').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.moneda === monedaSel));
  $('#monedaSym').textContent = usd ? 'US$' : db.moneda;
  // los fijos usan la cotización de Ajustes; los gastos piden la del día
  $('#tcWrap').hidden = !usd || edit?.tipo !== 'gasto';
  ajustarMonto();
}
$('#monedaToggle').addEventListener('click', e => {
  const b = e.target.closest('[data-moneda]');
  if (!b) return;
  monedaSel = b.dataset.moneda;
  aplicarMoneda();
});

function cerrarSheet() {
  document.body.classList.remove('open');
  document.activeElement?.blur();
  edit = null;
}

// Mientras escribís: pone los puntos de miles (12500 → 12.500) y ajusta el ancho
// del input al texto real, achicando la letra si no entra en pantalla.
function formatearMonto(v) {
  let [ent, dec] = v.replace(/[^\d,]/g, '').split(',', 2);
  ent = ent.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec === undefined ? ent : `${ent || '0'},${dec.slice(0, 2)}`;
}
const medidor = document.createElement('canvas').getContext('2d');
function ajustarMonto() {
  const input = $('#monto');
  const texto = input.value || input.placeholder;
  const disponible = $('#sheet').clientWidth - 90; // menos el símbolo y márgenes
  let size = 48;
  const cs = getComputedStyle(input);
  do {
    medidor.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    var ancho = medidor.measureText(texto).width;
  } while (ancho > disponible && (size -= 2) > 20);
  input.style.fontSize = size + 'px';
  input.style.width = Math.ceil(ancho) + 8 + 'px';
}
$('#monto').addEventListener('input', e => {
  const v = e.target.value.replace(/\./g, '');
  e.target.value = formatearMonto(e.data === '.' ? v + ',' : v);
  ajustarMonto();
});

$('#catGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  catSel = b.dataset.cat;
  renderCats();
});

$('#sheet').addEventListener('submit', e => {
  e.preventDefault();
  const valor = parseMonto($('#monto').value);
  if (!valor) return toast('Ingresá un monto');
  if (!catSel) return toast('Elegí una categoría');
  if (!medioSel) return toast('Elegí cómo lo pagaste');
  db.medioUlt = medioSel;

  // en pesos se borran los datos de dólares por si el gasto antes estaba en US$
  let plata = { monto: valor, moneda: undefined, usd: undefined, tc: undefined };
  if (monedaSel === 'USD') {
    const tc = edit.tipo === 'gasto' ? parseMonto($('#tcGasto').value) : Number(db.tc);
    if (!tc) return toast(edit.tipo === 'gasto' ? 'Poné la cotización del dólar' : 'Poné la cotización del dólar en Ajustes');
    if (edit.tipo === 'gasto') db.tc = tc;
    plata = { monto: Math.round(valor * tc), moneda: 'USD', usd: valor, tc };
  }

  if (edit.tipo === 'gasto') {
    const data = { ...plata, cat: catSel, medio: medioSel, nota: $('#nota').value.trim(), fecha: $('#fecha').value || hoyISO() };
    if (edit.id) Object.assign(db.gastos.find(g => g.id === edit.id), data);
    else db.gastos.push({ id: uid(), creado: Date.now(), ...data });
    mesActual = data.fecha.slice(0, 7);
  } else {
    const nombre = $('#nombre').value.trim() || CAT[catSel].nombre;
    const dia = parseInt($('#dia').value) || null;
    const data = { ...plata, cat: catSel, medio: medioSel, nombre, dia };
    if (edit.id) Object.assign(db.fijos.find(f => f.id === edit.id), data);
    else db.fijos.push({ id: uid(), desde: mesActual, ...data });
  }
  guardar();
  cerrarSheet();
  render();
  toast('Guardado ✓');
});

$('#deleteBtn').addEventListener('click', () => {
  if (!edit?.id) return;
  if (edit.tipo === 'gasto') {
    db.gastos = db.gastos.filter(g => g.id !== edit.id);
  } else {
    if (!confirm('¿Dar de baja este gasto fijo desde este mes? Los meses anteriores no cambian.')) return;
    const f = db.fijos.find(f => f.id === edit.id);
    const hasta = sumarMes(mesActual, -1);
    if (f.desde > hasta) db.fijos = db.fijos.filter(x => x.id !== f.id);
    else f.hasta = hasta;
  }
  guardar(); cerrarSheet(); render(); toast('Eliminado');
});

// ---------- Eventos ----------
$('#fab').addEventListener('click', () => abrirSheet($('#view-fijos').classList.contains('active') ? 'fijo' : 'gasto'));
$('#addFijoBtn').addEventListener('click', () => abrirSheet('fijo'));
$('#sheetBg').addEventListener('click', () => { cerrarSheet(); cerrarCaja(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { cerrarSheet(); cerrarCaja(); } });

$('#prevMes').addEventListener('click', () => { mesActual = sumarMes(mesActual, -1); render(); });
$('#nextMes').addEventListener('click', () => { mesActual = sumarMes(mesActual, 1); render(); });

$('#movimientos').addEventListener('click', e => {
  const b = e.target.closest('[data-gasto]');
  if (b) return abrirSheet('gasto', db.gastos.find(g => g.id === b.dataset.gasto));
  const f = e.target.closest('[data-fijo-ir]');
  if (f) abrirSheet('fijo', db.fijos.find(x => x.id === f.dataset.fijoIr));
});
// tocar una categoría filtra los movimientos; tocarla de nuevo (o "ver todos") los muestra todos
$('#porCategoria').addEventListener('click', e => {
  const r = e.target.closest('[data-filtro]');
  if (!r) return;
  catFiltro = catFiltro === r.dataset.filtro ? null : r.dataset.filtro;
  medioFiltro = null;
  renderInicio();
  if (catFiltro) $('#movTitulo').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#porMedio').addEventListener('click', e => {
  const r = e.target.closest('[data-filtro-medio]');
  if (!r) return;
  medioFiltro = medioFiltro === r.dataset.filtroMedio ? null : r.dataset.filtroMedio;
  catFiltro = null;
  renderInicio();
  if (medioFiltro) $('#movTitulo').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#movTitulo').addEventListener('click', e => {
  if (!e.target.closest('#quitarFiltro')) return;
  catFiltro = null;
  medioFiltro = null;
  renderInicio();
});

// ---------- Categorías (Ajustes) ----------
function renderCategoriasAjustes() {
  const usos = id => db.gastos.filter(g => g.cat === id).length + db.fijos.filter(f => f.cat === id).length;
  $('#catsList').innerHTML = cats().map(c => {
    const n = usos(c.id);
    return `<div class="mov">
      <div class="emoji">${c.emoji}</div>
      <div class="info"><b>${esc(c.nombre)}</b><small>${n ? `${n} gasto${n === 1 ? '' : 's'}` : 'Sin gastos'}</small></div>
      ${c.id === 'otros' ? '' : `<button class="link danger-link" data-quitar-cat="${c.id}">Quitar</button>`}
    </div>`;
  }).join('');
}
$('#catsList').addEventListener('click', e => {
  const b = e.target.closest('[data-quitar-cat]');
  if (!b) return;
  const id = b.dataset.quitarCat;
  const c = CAT[id];
  const n = db.gastos.filter(g => g.cat === id).length + db.fijos.filter(f => f.cat === id).length;
  if (!confirm(`¿Quitar la categoría "${c.nombre}"?` + (n ? `\n\nSus ${n} gastos pasan a "Otros".` : ''))) return;
  db.gastos.forEach(g => { if (g.cat === id) g.cat = 'otros'; });
  db.fijos.forEach(f => { if (f.cat === id) f.cat = 'otros'; });
  db.categorias = cats().filter(x => x.id !== id);
  if (catFiltro === id) catFiltro = null;
  guardar(); render(); toast('Categoría quitada');
});
$('#catForm').addEventListener('submit', e => {
  e.preventDefault();
  const nombre = $('#catNombre').value.trim();
  if (!nombre) return toast('Poné el nombre de la categoría');
  if (cats().some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) return toast('Esa categoría ya existe');
  const nueva = { id: 'c' + uid(), nombre, emoji: $('#catEmoji').value.trim() || '🏷️' };
  // las nuevas van antes de "Otros", que queda siempre al final
  const lista = cats().filter(c => c.id !== 'otros');
  db.categorias = [...lista, nueva, CAT.otros];
  $('#catNombre').value = ''; $('#catEmoji').value = '';
  guardar(); render(); toast('Categoría agregada ✓');
});
$('#fijosList').addEventListener('click', e => {
  const p = e.target.closest('[data-pago]');
  if (p) {
    const lista = db.pagos[mesActual] ||= [];
    const i = lista.indexOf(p.dataset.pago);
    i >= 0 ? lista.splice(i, 1) : lista.push(p.dataset.pago);
    // cuándo lo marcaste pagado: desde ahí cuenta para la caja
    const clave = `${mesActual}|${p.dataset.pago}`;
    db.pagosTs ||= {};
    if (i >= 0) delete db.pagosTs[clave]; else db.pagosTs[clave] = Date.now();
    guardar(); renderFijos(); renderCaja();
    return;
  }
  const f = e.target.closest('[data-fijo]');
  if (f) abrirSheet('fijo', db.fijos.find(x => x.id === f.dataset.fijo));
});

document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + b.dataset.view));
  $('#fab').hidden = b.dataset.view === 'ajustes';
  window.scrollTo(0, 0);
}));

// ---------- Caja ----------
// Se parte de un conteo (cuánto había en cada cuenta y cuánto se debía de tarjeta) y se le suma
// todo lo que pasó después: gastos, fijos marcados pagados, plata que entró, pases entre cuentas y pagos de tarjeta.
const tsDe = g => g.creado || parseInt(String(g.id).slice(0, -4), 36) || 0;
const despuesDelConteo = (fecha, ts) => {
  const c = db.conteo;
  return fecha > c.fecha || (fecha === c.fecha && ts > c.ts);
};
// los movimientos de la caja: cada uno con cuánto mueve en cada cuenta (+ entra, − sale) y en la deuda de tarjeta
function movimientosCaja() {
  const lista = [];
  const deGasto = (x, monto, fecha, ts, titulo, sub, ref) => {
    const cuenta = CUENTA_DE_MEDIO[x.medio];
    if (x.medio === 'tarjeta') lista.push({ fecha, ts, titulo, sub, monto, deuda: monto, ref });
    else if (cuenta) lista.push({ fecha, ts, titulo, sub, monto: -monto, cuenta, ref });
    else lista.push({ fecha, ts, titulo, sub, monto: -monto, sinMedio: true, ref });
  };
  db.gastos.forEach(g => {
    if (!despuesDelConteo(g.fecha, tsDe(g))) return;
    const c = CAT[g.cat] || CAT.otros;
    deGasto(g, g.monto, g.fecha, tsDe(g), `${c.emoji} ${c.nombre}`, g.nota, { gasto: g.id });
  });
  Object.entries(db.pagosTs || {}).forEach(([clave, ts]) => {
    if (ts <= db.conteo.ts) return;
    const [ym, id] = clave.split('|');
    const f = db.fijos.find(x => x.id === id);
    if (!f || !(db.pagos[ym] || []).includes(id)) return;
    const c = CAT[f.cat] || CAT.otros;
    deGasto(f, montoFijo(f), hoyDe(ts), ts, `${c.emoji} ${f.nombre}`, `Fijo de ${mesLabel(ym)}`, { fijo: id });
  });
  (db.caja || []).forEach(m => {
    if (m.ts <= db.conteo.ts) return;
    const base = { fecha: m.fecha, ts: m.ts, sub: m.nota, ref: { caja: m.id } };
    if (m.tipo === 'ingreso') lista.push({ ...base, titulo: `${CUENTA[m.a].emoji} Entró a ${CUENTA[m.a].nombre}`, monto: m.monto, cuenta: m.a, entra: true });
    if (m.tipo === 'mover') lista.push({ ...base, titulo: `↔︎ ${CUENTA[m.de].nombre} → ${CUENTA[m.a].nombre}`, monto: m.monto, de: m.de, a: m.a, pase: true });
    if (m.tipo === 'pago') lista.push({ ...base, titulo: `💳 Pago de tarjeta`, monto: -m.monto, cuenta: m.de, deuda: -m.monto });
  });
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.ts - a.ts);
}
const hoyDe = ts => new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
function estadoCaja() {
  const saldos = { ...db.conteo.saldos };
  let deuda = Number(db.conteo.tarjeta) || 0, sinMedio = 0;
  const movs = movimientosCaja();
  movs.forEach(m => {
    if (m.sinMedio) { sinMedio++; return; }
    if (m.pase) { saldos[m.de] -= m.monto; saldos[m.a] += m.monto; return; }
    if (m.cuenta) saldos[m.cuenta] += m.monto;
    if (m.deuda) deuda += m.deuda;
  });
  const liquido = CUENTAS.reduce((t, c) => t + (saldos[c.id] || 0), 0);
  return { saldos, deuda, liquido, movs, sinMedio };
}

function renderCaja() {
  const hay = !!db.conteo;
  $('#cajaVacia').hidden = hay;
  $('#cajaLlena').hidden = !hay;
  if (!hay) return;
  const e = estadoCaja();
  $('#liquido').textContent = fmt(e.liquido);
  $('#liquidoCuentas').innerHTML = CUENTAS.map(c => `<span>${c.emoji} ${c.nombre} <b>${fmt(e.saldos[c.id] || 0)}</b></span>`).join('');
  $('#deuda').textContent = fmt(e.deuda);
  $('#libre').textContent = fmt(e.liquido - e.deuda);
  const [, m, d] = db.conteo.fecha.split('-');
  $('#cajaDesde').textContent = `· desde que contaste, el ${d}/${m}`;
  $('#cajaMovs').innerHTML = e.movs.length ? e.movs.map(x => {
    const donde = x.pase ? '' : x.deuda > 0 ? '💳 a la tarjeta' : x.sinMedio ? 'sin medio: no se descontó' : x.cuenta ? `${CUENTA[x.cuenta].emoji} ${CUENTA[x.cuenta].nombre}` : '';
    const sub = [donde, x.sub ? esc(x.sub) : ''].filter(Boolean).join(' · ');
    const attrs = x.ref.gasto ? `data-gasto="${x.ref.gasto}"` : x.ref.caja ? `data-caja-mov="${x.ref.caja}"` : `data-fijo-caja="${x.ref.fijo}"`;
    const signo = x.pase ? '' : x.monto > 0 && !x.deuda ? '+' : '−';
    return `<button class="mov" ${attrs}>
      <div class="info"><b>${x.titulo}</b>${sub ? `<small>${sub}</small>` : ''}</div>
      <div class="amt ${x.entra ? 'mas' : ''}">${signo}${fmt(Math.abs(x.monto))}<small>${diaLabel(x.fecha)}</small></div></button>`;
  }).join('') : `<div class="empty">Todavía no hubo movimientos desde que contaste.</div>`;
  $('#cajaNota').textContent = e.sinMedio
    ? `${e.sinMedio} ${e.sinMedio === 1 ? 'gasto no tiene' : 'gastos no tienen'} medio de pago y no se ${e.sinMedio === 1 ? 'descontó' : 'descontaron'}: tocalo y elegí cómo lo pagaste.`
    : 'Lo que pagás con tarjeta no baja la plata líquida: se suma a "Tarjeta a pagar" hasta que la pagás.';
}

// hoja para cargar: plata que entró, pase entre cuentas, pago de tarjeta o un conteo nuevo
let cajaModo = null, cajaEdit = null;
const chipsCuenta = (nombre, sel) => `<div class="moneda-toggle" data-chips="${nombre}">${CUENTAS.map(c =>
  `<button type="button" class="${c.id === sel ? 'sel' : ''}" data-val="${c.id}">${c.emoji} ${c.nombre}</button>`).join('')}</div>`;
const campoPlata = (id, label, valor, ayuda) => `<label class="campo-caja"><span>${label}</span>
  <input id="${id}" class="input" inputmode="decimal" placeholder="Ej: 150.000" value="${valor ? formatearMonto(String(valor).replace('.', ',')) : ''}">
  ${ayuda ? `<small class="ayuda">${ayuda}</small>` : ''}</label>`;
function abrirCaja(modo, mov) {
  cajaModo = modo; cajaEdit = mov || null;
  const e = db.conteo ? estadoCaja() : null;
  const nota = `<label class="campo-caja"><span>Nota <small>· opcional</small></span><input id="cajaNotaInput" class="input" placeholder="Ej: sueldo de octubre" value="${esc(mov?.nota || '')}"></label>`;
  const titulos = { ingreso: 'Me entró plata', mover: 'Pasar entre cuentas', pago: 'Pagar tarjeta', conteo: 'Contar mi plata' };
  $('#cajaTitulo').textContent = titulos[modo];
  let html = '';
  if (modo === 'ingreso') html = campoPlata('cajaMonto', 'Cuánto', mov?.monto) +
    `<div class="campo-caja"><span>Dónde entró</span>${chipsCuenta('a', mov?.a || 'mp')}</div>` + nota;
  if (modo === 'mover') html = campoPlata('cajaMonto', 'Cuánto', mov?.monto, 'Ej: sacaste del cajero = de Banco a Efectivo') +
    `<div class="campo-caja"><span>De</span>${chipsCuenta('de', mov?.de || 'banco')}</div>
     <div class="campo-caja"><span>A</span>${chipsCuenta('a', mov?.a || 'efectivo')}</div>` + nota;
  if (modo === 'pago') html = campoPlata('cajaMonto', 'Cuánto pagaste', mov?.monto ?? (e && e.deuda > 0 ? e.deuda : ''),
      e ? `Debés ${fmt(e.deuda)} de tarjeta` : '') +
    `<div class="campo-caja"><span>Con qué la pagaste</span>${chipsCuenta('de', mov?.de || 'banco')}</div>` + nota;
  if (modo === 'conteo') html = `<p class="muted small">Poné lo que hay hoy de verdad. Desde ahora la caja arranca de estos números.</p>` +
    CUENTAS.map(c => campoPlata('conteo-' + c.id, `${c.emoji} ${c.nombre}`, e ? Math.max(0, e.saldos[c.id]) : '')).join('') +
    campoPlata('conteo-tarjeta', '💳 Tarjeta a pagar', e ? Math.max(0, e.deuda) : '', 'Lo que vas a pagar en el próximo resumen (0 si no debés nada)');
  $('#cajaCampos').innerHTML = html;
  $('#cajaBorrar').hidden = !mov;
  document.body.classList.add('open-caja');
}
function cerrarCaja() {
  document.body.classList.remove('open-caja');
  document.activeElement?.blur();
  cajaModo = null; cajaEdit = null;
}
const chipElegido = nombre => $(`#cajaCampos [data-chips="${nombre}"] .sel`)?.dataset.val;
$('#cajaCampos').addEventListener('click', e => {
  const b = e.target.closest('[data-chips] button');
  if (!b) return;
  b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b));
});
$('#cajaCampos').addEventListener('input', e => {
  if (e.target.matches('input[inputmode="decimal"]')) e.target.value = formatearMonto(e.target.value.replace(/\./g, ''));
});
$('#sheetCaja').addEventListener('submit', e => {
  e.preventDefault();
  if (cajaModo === 'conteo') {
    const saldos = {};
    for (const c of CUENTAS) saldos[c.id] = parseMonto($('#conteo-' + c.id).value) || 0;
    const ahora = Date.now();
    db.conteo = { ts: ahora, fecha: hoyISO(), saldos, tarjeta: parseMonto($('#conteo-tarjeta').value) || 0 };
    guardar(); cerrarCaja(); render(); toast('Caja contada ✓');
    return;
  }
  const monto = parseMonto($('#cajaMonto').value);
  if (!monto) return toast('Poné cuánto');
  const mov = { tipo: cajaModo, monto, nota: $('#cajaNotaInput').value.trim() };
  if (cajaModo === 'ingreso') mov.a = chipElegido('a');
  if (cajaModo === 'mover') { mov.de = chipElegido('de'); mov.a = chipElegido('a'); if (mov.de === mov.a) return toast('Elegí dos cuentas distintas'); }
  if (cajaModo === 'pago') mov.de = chipElegido('de');
  db.caja ||= [];
  if (cajaEdit) Object.assign(cajaEdit, mov);
  else db.caja.push({ id: uid(), ts: Date.now(), fecha: hoyISO(), ...mov });
  guardar(); cerrarCaja(); render();
  toast({ ingreso: 'Ingreso anotado ✓', mover: 'Pase anotado ✓', pago: 'Pago de tarjeta anotado ✓' }[mov.tipo]);
});
$('#cajaBorrar').addEventListener('click', () => {
  if (!cajaEdit) return;
  db.caja = db.caja.filter(m => m !== cajaEdit);
  guardar(); cerrarCaja(); render(); toast('Eliminado');
});
document.querySelectorAll('[data-caja]').forEach(b => b.addEventListener('click', () => abrirCaja(b.dataset.caja)));
$('#cajaMovs').addEventListener('click', e => {
  const g = e.target.closest('[data-gasto]');
  if (g) return abrirSheet('gasto', db.gastos.find(x => x.id === g.dataset.gasto));
  const m = e.target.closest('[data-caja-mov]');
  if (m) { const mov = db.caja.find(x => x.id === m.dataset.cajaMov); if (mov) abrirCaja(mov.tipo, mov); return; }
  const f = e.target.closest('[data-fijo-caja]');
  if (f) abrirSheet('fijo', db.fijos.find(x => x.id === f.dataset.fijoCaja));
});

// ---------- Ajustes ----------
function descargar(nombre, contenido, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#exportBtn').addEventListener('click', () =>
  descargar(`gastos-${hoyISO()}.json`, JSON.stringify(db, null, 2), 'application/json'));

$('#importInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.gastos)) throw 0;
    if (!confirm('Esto reemplaza tus datos actuales. ¿Continuar?')) return;
    db = { moneda: '$', fijos: [], pagos: {}, ...d };
    guardar(); render(); toast('Copia importada ✓');
  } catch { toast('Archivo inválido'); }
  e.target.value = '';
});

// suma los gastos de un archivo (copia completa o lista de gastos) sin borrar los actuales
$('#sumarInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    const lista = Array.isArray(d) ? d : d.gastos;
    if (!Array.isArray(lista)) throw 0;
    const clave = g => `${g.fecha}|${g.monto}|${g.nota || ''}`;
    const ids = new Set(db.gastos.map(g => g.id));
    const claves = new Set(db.gastos.map(clave));
    let sumados = 0, repetidos = 0;
    for (const g of lista) {
      const monto = Number(g.monto);
      if (!(monto > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(g.fecha || '')) continue;
      const nuevo = { id: g.id || uid(), monto, cat: CAT[g.cat] ? g.cat : 'otros', nota: String(g.nota || ''), fecha: g.fecha };
      if (g.moneda === 'USD' && Number(g.usd) > 0) Object.assign(nuevo, { moneda: 'USD', usd: Number(g.usd), tc: Number(g.tc) || undefined });
      if (MEDIO[g.medio]) nuevo.medio = g.medio;
      if (ids.has(nuevo.id) || claves.has(clave(nuevo))) { repetidos++; continue; }
      db.gastos.push(nuevo); ids.add(nuevo.id); claves.add(clave(nuevo)); sumados++;
    }
    guardar(); render();
    toast(`${sumados} gastos sumados` + (repetidos ? ` · ${repetidos} ya estaban` : ''));
  } catch { toast('Archivo inválido'); }
  e.target.value = '';
});

$('#csvBtn').addEventListener('click', () => {
  const filas = [['Fecha', 'Tipo', 'Categoría', 'Medio', 'Detalle', 'Monto', 'US$']];
  const medio = x => MEDIO[x.medio]?.nombre || '';
  db.gastos.filter(g => g.fecha.startsWith(mesActual)).sort((a, b) => a.fecha.localeCompare(b.fecha))
    .forEach(g => filas.push([g.fecha, 'Variable', CAT[g.cat]?.nombre || g.cat, medio(g), g.nota || '', g.monto, g.moneda === 'USD' ? g.usd : '']));
  fijosDelMes(mesActual).forEach(f => filas.push([mesActual, 'Fijo', CAT[f.cat]?.nombre || f.cat, medio(f), f.nombre, montoFijo(f), f.moneda === 'USD' ? f.usd : '']));
  const csv = filas.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  descargar(`gastos-${mesActual}.csv`, '﻿' + csv, 'text/csv');
});

$('#tcInput').addEventListener('change', e => {
  db.tc = parseMonto(e.target.value) || undefined;
  guardar(); render();
});

$('#monedaInput').addEventListener('change', e => {
  db.moneda = e.target.value.trim() || '$';
  guardar(); render();
});

$('#resetBtn').addEventListener('click', () => {
  if (!confirm('¿Borrar TODOS tus gastos? No se puede deshacer.')) return;
  db = { moneda: db.moneda, tc: db.tc, categorias: db.categorias, medioUlt: db.medioUlt, gastos: [], fijos: [], pagos: {}, caja: [] };
  guardar(); render(); toast('Datos borrados');
});

// ---------- Inicio ----------
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
