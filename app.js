import { store } from "./storage.js";

const fileInput = document.getElementById("fileInput");
const searchInput = document.getElementById("searchInput");
const invoicesList = document.getElementById("invoicesList");
const clearAll = document.getElementById("clearAll");
const modal = document.getElementById("modal");
const modalText = document.getElementById("modalText");
const modalCancel = document.getElementById("modalCancel");
const modalConfirm = document.getElementById("modalConfirm");

const detail = document.getElementById("detail");
const emptyState = document.getElementById("emptyState");

const ids = {
  emisorNombre: document.getElementById("emisorNombre"),
  emisorNit: document.getElementById("emisorNit"),
  emisorDireccion: document.getElementById("emisorDireccion"),
  emisorContacto: document.getElementById("emisorContacto"),
  emisorCorreo: document.getElementById("emisorCorreo"),
  receptorNombre: document.getElementById("receptorNombre"),
  receptorDoc: document.getElementById("receptorDoc"),
  receptorDireccion: document.getElementById("receptorDireccion"),
  receptorContacto: document.getElementById("receptorContacto"),
  receptorCorreo: document.getElementById("receptorCorreo"),
  fecha: document.getElementById("fecha"),
  moneda: document.getElementById("moneda"),
  numeroControl: document.getElementById("numeroControl"),
  codigoGeneracion: document.getElementById("codigoGeneracion"),
  itemsTableBody: document.querySelector("#itemsTable tbody"),
  subTotal: document.getElementById("subTotal"),
  totalGravada: document.getElementById("totalGravada"),
  totalIva: document.getElementById("totalIva"),
  montoTotalOperacion: document.getElementById("montoTotalOperacion"),
  totalPagar: document.getElementById("totalPagar"),
  totalLetras: document.getElementById("totalLetras"),
  pagosList: document.getElementById("pagosList"),
  selloRecibido: document.getElementById("selloRecibido"),
  rawJson: document.getElementById("rawJson")
};

let pendingToLoad = null;

function renderList() {
  const all = store.list();
  const q = (searchInput?.value ?? "").trim().toLowerCase();
  invoicesList.innerHTML = "";
  if (!all.length) {
    invoicesList.innerHTML = "<li style='padding:12px;color:var(--muted)'>No hay facturas guardadas</li>";
    return;
  }

  const filtered = q ? all.filter(item => {
    const r = (item.receptor?.nombre ?? item.receptor?.nombreComercial ?? "").toString().toLowerCase();
    const em = (item.emisor?.nombre ?? "").toString().toLowerCase();
    const num = (item.identificacion?.numeroControl ?? item.identificacion?.codigoGeneracion ?? "").toString().toLowerCase();
    // match against receptor name primarily, fallback to other fields
    return r.includes(q) || em.includes(q) || num.includes(q);
  }) : all;

  if (!filtered.length) {
    invoicesList.innerHTML = `<li style='padding:12px;color:var(--muted)'>No se encontraron facturas para "${q}"</li>`;
    return;
  }

  filtered.forEach(item => {
    const li = document.createElement("li");
    li.dataset.key = item._key;

    const tipo = item.identificacion?.tipoDte ? `T${item.identificacion.tipoDte}` : "";
    const num = item.identificacion?.numeroControl ?? item.identificacion?.codigoGeneracion ?? "";
    const emisor = item.emisor?.nombre ?? "Emisor desconocido";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = [tipo, num, emisor].filter(Boolean).join(" • ");

    const meta = document.createElement("div");
    meta.className = "meta";
    const fecha = item.identificacion?.fecEmi ?? "";
    const total = item.resumen?.totalPagar ?? item.resumen?.montoTotalOperacion ?? "";
    const moneda = item.identificacion?.tipoMoneda ?? store.getDefaultCurrency() ?? "";
    meta.textContent = `${fecha} • ${formatMoney(total) || total} ${moneda}`;

    li.appendChild(title);
    li.appendChild(meta);
    li.addEventListener("click", () => {
      selectKey(item._key);
      Array.from(invoicesList.children).forEach(n=>n.classList.remove("selected"));
      li.classList.add("selected");
    });
    invoicesList.appendChild(li);
  });
}

