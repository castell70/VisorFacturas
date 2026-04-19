/*
Simple storage layer using localStorage.
Each invoice is stored as value; key is computed deterministically using
identificacion.codigoGeneracion or identificacion.numeroControl or content hash.
Exports a singleton `store` with methods: save, get, exists, list, computeKey, clear, getDefaultCurrency
*/
export const store = (function(){
  const PREFIX = "invoices_v1:";
  function computeKey(obj){
    if (!obj || typeof obj !== "object") return PREFIX + hash(JSON.stringify(obj));
    const id = obj.identificacion ?? obj.ident;
    const cg = id?.codigoGeneracion;
    const nc = id?.numeroControl;
    if (cg) return PREFIX + cg;
    if (nc) return PREFIX + nc;
    // fallback: try selloRecibido, codigoGeneracion in firma or other unique things
    const possible = obj.firmaElectronica ?? obj.selloRecibido ?? JSON.stringify(obj).slice(0,120);
    return PREFIX + hash(possible);
  }

  function save(key, obj){
    const copy = structuredClone(obj);
    copy._savedAt = new Date().toISOString();
    copy._key = key;
    localStorage.setItem(key, JSON.stringify(copy));
  }

  function get(key){
    const t = localStorage.getItem(key);
    return t ? JSON.parse(t) : null;
  }

  function exists(key){
    return localStorage.getItem(key) !== null;
  }

  function list(){
    const out = [];
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if (!k.startsWith(PREFIX)) continue;
      try {
        const o = JSON.parse(localStorage.getItem(k));
        out.push(o);
      } catch(e){}
    }
    // sort by invoice emission date: oldest -> newest
    out.sort((a,b)=>{
      const da = parseDate(a.identificacion?.fecEmi ?? a.identificacion?.fecha ?? a._savedAt);
      const db = parseDate(b.identificacion?.fecEmi ?? b.identificacion?.fecha ?? b._savedAt);
      return (da || 0) - (db || 0);
    });
    return out;
  }

  function parseDate(s){
    if (!s) return 0;
    // if already a Date or timestamp
    if (typeof s === "number") return s;
    // try ISO parse
    const d = new Date(s);
    if (!isNaN(d)) return d.getTime();
    // try common dd/mm/yyyy or dd-mm-yyyy
    const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m){
      const day = Number(m[1]), mon = Number(m[2]) - 1, yr = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
      const dd = new Date(yr, mon, day);
      if (!isNaN(dd)) return dd.getTime();
    }
    return 0;
  }

  function clear(){
    const keys = [];
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if (k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach(k=>localStorage.removeItem(k));
  }

  function getDefaultCurrency(){
    // try to pick currency from first stored item
    const l = list();
    return l[0]?.identificacion?.tipoMoneda ?? "USD";
  }

  // simple djb2 hash
  function hash(str){
    let h = 5381;
    for (let i=0;i<str.length;i++) h = ((h<<5)+h) + str.charCodeAt(i);
    return (h >>> 0).toString(36);
  }

  return { computeKey, save, get, exists, list, clear, getDefaultCurrency };
})();