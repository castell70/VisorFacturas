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
    // sort by date desc
    out.sort((a,b)=> (b._savedAt||"").localeCompare(a._savedAt||""));
    return out;
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