function selectKey(key) {
  const obj = store.get(key);
  if (!obj) return;
  emptyState.hidden = true;
  detail.hidden = false;

  // Emisor
  ids.emisorNombre.textContent = obj.emisor?.nombre ?? obj.emisor?.nombreComercial ?? "";
  ids.emisorNit.textContent = obj.emisor?.nit ? `NIT: ${obj.emisor.nit}` : (obj.emisor?.nrc ? `NRC: ${obj.emisor.nrc}` : "");
  const ed = obj.emisor?.direccion?.complemento ?? obj.emisor?.direccion?.departamento ?? "";
  ids.emisorDireccion.textContent = ed ? `Dirección: ${ed}` : "";
  const econtact = obj.emisor?.telefono ? `Tel: ${obj.emisor.telefono}` : "";
  ids.emisorContacto.textContent = econtact;
  ids.emisorCorreo.textContent = obj.emisor?.correo ? `Correo: ${obj.emisor.correo}` : "";

  // Receptor
  ids.receptorNombre.textContent = obj.receptor?.nombre ?? obj.receptor?.nombreComercial ?? "";
  const receptorDoc = obj.receptor?.numDocumento ?? obj.receptor?.nrc ?? obj.receptor?.tipoDocumento;
  ids.receptorDoc.textContent = receptorDoc ? `Doc: ${receptorDoc}` : "";
  const rd = obj.receptor?.direccion?.complemento ?? obj.receptor?.direccion?.municipio ?? "";
  ids.receptorDireccion.textContent = rd ? `Dirección: ${rd}` : "";
  ids.receptorContacto.textContent = obj.receptor?.telefono ? `Tel: ${obj.receptor.telefono}` : "";
  ids.receptorCorreo.textContent = obj.receptor?.correo ? `Correo: ${obj.receptor.correo}` : "";

  // Identification / header
  ids.fecha.textContent = obj.identificacion?.fecEmi ?? obj.identificacion?.fecha ?? "";
  ids.moneda.textContent = obj.identificacion?.tipoMoneda ?? store.getDefaultCurrency() ?? "";
  ids.numeroControl.textContent = obj.identificacion?.numeroControl ?? obj.identificacion?.numero ?? "";
  ids.codigoGeneracion.textContent = obj.identificacion?.codigoGeneracion ?? obj.identificacion?.codigo ?? "";

  // items
  ids.itemsTableBody.innerHTML = "";
  const items = obj.cuerpoDocumento ?? obj.cuerpoDocument ?? [];
  items.forEach(it => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${it.numItem ?? ""}</td>
                    <td>${it.descripcion ?? ""}</td>
                    <td>${it.cantidad ?? ""}</td>
                    <td>${unitName(it.uniMedida)}</td>
                    <td>${formatMoney(it.precioUni)}</td>
                    <td>${formatMoney(it.ventaGravada ?? (it.precioUni * (it.cantidad ?? 1)) ?? 0)}</td>`;
    ids.itemsTableBody.appendChild(tr);
  });

  // financial summary
  ids.subTotal.textContent = formatMoney(obj.resumen?.subTotal ?? obj.resumen?.subTotalVentas ?? 0);
  ids.totalGravada.textContent = formatMoney(obj.resumen?.totalGravada ?? 0);
  // IVA handling:
  // - For DTE tipo "01" IVA is considered included and should not be shown.
  // - For DTE tipo "03" compute IVA from items (use ivaItem if provided, otherwise apply fallback rate).
  const tipoDte = String(obj.identificacion?.tipoDte ?? "");
  function computeIvaFromItems(items){
    if (!items || !items.length) return 0;
    // Sum explicit ivaItem values when present, else apply fallback rate to ventaGravada
    const fallbackRate = 0.13; // default VAT rate used when ivaItem not provided
    let sum = 0;
    for (const it of items) {
      if (it == null) continue;
      if (typeof it.ivaItem === "number") {
        sum += Number(it.ivaItem);
      } else {
        const base = Number(it.ventaGravada ?? (it.precioUni * (it.cantidad ?? 1)) ?? 0);
        sum += base * fallbackRate;
      }
    }
    return sum;
  }

  let ivaShown = "";
  if (tipoDte === "03") {
    const explicitIva = obj.resumen?.totalIva ?? obj.resumen?.iva ?? null;
    const items = obj.cuerpoDocumento ?? obj.cuerpoDocument ?? [];
    const computed = computeIvaFromItems(items);
    const ivaValue = explicitIva != null ? Number(explicitIva) : computed;
    ivaShown = formatMoney(ivaValue || 0);
  } else {
    // hide IVA for tipo 01 and other types unless explicit and not tipo 01 is desired
    ivaShown = "";
  }
  ids.totalIva.textContent = ivaShown;
  ids.montoTotalOperacion.textContent = formatMoney(obj.resumen?.montoTotalOperacion ?? 0);
  ids.totalPagar.textContent = formatMoney(obj.resumen?.totalPagar ?? obj.resumen?.montoTotalOperacion ?? 0);
  ids.totalLetras.textContent = obj.resumen?.totalLetras ?? "";

  // pagos (list)
  ids.pagosList.innerHTML = "";
  const pagos = obj.resumen?.pagos ?? obj.pagos ?? [];
  if (Array.isArray(pagos) && pagos.length) {
    pagos.forEach(p => {
      const li = document.createElement("li");
      const code = p.codigo ?? p.codigoPago ?? "";
      const m = p.montoPago ?? p.montoPago ?? p.monto ?? p.montoPago ?? p.montoPago;
      li.textContent = `${code ? `${code} · ` : ""}${formatMoney(m ?? 0)}${p.referencia ? ` · Ref: ${p.referencia}` : ""}`;
      ids.pagosList.appendChild(li);
    });
  } else {
    ids.pagosList.innerHTML = "<li>No hay pagos registrados</li>";
  }

  // sello recibido / firma
  ids.selloRecibido.textContent = obj.selloRecibido ?? obj.firmaElectronica ?? "";

  ids.rawJson.textContent = JSON.stringify(obj, null, 2);
}

function unitName(code){
  if (!code) return "";
  // keep simple mapping - numeric codes sometimes used
  const map = {59: "Servicio", 1: "Unidad", 2: "Kg"};
  return map[code] ?? String(code);
}

function formatMoney(v){
  if (v == null) return "";
  return new Intl.NumberFormat(undefined, {style:"currency",currency:store.getDefaultCurrency()||"USD"}).format(v);
}

/* File handling */

fileInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files ?? []);
  for (const f of files) {
    try {
      const text = await f.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        alert(`Archivo ${f.name} no es JSON válido.`);
        continue;
      }
      // accept different formats: array of invoices, object invoice, wrapper with invoice inside
      const candidates = normalizeParsed(parsed);
      for (const candidate of candidates) {
        const key = store.computeKey(candidate);
        if (store.exists(key)) {
          // warn and ask
          const name = candidate.identificacion?.numeroControl ?? candidate.identificacion?.codigoGeneracion ?? key;
          const message = `Se detectó factura duplicada (${name}). ¿Desea sobrescribirla o cancelar?`;
          const confirmed = await showModal(message);
          if (!confirmed) continue;
          store.save(key, candidate);
        } else {
          store.save(key, candidate);
        }
        renderList();
      }
    } catch (err) {
      console.error(err);
      alert("Error leyendo archivo");
    }
  }
  fileInput.value = "";
});

function normalizeParsed(parsed) {
  // If array, treat as array of invoices
  if (Array.isArray(parsed)) return parsed;
  // If object with root keys and looks like invoice (has identificacion), accept it directly
  if (parsed && typeof parsed === "object" && parsed.identificacion) return [parsed];
  // Some DTE/Factura JSONs are wrapped under a property (e.g., "dte", "documento")
  const candidates = [];
  const keys = Object.keys(parsed ?? {});
  for (const k of keys) {
    const val = parsed[k];
    if (val && typeof val === "object" && val.identificacion) candidates.push(val);
    // if array inside
    if (Array.isArray(val)) {
      val.forEach(it => { if (it && it.identificacion) candidates.push(it); });
    }
  }
  // fallback: treat entire object as one invoice
  if (!candidates.length) return [parsed];
  return candidates;
}

/* Modal helper */
function showModal(text){
  return new Promise(resolve => {
    modalText.textContent = text;
    modal.classList.remove("hidden");
    function cleanup() {
      modal.classList.add("hidden");
      modalCancel.removeEventListener("click", onCancel);
      modalConfirm.removeEventListener("click", onConfirm);
    }
    function onCancel(){ cleanup(); resolve(false); }
    function onConfirm(){ cleanup(); resolve(true); }
    modalCancel.addEventListener("click", onCancel);
    modalConfirm.addEventListener("click", onConfirm);
  });
}

clearAll.addEventListener("click", async () => {
  const ok = await showModal("Eliminar todas las facturas guardadas?");
  if (ok) {
    store.clear();
    renderList();
    detail.hidden = true;
    emptyState.hidden = false;
  }
});

/* debounce helper */
function debounce(fn, wait=250){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
}

/* connect search input */
if (searchInput) {
  searchInput.addEventListener("input", debounce(()=> {
    renderList();
  },200));
}

/* init */
renderList();
if (invoicesList.firstChild) invoicesList.firstChild.classList.add("selected");
if (store.list().length) {
  selectKey(store.list()[0]._key);
}

/* Help button & modal */
const helpBtn = document.getElementById("helpBtn");
const helpModal = document.getElementById("helpModal");
const helpClose = document.getElementById("helpClose");

if (helpBtn && helpModal && helpClose) {
  helpBtn.addEventListener("click", () => {
    helpModal.classList.remove("hidden");
  });
  helpClose.addEventListener("click", () => {
    helpModal.classList.add("hidden");
  });
  // close when clicking outside card
  helpModal.addEventListener("click", (ev) => {
    if (ev.target === helpModal) helpModal.classList.add("hidden");
  });
}