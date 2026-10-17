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
const CAT = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]));
const KEY = 'gastos-app-v1';

let db = cargar();
let mesActual = hoyISO().slice(0, 7); // 'YYYY-MM'
let edit = null; // { tipo: 'gasto'|'fijo', id?: string }
let catSel = null;

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

// ---------- Render ----------
function render() {
  $('#mesLabel').textContent = mesLabel(mesActual);
  $('#monedaSym').textContent = db.moneda;
  $('#monedaInput').value = db.moneda;
  renderInicio();
  renderFijos();
}

function renderInicio() {
  const gastos = db.gastos.filter(g => g.fecha.startsWith(mesActual))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  const fijos = fijosDelMes(mesActual);
  const totVar = gastos.reduce((s, g) => s + g.monto, 0);
  const totFijo = fijos.reduce((s, f) => s + f.monto, 0);
  $('#total').textContent = fmt(totVar + totFijo);
  $('#totalVar').textContent = fmt(totVar);
  $('#totalFijo').textContent = fmt(totFijo);

  // por categoría (variables + fijos)
  const porCat = {};
  gastos.forEach(g => { porCat[g.cat] ??= { v: 0, f: 0 }; porCat[g.cat].v += g.monto; });
  fijos.forEach(f => { porCat[f.cat] ??= { v: 0, f: 0 }; porCat[f.cat].f += f.monto; });
  const filas = Object.entries(porCat).map(([id, x]) => ({ id, ...x, t: x.v + x.f })).sort((a, b) => b.t - a.t);
  const max = filas[0]?.t || 1;
  $('#porCategoria').innerHTML = filas.map(r => {
    const c = CAT[r.id] || CAT.otros;
    return `<div class="cat-row">
      <div class="head"><span>${c.emoji} ${c.nombre}</span><b>${fmt(r.t)}</b></div>
      <div class="bar" style="display:flex">
        <i style="width:${r.v / max * 100}%"></i><i class="fijo" style="width:${r.f / max * 100}%"></i>
      </div></div>`;
  }).join('');

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
      <div class="info"><b>${c.nombre}</b>${g.nota ? `<small>${esc(g.nota)}</small>` : ''}</div>
      <div class="amt">${fmt(g.monto)}</div></button>`;
  }
  $('#movimientos').innerHTML = html;
}

function renderFijos() {
  const fijos = fijosDelMes(mesActual).sort((a, b) => (a.dia || 99) - (b.dia || 99));
  const pagados = db.pagos[mesActual] || [];
  $('#fijosTotal').textContent = fmt(fijos.reduce((s, f) => s + f.monto, 0));
  $('#fijosPagados').textContent = `${fijos.filter(f => pagados.includes(f.id)).length}/${fijos.length}`;
  $('#fijosList').innerHTML = fijos.length ? fijos.map(f => {
    const c = CAT[f.cat] || CAT.otros;
    const on = pagados.includes(f.id);
    return `<div class="mov">
      <button class="check ${on ? 'on' : ''}" data-pago="${f.id}" aria-label="Marcar pagado">${on ? '✓' : ''}</button>
      <button class="mov fijo-btn" data-fijo="${f.id}">
        <div class="emoji">${c.emoji}</div>
        <div class="info"><b>${esc(f.nombre)}</b><small>${c.nombre}${f.dia ? ` · día ${f.dia}` : ''}</small></div>
        <div class="amt">${fmt(f.monto)}</div>
      </button></div>`;
  }).join('') : `<div class="empty">Agregá tus gastos fijos:<br>gym, suscripciones, alquiler…</div>`;
}

// ---------- Hoja de carga ----------
function renderCats() {
  $('#catGrid').innerHTML = CATEGORIAS.map(c =>
    `<button type="button" class="cat ${c.id === catSel ? 'sel' : ''}" data-cat="${c.id}"><span>${c.emoji}</span>${c.nombre}</button>`
  ).join('');
}

function abrirSheet(tipo, item) {
  edit = { tipo, id: item?.id };
  const esFijo = tipo === 'fijo';
  $('#sheetTitle').textContent = item ? (esFijo ? 'Editar fijo' : 'Editar gasto') : (esFijo ? 'Nuevo gasto fijo' : 'Nuevo gasto');
  $('#monto').value = item ? formatearMonto(String(item.monto).replace('.', ',')) : '';
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
  document.body.classList.add('open');
  ajustarMonto();
  setTimeout(() => (esFijo && !item ? $('#nombre') : $('#monto')).focus(), 250);
}
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
  const monto = parseMonto($('#monto').value);
  if (!monto) return toast('Ingresá un monto');
  if (!catSel) return toast('Elegí una categoría');

  if (edit.tipo === 'gasto') {
    const data = { monto, cat: catSel, nota: $('#nota').value.trim(), fecha: $('#fecha').value || hoyISO() };
    if (edit.id) Object.assign(db.gastos.find(g => g.id === edit.id), data);
    else db.gastos.push({ id: uid(), ...data });
    mesActual = data.fecha.slice(0, 7);
  } else {
    const nombre = $('#nombre').value.trim() || CAT[catSel].nombre;
    const dia = parseInt($('#dia').value) || null;
    const data = { monto, cat: catSel, nombre, dia };
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
$('#sheetBg').addEventListener('click', cerrarSheet);
document.addEventListener('keydown', e => e.key === 'Escape' && cerrarSheet());

$('#prevMes').addEventListener('click', () => { mesActual = sumarMes(mesActual, -1); render(); });
$('#nextMes').addEventListener('click', () => { mesActual = sumarMes(mesActual, 1); render(); });

$('#movimientos').addEventListener('click', e => {
  const b = e.target.closest('[data-gasto]');
  if (b) abrirSheet('gasto', db.gastos.find(g => g.id === b.dataset.gasto));
});
$('#fijosList').addEventListener('click', e => {
  const p = e.target.closest('[data-pago]');
  if (p) {
    const lista = db.pagos[mesActual] ||= [];
    const i = lista.indexOf(p.dataset.pago);
    i >= 0 ? lista.splice(i, 1) : lista.push(p.dataset.pago);
    guardar(); renderFijos();
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

$('#csvBtn').addEventListener('click', () => {
  const filas = [['Fecha', 'Tipo', 'Categoría', 'Detalle', 'Monto']];
  db.gastos.filter(g => g.fecha.startsWith(mesActual)).sort((a, b) => a.fecha.localeCompare(b.fecha))
    .forEach(g => filas.push([g.fecha, 'Variable', CAT[g.cat]?.nombre || g.cat, g.nota || '', g.monto]));
  fijosDelMes(mesActual).forEach(f => filas.push([mesActual, 'Fijo', CAT[f.cat]?.nombre || f.cat, f.nombre, f.monto]));
  const csv = filas.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  descargar(`gastos-${mesActual}.csv`, '﻿' + csv, 'text/csv');
});

$('#monedaInput').addEventListener('change', e => {
  db.moneda = e.target.value.trim() || '$';
  guardar(); render();
});

$('#resetBtn').addEventListener('click', () => {
  if (!confirm('¿Borrar TODOS tus gastos? No se puede deshacer.')) return;
  db = { moneda: db.moneda, gastos: [], fijos: [], pagos: {} };
  guardar(); render(); toast('Datos borrados');
});

// ---------- Inicio ----------
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
