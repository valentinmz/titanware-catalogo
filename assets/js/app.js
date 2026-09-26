/* =========================================================
   Titanware · tienda
   Vistas: #/ (inicio) · #/armar · #/pcs · #/catalogo/<categoría>
   ========================================================= */
(function () {
  const CFG = window.TW_CONFIG, U = TW.UI, esc = TW.esc, norm = TW.norm;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NEG = CFG.negocio;

  let data = { products: [], byId: {}, pcs: [] };
  const cat = { q: "", cat: "Todos", sub: "", brand: "", sort: "destacados" };
  let pcFilter = "Todas";
  let currentView = "";

  /* ---------- Textos y links fijos ---------- */
  function setupStatic() {
    const general = TW.waLink(`Hola ${NEG.nombre}! Quería hacer una consulta.`);
    ["#topWa", "#floatWa", "#footWa", "#topPhone"].forEach((s) => ($(s).href = general));
    $("#topPhone").textContent = NEG.whatsappVisible;
    const city = NEG.ubicacion.split(",")[0];
    $("#topPlace").textContent = city;
    $$(".place").forEach((e) => (e.textContent = city));
    $("#footPlace").textContent = NEG.ubicacion;
    $("#bandWa").href = TW.waLink(`Hola ${NEG.nombre}! Quería asesoramiento para elegir mi PC.`);
    $("#footIg").href = `https://instagram.com/${NEG.instagram}`;
    $("#footIg span").textContent = `@${NEG.instagram}`;
    $("#year").textContent = new Date().getFullYear();
    $("#mainnav").insertAdjacentHTML("beforeend", CFG.categorias.map((c) =>
      `<a href="#/catalogo/${encodeURIComponent(c)}" data-route="catalogo" data-cat="${esc(c)}">${esc(c)}</a>`).join(""));
    $("#tileIcoBuild").innerHTML = TW.ICONS.Procesadores;
    $("#tileIcoPcs").innerHTML = TW.ICONS.Gabinetes;
    $("#tileIcoCat").innerHTML = TW.ICONS["Placas de video"];
  }

  /* ---------- Aviso flotante ---------- */
  let toastTimer;
  function toast(msg, withCart = false) {
    const t = $("#toast");
    t.innerHTML = `${U.check}<span>${esc(msg)}</span>${withCart ? '<button type="button" data-opencart>Ver carrito</button>' : ""}`;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3800);
  }

  /* ---------- Router ---------- */
  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    const [view = "", ...rest] = h.split("/");
    return { view: ["armar", "pcs", "catalogo"].includes(view) ? view : "home", arg: rest.join("/") };
  }
  function route() {
    const { view, arg } = parseHash();
    $$("[data-view]").forEach((s) => (s.hidden = s.dataset.view !== view));
    document.body.classList.toggle("building", view === "armar");
    $$("#mainnav a").forEach((a) => {
      const on = a.dataset.route === view && (view !== "catalogo" || (a.dataset.cat || "") === (arg || "") || (!a.dataset.cat && !arg));
      a.toggleAttribute("aria-current", false);
      if (on) a.setAttribute("aria-current", "page");
    });
    if (view === "catalogo") {
      const next = CFG.categorias.includes(arg) ? arg : "Todos";
      if (next !== cat.cat) {
        cat.cat = next; cat.sub = "";
        if (next !== "Todos") { cat.q = ""; $("#q").value = ""; }
      }
      renderCatalog();
    }
    if (view === "pcs") { pcFilter = arg || "Todas"; renderPCs(); }
    if (view === "armar") renderBuilder();
    if (view === "home") renderHome();
    const titles = { home: "Componentes y PCs armadas", armar: "Armá tu PC", pcs: "PC Armadas", catalogo: cat.cat === "Todos" ? "Catálogo" : cat.cat };
    document.title = `Titanware · ${titles[view]}`;
    if (currentView !== view || view === "catalogo" || view === "pcs") scrollTo({ top: 0 });
    currentView = view;
  }

  /* =========================================================
     PRODUCTOS
     ========================================================= */
  function productCard(p) {
    return `
    <button class="card${p.stock === "sin stock" ? " is-off" : ""}" type="button" data-product="${esc(p.id)}" aria-label="${esc(p.titulo)}, ver detalle">
      ${p.destacado ? `<span class="badge">${U.star} Destacado</span>` : ""}
      <div class="thumb">${TW.thumb(p, true)}</div>
      <div class="card-body">
        <div class="meta"><span>${esc(p.marca)}</span><span>${esc(p.sub || p.categoria)}</span></div>
        <h3>${esc(p.titulo)}</h3>
        <p class="specs-short">${esc(p.specs.slice(0, 2).join(", "))}</p>
        <div class="card-foot">${TW.priceHtml(p.precio)}<span class="stock ${p.stock.replace(" ", "-")}">${TW.STOCK[p.stock]}</span></div>
        <div class="card-cta">Ver detalle ${U.arrow}</div>
      </div>
    </button>`;
  }

  function openProduct(id) {
    const p = data.byId[id];
    if (!p) return;
    const msg = `Hola ${NEG.nombre}! Quería consultar por: ${p.titulo}${p.precio ? ` (${TW.money(p.precio)})` : ""}. ¿Tienen stock?`;
    const m = $("#modal");
    m.className = "";
    m.innerHTML = `
      <button class="close" type="button" aria-label="Cerrar" data-close>${U.close}</button>
      <div class="modal">
        <div class="thumb">${TW.thumb(p, true)}</div>
        <div class="modal-body">
          <div class="meta"><span>${esc(p.marca)} · ${esc(p.categoria)}${p.sub ? ` · ${esc(p.sub)}` : ""}</span></div>
          <h2 id="mTitle">${esc(p.titulo)}</h2>
          <div class="modal-price">${TW.priceHtml(p.precio)}<span class="stock ${p.stock.replace(" ", "-")}">${TW.STOCK[p.stock]}</span></div>
          ${p.specs.length ? `<p class="spec-title">Características</p><ul class="spec-list">${p.specs.map((s) => `<li>${U.check}<span>${esc(s)}</span></li>`).join("")}</ul>` : ""}
          <div class="modal-actions">
            <button class="btn" type="button" data-add="${esc(p.id)}"${p.stock === "sin stock" ? " disabled" : ""}>${U.cart} Agregar al carrito</button>
            <a class="btn ghost" href="#/armar" data-close>${U.wrench} Armá tu PC</a>
            <a class="btn wa" href="${TW.waLink(msg)}" target="_blank" rel="noopener">${U.wa} Consultar por WhatsApp</a>
          </div>
          <p class="note">Precios y stock sujetos a cambios. Te los confirmamos por WhatsApp antes de tu compra.</p>
        </div>
      </div>`;
    m.showModal();
  }

  /* ---------- Catálogo ---------- */
  function renderCatalog() {
    renderCats(); renderBrands(); renderGrid();
  }
  function renderCats() {
    const counts = data.products.reduce((a, p) => ((a[p.categoria] = (a[p.categoria] || 0) + 1), a), {});
    const extra = Object.keys(counts).filter((c) => !CFG.categorias.includes(c));
    const cats = ["Todos", ...CFG.categorias, ...extra];
    $("#cats").innerHTML = cats.map((c) =>
      `<a class="cat" href="#/catalogo/${c === "Todos" ? "" : encodeURIComponent(c)}" aria-pressed="${c === cat.cat}">${esc(c)} <small>${c === "Todos" ? data.products.length : counts[c] || 0}</small></a>`).join("");

    updateCatsFade();
    renderSubs();
  }
  function renderSubs() {
    const subs = cat.cat === "Todos" ? [] : [...new Set(data.products.filter((p) => p.categoria === cat.cat && p.sub).map((p) => p.sub))];
    $("#subcats").hidden = subs.length < 2;
    $("#subcats").innerHTML = ["", ...subs].map((s) =>
      `<button class="sub" type="button" data-sub="${esc(s)}" aria-pressed="${s === cat.sub}">${s ? esc(s) : "Todas"}</button>`).join("");
  }
  function updateCatsFade() {
    const el = $("#cats");
    el.parentElement.classList.toggle("overflow", el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }
  function renderBrands() {
    const counts = {};
    for (const p of data.products) {
      if (cat.cat !== "Todos" && p.categoria !== cat.cat) continue;
      if (cat.sub && p.sub !== cat.sub) continue;
      if (p.marca && p.marca !== "Genérico") counts[p.marca] = (counts[p.marca] || 0) + 1;
    }
    const brands = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    if (!counts[cat.brand]) cat.brand = "";
    $("#brand").innerHTML = `<option value="">Todas las marcas</option>` +
      brands.map((b) => `<option value="${esc(b)}"${b === cat.brand ? " selected" : ""}>${esc(b)} (${counts[b]})</option>`).join("");
  }
  function filteredProducts() {
    const words = norm(cat.q).split(/\s+/).filter(Boolean);
    const list = data.products.filter((p) => {
      if (cat.cat !== "Todos" && p.categoria !== cat.cat) return false;
      if (cat.sub && p.sub !== cat.sub) return false;
      if (cat.brand && p.marca !== cat.brand) return false;
      const hay = norm([p.titulo, p.nombre, p.marca, p.categoria, p.sub, ...p.specs].join(" "));
      return words.every((w) => hay.includes(w));
    });
    const byPrice = (dir) => (a, b) => (a.precio == null) - (b.precio == null) || dir * ((a.precio || 0) - (b.precio || 0));
    const sorters = {
      destacados: (a, b) => b.destacado - a.destacado || (a.stock === "sin stock") - (b.stock === "sin stock"),
      az: (a, b) => a.titulo.localeCompare(b.titulo),
      "precio-asc": byPrice(1),
      "precio-desc": byPrice(-1),
    };
    return list.sort(sorters[cat.sort]);
  }
  function renderGrid() {
    const list = filteredProducts();
    $("#count").textContent = `${list.length} ${list.length === 1 ? "producto" : "productos"}`;
    $("#resultsTitle").textContent = cat.q.trim() ? `Resultados para “${cat.q.trim()}”` : cat.cat === "Todos" ? "Todos los productos" : cat.cat + (cat.sub ? ` · ${cat.sub}` : "");
    if (!list.length) {
      const ask = TW.waLink(`Hola ${NEG.nombre}! Estoy buscando: ${cat.q.trim() || "un producto"}. ¿Lo tienen o lo pueden conseguir?`);
      $("#grid").innerHTML = `<div class="empty"><strong>No encontramos productos con esos filtros</strong>Probá con otra búsqueda o consultanos: capaz lo conseguimos.<div class="actions"><button class="btn ghost" type="button" id="reset">Ver todo el catálogo</button><a class="btn wa" href="${ask}" target="_blank" rel="noopener">${U.wa} Consultar por WhatsApp</a></div></div>`;
      return;
    }
    $("#grid").innerHTML = list.map(productCard).join("");
  }

  /* =========================================================
     PCs ARMADAS
     ========================================================= */
  // Imagen de una PC armada: su foto propia, o la del gabinete con el logo del procesador, o un ícono
  function pcArt(pc, s) {
    const cpuLogo = s.cpuMarca ? TW.logoHtml(s.cpuMarca, TW.LOGOS[s.cpuMarca]) : "";
    if (pc.imagen) return { html: `<img src="${esc(pc.imagen)}" alt="${esc(pc.nombre)}" loading="lazy">`, photo: true };
    const gab = TW.pcLines(pc, data.byId).find((l) => l.p.categoria === "Gabinetes" && l.p.imagen);
    if (gab) return { html: `<img src="${esc(gab.p.imagen)}" alt="${esc(pc.nombre)}" loading="lazy">${cpuLogo ? `<span class="cpu-badge">${cpuLogo}</span>` : ""}`, photo: true };
    return { html: `<span class="case">${TW.ICONS.Gabinetes}</span>${cpuLogo}`, photo: false };
  }

  function pcCard(pc) {
    const s = TW.pcSummary(pc, data.byId), price = TW.pcPrice(pc, data.byId);
    const { html: art, photo } = pcArt(pc, s);
    const li = (ico, t) => (t ? `<li>${ico}<span>${esc(t)}</span></li>` : "");
    return `
    <article class="pc-card">
      <button class="pc-thumb${photo ? " photo" : ""}" type="button" data-pc="${esc(pc.id)}" aria-label="Ver ${esc(pc.nombre)}">${pc.destacado ? `<span class="badge">${U.star} Destacada</span>` : ""}${art}</button>
      <div class="pc-body">
        <div class="meta"><span>${esc(pc.categoria)}</span></div>
        <h3>${esc(pc.nombre)}</h3>
        <ul class="pc-specs">
          ${li(TW.ICONS.Procesadores, s.cpu)}${li(TW.ICONS["Memorias RAM"], s.ram)}${li(TW.ICONS.Almacenamientos, s.disco)}${li(TW.ICONS["Placas de video"], s.video)}
        </ul>
        <div class="pc-foot">${TW.priceHtml(price)}
          <div class="btns"><button class="btn sm ghost" type="button" data-pc="${esc(pc.id)}">Ver</button><button class="btn sm" type="button" data-addpc="${esc(pc.id)}">${U.cart} Agregar</button></div>
        </div>
      </div>
    </article>`;
  }

  function renderPCs() {
    const cats = ["Todas", ...CFG.categoriasPC.filter((c) => data.pcs.some((p) => p.categoria === c))];
    if (!cats.includes(pcFilter)) pcFilter = "Todas";
    $("#pcTabs").innerHTML = cats.map((c) => `<a class="cat" href="#/pcs/${c === "Todas" ? "" : encodeURIComponent(c)}" aria-pressed="${c === pcFilter}">${esc(c)}</a>`).join("");
    const list = data.pcs.filter((p) => pcFilter === "Todas" || p.categoria === pcFilter);
    $("#pcGrid").innerHTML = list.length ? list.map(pcCard).join("")
      : `<div class="empty"><strong>Todavía no hay PCs armadas en esta categoría</strong>Armá la tuya en el armador o consultanos.<div class="actions"><a class="btn" href="#/armar">Armá tu PC</a></div></div>`;
  }

  function openPc(id) {
    const pc = data.pcs.find((x) => x.id === id);
    if (!pc) return;
    const lines = TW.pcLines(pc, data.byId), price = TW.pcPrice(pc, data.byId), s = TW.pcSummary(pc, data.byId);
    const msg = `Hola ${NEG.nombre}! Me interesa la ${pc.nombre} (${TW.money(price)}). ¿Está disponible?`;
    const m = $("#modal");
    m.className = "pc-modal";
    m.innerHTML = `
      <button class="close" type="button" aria-label="Cerrar" data-close>${U.close}</button>
      <div class="modal">
        <div class="thumb">${(() => { const a = pcArt(pc, s); return a.photo ? a.html.replace(/<span class="cpu-badge">[\s\S]*<\/span>$/, "") : `<span class="t-bg">${TW.ICONS.Gabinetes}</span>${s.cpuMarca ? TW.logoHtml(s.cpuMarca, TW.LOGOS[s.cpuMarca]) : ""}`; })()}</div>
        <div class="modal-body">
          <div class="meta"><span>PC Armada · ${esc(pc.categoria)}</span></div>
          <h2 id="mTitle">${esc(pc.nombre)}</h2>
          ${pc.descripcion ? `<p style="margin:0;color:var(--text-2);font-size:.92rem">${esc(pc.descripcion)}</p>` : ""}
          <ul class="comp-list">${lines.map((l) => `
            <li><span class="mini">${TW.thumb(l.p)}</span><span><small>${esc(TW.stepForCategory(l.p.categoria)?.label || l.p.categoria)}</small>${l.qty > 1 ? `${l.qty}x ` : ""}${esc(l.p.titulo)}</span></li>`).join("")}
          </ul>
          <div class="modal-price">${TW.priceHtml(price)}<span class="stock consultar">Consultar</span></div>
          <div class="modal-actions">
            <button class="btn" type="button" data-addpc="${esc(pc.id)}">${U.cart} Agregar al carrito</button>
            <button class="btn ghost" type="button" data-custom="${esc(pc.id)}">${U.wrench} Personalizar</button>
            <a class="btn wa" href="${TW.waLink(msg)}" target="_blank" rel="noopener">${U.wa} Consultar por WhatsApp</a>
          </div>
          <p class="note">Incluye armado y prueba. Precios sujetos a confirmación de stock.</p>
        </div>
      </div>`;
    m.showModal();
  }

  /* =========================================================
     INICIO
     ========================================================= */
  function renderHome() {
    const pcs = data.pcs.filter((p) => p.destacado);
    const show = (pcs.length ? pcs : data.pcs).slice(0, 4);
    $("#homePcsSec").hidden = !show.length;
    $("#homePcs").innerHTML = show.map(pcCard).join("");
    const dest = data.products.filter((p) => p.destacado);
    $("#homeProducts").innerHTML = (dest.length ? dest : data.products).slice(0, 12).map(productCard).join("");
  }

  /* =========================================================
     ARMÁ TU PC
     ========================================================= */
  const BKEY = "tw_build_v1";
  let B = { sel: TW.emptyBuild(), step: 0, q: "", sort: "precio-asc" };
  try { const saved = JSON.parse(localStorage.getItem(BKEY)); if (saved && saved.sel) B = { ...B, ...saved, q: "" }; } catch {}
  const saveBuild = () => { try { localStorage.setItem(BKEY, JSON.stringify({ sel: B.sel, step: B.step, sort: B.sort })); } catch {} };
  const STEPS = TW.STEPS;
  const chosen = (key) => (B.sel[key] || []).filter((c) => data.byId[c.id]);

  function optionalReason(key) {
    const sel = B.sel, byId = data.byId;
    const cpu = chosen("cpu")[0] && byId[chosen("cpu")[0].id], gab = chosen("case")[0] && byId[chosen("case")[0].id];
    if (key === "gpu" && cpu && cpu.attrs.video) return "Usa el video integrado";
    if (key === "cooler" && cpu && cpu.attrs.cooler) return "Incluido con el procesador";
    if (key === "psu" && gab && gab.attrs.fuente >= TW.power(sel, byId).min) return `Incluida en el gabinete (${gab.attrs.fuente} W)`;
    return "Opcional";
  }

  function renderBuilder() {
    const root = $("#builder");
    if (!B.sel.plataforma) {
      root.innerHTML = `
        <div class="platforms">
          <button class="plat" type="button" data-plat="AMD">${TW.logoHtml("AMD", TW.LOGOS.AMD)}<span>Ryzen y Athlon · Sockets AM4 y AM5</span></button>
          <button class="plat" type="button" data-plat="Intel">${TW.logoHtml("Intel", TW.LOGOS.Intel)}<span>Core, Pentium y Celeron · LGA 1200 y 1700</span></button>
        </div>`;
      $("#bIntro").hidden = false;
      return;
    }
    $("#bIntro").hidden = true;
    const n = STEPS.length;
    B.step = Math.max(0, Math.min(n, B.step));
    const stepBtns = STEPS.map((s, i) => {
      const items = chosen(s.key), req = TW.isRequired(s.key, B.sel, data.byId);
      const sub = items.length ? (items.length > 1 ? `${items.length} elegidos` : shortName(data.byId[items[0].id])) : req ? "Pendiente" : optionalReason(s.key);
      return `<button class="b-step${items.length ? " done" : ""}" type="button" data-goto="${i}"${B.step === i ? ' aria-current="step"' : ""}>
        <span class="n">${items.length ? U.check : TW.ICONS[s.cat]}</span><span>${esc(s.label)}<em>${esc(sub)}</em></span></button>`;
    }).join("") + `<button class="b-step${B.step === n ? "" : ""}" type="button" data-goto="${n}"${B.step === n ? ' aria-current="step"' : ""}><span class="n">${U.cart}</span><span>Resumen<em>Revisá y pedí</em></span></button>`;
    root.innerHTML = `
      <div class="b-steps" role="tablist" aria-label="Pasos del armador">${stepBtns}</div>
      <div class="b-layout">
        <div class="b-main" id="bMain">${B.step < n ? stepView(STEPS[B.step]) : summaryView()}</div>
        <aside class="b-side" id="bSide" aria-label="Resumen de tu PC">${sideHtml()}</aside>
      </div>`;
    const cur = $(".b-step[aria-current]", root);
    if (cur) cur.scrollIntoView({ block: "nearest", inline: "center" });
    if (B.step < n) renderOptions();
  }

  const shortName = (p) => p.titulo.length > 34 ? p.titulo.slice(0, 32) + "…" : p.titulo;
  const firstOf = (key) => chosen(key)[0] && data.byId[chosen(key)[0].id];

  // Progreso: pasos obligatorios completos
  function progress() {
    const req = STEPS.filter((s) => TW.isRequired(s.key, B.sel, data.byId) || chosen(s.key).length);
    const done = req.filter((s) => chosen(s.key).length).length;
    return { done, total: req.length, pct: req.length ? Math.round((done / req.length) * 100) : 0 };
  }

  // Filtros de compatibilidad que se están aplicando en cada paso
  function stepFilters(key) {
    const cpu = firstOf("cpu"), mobo = firstOf("mobo"), pw = TW.power(B.sel, data.byId), f = [];
    if (key === "cpu") f.push(`Plataforma ${B.sel.plataforma}`);
    if (key === "mobo" && cpu && cpu.attrs.socket) f.push(`Socket ${cpu.attrs.socket}`);
    if (key === "ram") { if (mobo && mobo.attrs.ddr) f.push(mobo.attrs.ddr); f.push("Solo de escritorio"); }
    if (key === "storage") f.push("Discos internos");
    if (key === "case" && mobo && mobo.attrs.formato) f.push(`Para mother ${mobo.attrs.formato}`);
    if (key === "psu") f.push(`${pw.min} W o más`);
    if (key === "cooler" && cpu) { if (cpu.attrs.socket) f.push(`Socket ${cpu.attrs.socket}`); if (cpu.attrs.tdp) f.push(`${cpu.attrs.tdp} W o más`); }
    return f;
  }

  // Chequeos de compatibilidad, uno por uno: ok · wait (falta elegir) · bad
  function compatChecks() {
    const cpu = firstOf("cpu"), mobo = firstOf("mobo"), ram = firstOf("ram"), gab = firstOf("case"), psu = firstOf("psu"), cool = firstOf("cooler"), gpu = firstOf("gpu");
    const pw = TW.power(B.sel, data.byId);
    const errs = TW.checkBuild(B.sel, data.byId).filter((x) => x.level === "error");
    const err = (k) => errs.find((x) => x.key === k);
    const c = (label, key, ok, okTxt, waitTxt) => { const e = err(key); return { label, state: e ? "bad" : ok ? "ok" : "wait", txt: e ? e.msg.replace(/^[^:]+: /, "") : ok ? okTxt : waitTxt }; };
    const psuW = psu ? psu.attrs.watts : !TW.isRequired("psu", B.sel, data.byId) && gab ? gab.attrs.fuente : 0;
    return [
      c("Socket", "mobo", cpu && mobo, `${cpu?.attrs.socket || ""} en procesador y mother`, cpu ? `Tu procesador es ${cpu.attrs.socket}` : "Según el procesador"),
      c("Memoria", "ram", mobo && ram, `${ram?.attrs.ddr || mobo?.attrs.ddr || ""} compatible con la mother`.trim(), mobo ? `Tu mother usa ${mobo.attrs.ddr}` : "Según la mother"),
      c("Gabinete", "case", mobo && gab, `Entra la mother${mobo?.attrs.formato ? ` ${mobo.attrs.formato}` : ""}`, "Según el tamaño de la mother"),
      c("Energía", "psu", psuW, `${psuW} W para ~${pw.est} W de consumo`, `Recomendada: ${pw.rec} W o más`),
      c("Refrigeración", "cooler", cool || (cpu && cpu.attrs.cooler), cool ? "Cooler compatible con el procesador" : "Cooler incluido con el procesador", "Según el procesador"),
      c("Video", "gpu", gpu || (cpu && cpu.attrs.video), gpu ? "Placa de video dedicada" : "Video integrado del procesador", cpu ? "Tu procesador necesita placa de video" : "Según el procesador"),
    ];
  }

  function stepView(step) {
    const i = STEPS.indexOf(step), req = TW.isRequired(step.key, B.sel, data.byId);
    const pw = TW.power(B.sel, data.byId);
    let note = "";
    if (!req && step.key === "gpu") note = "Tu procesador tiene video integrado: podés seguir sin placa de video y agregarla más adelante.";
    if (!req && step.key === "cooler") note = "Tu procesador ya trae cooler: este paso es opcional.";
    if (!req && step.key === "psu") note = `${optionalReason("psu")}: alcanza para tu configuración, este paso es opcional.`;
    if (req && step.key === "psu") note = `Consumo estimado de tu PC: ~${pw.est} W. Te mostramos fuentes de ${pw.min} W o más (recomendado: ${pw.rec} W o más).`;
    if (step.key === "ram" && firstOf("mobo")) note = `Tu mother usa memorias ${firstOf("mobo").attrs.ddr}. Te mostramos solo esas.`;
    const filters = stepFilters(step.key);
    return `
      <div class="b-head">
        <div class="b-title"><span class="b-ico">${TW.ICONS[step.cat]}</span>
          <div><h2><small>Paso ${i + 1} de ${STEPS.length}${req ? "" : " · Opcional"}</small>${esc(step.label)}</h2><p>${esc(step.tip)}</p></div></div>
        <div class="b-tools">
          <label class="hsearch" style="border-radius:var(--radius-sm)">${U.search}<input id="bq" type="search" placeholder="Buscar ${esc(step.label.toLowerCase())}…" value="${esc(B.q)}" autocomplete="off"></label>
          <div class="select"><select id="bsort" aria-label="Ordenar">
            <option value="precio-asc"${B.sort === "precio-asc" ? " selected" : ""}>Menor precio</option>
            <option value="precio-desc"${B.sort === "precio-desc" ? " selected" : ""}>Mayor precio</option>
            <option value="az"${B.sort === "az" ? " selected" : ""}>Nombre</option>
          </select></div>
        </div>
      </div>
      <div class="b-filters">${U.shield}<span>Mostrando solo lo compatible</span>${filters.map((f) => `<b>${esc(f)}</b>`).join("")}<em id="optCount"></em></div>
      ${note ? `<div class="b-note">${U.bolt}<span>${esc(note)}</span></div>` : ""}
      <div class="opt-grid" id="optGrid"></div>
      <div class="b-nav">
        <button class="btn ghost" type="button" data-goto="${i - 1}"${i === 0 ? " hidden" : ""}>${U.back} Anterior</button>
        <button class="btn" type="button" data-goto="${i + 1}">${i + 1 === STEPS.length ? "Ver resumen" : "Próximo paso"} ${U.arrow}</button>
      </div>`;
  }

  function renderOptions() {
    const step = STEPS[B.step], grid = $("#optGrid");
    if (!grid) return;
    const req = TW.isRequired(step.key, B.sel, data.byId);
    const words = norm(B.q).split(/\s+/).filter(Boolean);
    let opts = TW.options(step.key, B.sel, data).filter((p) => words.every((w) => norm(p.titulo + " " + p.marca + " " + p.specs.join(" ")).includes(w)));
    const sorters = { "precio-asc": (a, b) => (a.precio || 1e12) - (b.precio || 1e12), "precio-desc": (a, b) => (b.precio || 0) - (a.precio || 0), az: (a, b) => a.titulo.localeCompare(b.titulo) };
    opts.sort(sorters[B.sort] || sorters["precio-asc"]);
    const count = $("#optCount");
    if (count) count.textContent = `${opts.length} ${opts.length === 1 ? "opción" : "opciones"}`;
    const picked = new Set(chosen(step.key).map((c) => c.id));
    const rec = TW.power(B.sel, data.byId).rec;
    const isRec = (p) => step.key === "psu" && p.attrs.watts >= rec && /80 PLUS/i.test(p.nombre);
    const skip = !req ? `<button class="skip-card${picked.size ? "" : " sel"}" type="button" data-skip="${step.key}"><strong>Seguir sin ${esc(step.label.toLowerCase())}</strong>${esc(optionalReason(step.key))}</button>` : "";
    grid.innerHTML = skip + (opts.length ? opts.map((p) => `
      <button class="opt${picked.has(p.id) ? " sel" : ""}" type="button" data-pick="${esc(p.id)}">
        ${isRec(p) ? `<span class="badge">${U.bolt} Recomendada</span>` : ""}
        <div class="thumb">${TW.thumb(p, true)}</div>
        <div class="opt-body">
          <span class="opt-brand">${esc(p.marca)}</span>
          <h4>${esc(p.titulo)}</h4>
          ${p.specs.length ? `<div class="opt-chips">${p.specs.slice(0, 3).map((s) => `<span>${esc(s)}</span>`).join("")}</div>` : ""}
          <div class="opt-foot">${TW.priceHtml(p.precio)}<span class="pick">${picked.has(p.id) ? `${U.check} Elegido` : step.multi ? `${U.plus} Sumar` : "Elegir"}</span></div>
        </div>
      </button>`).join("")
      : `<div class="b-empty">${B.q ? "No hay resultados para tu búsqueda." : "No hay opciones compatibles con lo que elegiste en los pasos anteriores."} <br>Consultanos por WhatsApp y te ayudamos.</div>`);
  }

  function sideHtml() {
    const lines = TW.buildLines(B.sel, data.byId), total = TW.linesTotal(lines);
    const issues = TW.checkBuild(B.sel, data.byId);
    const faltan = issues.filter((x) => x.level === "falta");
    const avisos = issues.filter((x) => x.level === "aviso");
    const hasErr = issues.some((x) => x.level === "error");
    const pw = TW.power(B.sel, data.byId), pr = progress(), checks = compatChecks();
    const okAll = !faltan.length && !hasErr;
    const status = hasErr ? ["bad", "Revisá la compatibilidad"] : okAll ? ["ok", "Todo compatible"] : ["wait", `Faltan ${faltan.length} ${faltan.length === 1 ? "componente" : "componentes"}`];

    const rows = STEPS.map((s, i) => {
      const items = chosen(s.key), req = TW.isRequired(s.key, B.sel, data.byId);
      const first = items[0] && data.byId[items[0].id];
      const state = items.length ? "done" : req ? "need" : "opt";
      const body = items.length ? items.map((c) => {
        const p = data.byId[c.id];
        const ctl = s.maxQty ? `<span class="qty"><button type="button" data-q="${s.key}|${esc(c.id)}|-1" aria-label="Menos"${c.qty <= 1 ? " disabled" : ""}>${U.minus}</button><span>${c.qty}</span><button type="button" data-q="${s.key}|${esc(c.id)}|1" aria-label="Más"${c.qty >= s.maxQty ? " disabled" : ""}>${U.plus}</button></span>` : "";
        return `<div class="s-item"><span class="it">${c.qty > 1 ? `${c.qty}x ` : ""}${esc(p.titulo)}</span><span class="pr">${p.precio ? TW.money(p.precio * c.qty) : "Consultar"}</span>
          <button class="icon-btn" type="button" data-rm="${s.key}|${esc(c.id)}" aria-label="Quitar ${esc(p.titulo)}">${U.trash}</button>${ctl ? `<span class="ctl">${ctl}</span>` : ""}</div>`;
      }).join("") : `<div class="s-item"><span class="it none">${req ? "Sin elegir" : esc(optionalReason(s.key))}</span></div>`;
      return `<li class="sum-row ${state}${B.step === i ? " cur" : ""}">
        <button class="s-ico${first && (first.imagen || first.caja) ? " ph" : ""}" type="button" data-goto="${i}" aria-label="${esc(s.label)}">${first ? TW.thumb(first) : TW.ICONS[s.cat]}${items.length ? `<i>${U.check}</i>` : ""}</button>
        <div class="s-body"><span class="lbl">${esc(s.label)}${req || items.length ? "" : "<small>Opcional</small>"}<button type="button" data-goto="${i}">${items.length ? "Cambiar" : "Elegir"}</button></span>${body}</div></li>`;
    }).join("");

    const psu = firstOf("psu"), gab = firstOf("case");
    const cap = psu ? psu.attrs.watts : !TW.isRequired("psu", B.sel, data.byId) && gab ? gab.attrs.fuente : 0;
    const scale = cap || pw.rec, use = Math.min(100, Math.round((pw.est / scale) * 100));
    const logo = TW.LOGOS[B.sel.plataforma];

    return `
      <div class="b-mobile-bar" data-toggle-side><div><span>Total de tu PC</span><strong>${TW.money(total)}</strong></div><span>${pr.done}/${pr.total} listos · Ver resumen ▴</span></div>
      <div class="b-side-head">
        <div class="t"><span class="plat-logo">${logo ? TW.logoHtml(B.sel.plataforma, logo) : ""}</span><div><h3>Tu PC</h3><span class="st ${status[0]}">${status[0] === "ok" ? U.check : U.warn}${esc(status[1])}</span></div></div>
        <button type="button" data-reset>Empezar de cero</button>
      </div>
      <div class="b-prog"><div><span>Progreso</span><strong>${pr.done} de ${pr.total} listos</strong></div><i><b style="width:${pr.pct}%"></b></i></div>
      <ul class="sum-list">${rows}</ul>
      <details class="b-compat" open>
        <summary><span>${U.shield} Compatibilidad</span><em>${checks.filter((x) => x.state === "ok").length}/${checks.length}</em></summary>
        <ul>${checks.map((x) => `<li class="${x.state}"><span class="dot">${x.state === "ok" ? U.check : x.state === "bad" ? U.close : ""}</span><span><strong>${esc(x.label)}</strong>${esc(x.txt)}</span></li>`).join("")}</ul>
        ${avisos.map((x) => `<p class="aviso">${U.warn}${esc(x.msg)}</p>`).join("")}
      </details>
      <div class="b-power">
        <div class="row"><span>${U.bolt} Consumo estimado</span><strong>~${pw.est} W</strong></div>
        <i class="${use > 85 ? "hot" : ""}"><b style="width:${use}%"></b></i>
        <small>${cap ? `Tu fuente: ${cap} W · uso ${use}%` : `Fuente recomendada: ${pw.rec} W o más`}</small>
      </div>
      <div class="b-total">
        <div class="row"><span>Total <small>${lines.length} ${lines.length === 1 ? "componente" : "componentes"}</small></span><strong>${TW.money(total)}</strong></div>
        <p class="fine">${U.wrench} Te la entregamos armada y probada</p>
        <button class="btn block" type="button" data-addbuild${okAll ? "" : " disabled"}>${U.cart} Agregar al carrito</button>
        <button class="btn wa block" type="button" data-wabuild${lines.length ? "" : " disabled"}>${U.wa} Consultar esta PC</button>
      </div>`;
  }

  function summaryView() {
    const lines = TW.buildLines(B.sel, data.byId), total = TW.linesTotal(lines);
    const faltan = TW.checkBuild(B.sel, data.byId).filter((x) => x.level === "falta");
    const checks = compatChecks();
    return `
      <div class="b-head"><div class="b-title"><span class="b-ico">${U.cart}</span><div><h2><small>Último paso</small>${faltan.length ? "Casi lista" : "¡Tu PC está lista!"}</h2>
        <p>${faltan.length ? `Te falta elegir: ${faltan.map((x) => esc(TW.stepOf(x.key).label.toLowerCase())).join(", ")}.` : "Revisá los componentes, agregala al carrito y mandanos el pedido por WhatsApp. Incluye armado y prueba."}</p></div></div></div>
      <div class="sum-grid">
        ${lines.length ? `<ul class="comp-list">${lines.map((l) => `
          <li><span class="mini">${TW.thumb(l.p)}</span><span><small>${esc(l.step.label)}</small>${l.qty > 1 ? `${l.qty}x ` : ""}${esc(l.p.titulo)}</span><span class="p">${l.p.precio ? TW.money(l.p.precio * l.qty) : "Consultar"}</span></li>`).join("")}
        </ul>` : `<div class="b-empty">Todavía no elegiste componentes.</div>`}
        <ul class="check-grid">${checks.map((x) => `<li class="${x.state}"><span class="dot">${x.state === "ok" ? U.check : x.state === "bad" ? U.close : ""}</span><span><strong>${esc(x.label)}</strong>${esc(x.txt)}</span></li>`).join("")}</ul>
      </div>
      <div class="modal-price" style="margin-top:1.25rem"><span style="color:var(--muted)">Total</span><span class="price" style="font-size:1.6rem">${TW.money(total)}</span></div>
      <div class="b-nav">
        <button class="btn ghost" type="button" data-goto="${STEPS.length - 1}">${U.back} Volver</button>
        <button class="btn" type="button" data-addbuild${faltan.length ? " disabled" : ""}>${U.cart} Agregar al carrito</button>
      </div>`;
  }

  function refreshSide() { const s = $("#bSide"); if (s) { const open = s.classList.contains("open"); s.innerHTML = sideHtml(); s.classList.toggle("open", open); } }

  function pick(id) {
    const step = STEPS[B.step], p = data.byId[id];
    if (!step || !p) return;
    const list = B.sel[step.key];
    if (step.multi) {
      const at = list.findIndex((c) => c.id === id);
      if (at >= 0) list.splice(at, 1);
      else if (list.length >= step.multi) { toast(`Podés elegir hasta ${step.multi} ${step.label.toLowerCase()}. Quitá uno para sumar otro.`); return; }
      else list.push({ id, qty: 1 });
    } else {
      const prevQty = list[0] && list[0].id === id ? list[0].qty : 1;
      B.sel[step.key] = [{ id, qty: prevQty }];
    }
    const removed = TW.pruneBuild(B.sel, data.byId);
    if (removed.length) toast(`Quitamos ${removed.join(", ")} porque ya no era compatible.`);
    if (!step.multi) { B.step++; B.q = ""; }
    saveBuild(); renderBuilder();
    if (!step.multi) scrollTo({ top: $("#builder").offsetTop - 130, behavior: "smooth" });
  }

  function buildMessage() {
    const lines = TW.buildLines(B.sel, data.byId), total = TW.linesTotal(lines);
    return `Hola ${NEG.nombre}! Armé esta PC en la web y quería consultarles:\n\n` +
      lines.map((l) => `• ${l.step.label}: ${l.qty > 1 ? l.qty + "x " : ""}${l.p.titulo} — ${l.p.precio ? TW.money(l.p.precio * l.qty) : "consultar"}`).join("\n") +
      `\n\nTotal estimado: ${TW.money(total)}\n¿Tienen stock de todo?`;
  }

  /* =========================================================
     CARRITO
     ========================================================= */
  function renderCartCount() {
    const n = TW.cart.count(), el = $("#cartCount");
    el.textContent = n; el.hidden = !n;
  }
  function renderCart() {
    const d = $("#cart");
    const lines = TW.cart.items.map((i) => TW.cartLine(i, data)).filter(Boolean);
    const total = lines.reduce((t, l) => t + l.unit * l.item.qty, 0);
    const note = $("#cartNote") ? $("#cartNote").value : "";
    d.innerHTML = `
      <div class="drawer-head"><h2 id="cartTitle">Tu carrito</h2><button class="close" type="button" aria-label="Cerrar" data-close>${U.close}</button></div>
      <div class="drawer-body">${lines.length ? lines.map((l) => `
        <div class="cart-item">
          <span class="mini">${l.thumb || `<span class="t-bg" style="opacity:.9">${TW.ICONS.Gabinetes}</span>`}</span>
          <div>
            <h4>${esc(l.titulo)}</h4>
            ${l.detalle.length ? `<details><summary>${l.detalle.length} componentes</summary><ul>${l.detalle.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}
            <div class="row">
              <span class="qty"><button type="button" data-cq="${l.item.key}|-1" aria-label="Menos"${l.item.qty <= 1 ? " disabled" : ""}>${U.minus}</button><span>${l.item.qty}</span><button type="button" data-cq="${l.item.key}|1" aria-label="Más">${U.plus}</button></span>
              ${TW.priceHtml(l.unit * l.item.qty)}
              <button class="icon-btn" type="button" data-crm="${l.item.key}" aria-label="Quitar">${U.trash}</button>
            </div>
          </div>
        </div>`).join("") : `
        <div class="cart-empty">${U.cart}<strong>Tu carrito está vacío</strong>Sumá productos del catálogo, una PC armada o la PC que armes a tu medida.<br><a class="btn" href="#/armar" data-close>Armá tu PC</a></div>`}
      </div>
      ${lines.length ? `
      <div class="drawer-foot">
        <div class="row"><span>Total estimado</span><strong>${TW.money(total)}</strong></div>
        <textarea id="cartNote" placeholder="Nota opcional: tu nombre, localidad para el envío, forma de pago…">${esc(note)}</textarea>
        <button class="btn wa block" type="button" data-send>${U.wa} Enviar pedido por WhatsApp</button>
        <p class="fine">Te respondemos para confirmar stock, envío y forma de pago.</p>
        <button class="linkish" type="button" data-clear>Vaciar carrito</button>
      </div>` : ""}`;
  }
  function openCart() { renderCart(); const d = $("#cart"); if (!d.open) d.showModal(); }

  /* =========================================================
     EVENTOS
     ========================================================= */
  function bindEvents() {
    addEventListener("hashchange", route);
    document.addEventListener("tw:cart", () => {
      renderCartCount();
      const b = $("#cartBtn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
      if ($("#cart").open) renderCart();
    });
    $("#cartBtn").addEventListener("click", openCart);

    // Buscador del header → catálogo
    const q = $("#q");
    q.addEventListener("input", () => {
      cat.q = q.value;
      if (parseHash().view !== "catalogo") location.hash = "#/catalogo";
      else renderGrid();
    });
    $("#hsearch").addEventListener("submit", (e) => { e.preventDefault(); if (parseHash().view !== "catalogo") location.hash = "#/catalogo"; });

    $("#brand").addEventListener("change", (e) => { cat.brand = e.target.value; renderGrid(); });
    $("#sort").addEventListener("change", (e) => { cat.sort = e.target.value; renderGrid(); });
    $("#subcats").addEventListener("click", (e) => {
      const b = e.target.closest(".sub"); if (!b) return;
      cat.sub = b.dataset.sub; renderSubs(); renderBrands(); renderGrid();
    });
    $("#cats").addEventListener("scroll", updateCatsFade, { passive: true });
    addEventListener("resize", updateCatsFade);

    // Clicks generales (tarjetas, botones de agregar, armador, carrito)
    document.addEventListener("click", (e) => {
      const t = e.target;
      const el = (sel) => t.closest(sel);
      let x;
      if ((x = el("[data-opencart]"))) { openCart(); $("#toast").classList.remove("show"); return; }
      if ((x = el("[data-product]"))) { openProduct(x.dataset.product); return; }
      if ((x = el("[data-add]"))) { TW.cart.add({ type: "producto", id: x.dataset.add }); toast("Producto agregado al carrito", true); $("#modal").close(); return; }
      if ((x = el("[data-addpc]"))) { TW.cart.add({ type: "pc", id: x.dataset.addpc }); toast("PC agregada al carrito", true); if ($("#modal").open) $("#modal").close(); return; }
      if ((x = el("[data-pc]"))) { openPc(x.dataset.pc); return; }
      if ((x = el("[data-custom]"))) {
        const pc = data.pcs.find((p) => p.id === x.dataset.custom);
        if (pc) { B.sel = TW.buildFromComponents(pc.componentes, data.byId); B.step = STEPS.length; saveBuild(); }
        $("#modal").close(); location.hash = "#/armar"; renderBuilder(); toast("Cargamos la PC en el armador: cambiá lo que quieras");
        return;
      }
      if ((x = el("#reset"))) { Object.assign(cat, { q: "", sub: "", brand: "" }); $("#q").value = ""; location.hash = "#/catalogo"; renderCatalog(); return; }

      // Armador
      if ((x = el("[data-plat]"))) { B.sel = TW.emptyBuild(); B.sel.plataforma = x.dataset.plat; B.step = 0; saveBuild(); renderBuilder(); return; }
      if ((x = el("[data-goto]"))) { B.step = Number(x.dataset.goto); B.q = ""; saveBuild(); renderBuilder(); $("#bSide")?.classList.remove("open"); return; }
      if ((x = el("[data-pick]"))) { pick(x.dataset.pick); return; }
      if ((x = el("[data-skip]"))) { B.sel[x.dataset.skip] = []; B.step++; B.q = ""; saveBuild(); renderBuilder(); return; }
      if ((x = el("[data-rm]"))) {
        const [key, id] = x.dataset.rm.split("|");
        B.sel[key] = B.sel[key].filter((c) => c.id !== id);
        TW.pruneBuild(B.sel, data.byId); saveBuild(); renderBuilder(); return;
      }
      if ((x = el("[data-q]"))) {
        const [key, id, d] = x.dataset.q.split("|");
        const c = B.sel[key].find((c) => c.id === id), max = TW.stepOf(key).maxQty || 1;
        if (c) c.qty = Math.max(1, Math.min(max, c.qty + Number(d)));
        saveBuild(); refreshSide(); return;
      }
      if ((x = el("[data-reset]"))) {
        if (confirm("¿Empezar de cero? Se borran los componentes elegidos.")) { B.sel = TW.emptyBuild(); B.step = 0; saveBuild(); renderBuilder(); }
        return;
      }
      if ((x = el("[data-toggle-side]"))) { $("#bSide").classList.toggle("open"); return; }
      if ((x = el("[data-addbuild]"))) {
        const lines = TW.buildLines(B.sel, data.byId);
        TW.cart.add({ type: "armado", nombre: `PC armada a medida (${B.sel.plataforma})`, comps: lines.map((l) => ({ id: l.p.id, qty: l.qty })) });
        toast("Tu PC se agregó al carrito", true); return;
      }
      if ((x = el("[data-wabuild]"))) { window.open(TW.waLink(buildMessage()), "_blank", "noopener"); return; }

      // Carrito
      if ((x = el("[data-cq]"))) { const [k, d] = x.dataset.cq.split("|"); const it = TW.cart.items.find((i) => i.key === k); if (it) TW.cart.setQty(k, it.qty + Number(d)); return; }
      if ((x = el("[data-crm]"))) { TW.cart.remove(x.dataset.crm); return; }
      if ((x = el("[data-clear]"))) { if (confirm("¿Vaciar el carrito?")) TW.cart.clear(); return; }
      if ((x = el("[data-send]"))) { window.open(TW.waLink(TW.cartMessage(data, $("#cartNote")?.value)), "_blank", "noopener"); return; }

      // Cerrar diálogos
      if ((x = el("[data-close]"))) { x.closest("dialog")?.close(); return; }
      if (t.tagName === "DIALOG") t.close(); // click en el fondo
    });

    // Buscador y orden del armador (sin redibujar todo)
    document.addEventListener("input", (e) => { if (e.target.id === "bq") { B.q = e.target.value; renderOptions(); } });
    document.addEventListener("change", (e) => { if (e.target.id === "bsort") { B.sort = e.target.value; saveBuild(); renderOptions(); } });
  }

  /* ---------- Inicio ---------- */
  async function init() {
    setupStatic();
    bindEvents();
    TW.cart.load(); renderCartCount();
    try {
      data = await TW.loadData();
    } catch (err) {
      console.error(err);
      $("main").insertAdjacentHTML("afterbegin", `<div class="wrap"><div class="empty" style="margin:2rem 0"><strong>No pudimos cargar los productos</strong>Probá recargar la página o escribinos por WhatsApp.</div></div>`);
    }
    TW.pruneBuild(B.sel, data.byId);
    route();
  }
  init();
})();
