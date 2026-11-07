/* ==========================================================================
   Motor de presentaciones por beats: escenas y beats.

   Un clic = un beat. El estado completo es { escena, beat } y vive en la URL
   (#3.2 = escena 3, beat 2), así que cualquier beat se reconstruye igual
   llegando hacia delante, hacia atrás, saltando o recargando.

   Atributos que entiende el motor (beats numerados desde 1):

     data-in="3"            visible a partir del beat 3
     data-out="5"           oculto a partir del beat 5
     data-on="3:clase"      añade "clase" a partir del beat 3
     data-on="3-4:clase"    añade "clase" solo en los beats 3 y 4
                            (varias reglas separadas por espacios)
     data-foco="2:1-3 4:5"  en un <pre class="codigo">: resalta líneas
                            (beat 2 → líneas 1 a 3; beat 4 → línea 5)
     data-beats="8"         en una escena: fuerza el número de beats
     data-fuera             en una escena: aparcada (sigue en el HTML, no cuenta ni se ve)

   Notas para el presentador: <aside class="nota" data-beat="2">…</aside>

   Animaciones a medida: Charla.escena("id", ctx => { … }) se llama cada vez
   que se pinta esa escena. ctx = { el, beat, anterior, animar, vigente() }.
   Con animar = false hay que pintar el estado final sin transición.
   ========================================================================== */

(function () {
  "use strict";

  const params = new URLSearchParams(location.search);
  const VISTA = params.get("vista") || "principal";          // principal | presentador | miniatura
  const CAPTURA = params.has("captura") || VISTA === "miniatura";
  const REDUCIDO = params.has("reducido");

  const ganchos = {};
  let escenas = [];
  let estado = { escena: 0, beat: 1 };
  let generacion = 0;

  window.Charla = {
    escena(id, fn) { ganchos[id] = fn; },
    get estado() { return { ...estado }; },
    ir,
  };

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */

  // Generador pseudoaleatorio con semilla: mismo resultado en cada carga.
  Charla.azar = function (semilla) {
    let a = semilla >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  Charla.esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  Charla.numero = (n, decimales = 0) =>
    n.toLocaleString("es-ES", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

  function rango(texto) {
    const [a, b] = String(texto).split("-").map(Number);
    return [a, Number.isFinite(b) ? b : Infinity];
  }

  /* ------------------------------------------------------------------------
     Resaltado de código (mínimo: JS y Python)
     ------------------------------------------------------------------------ */

  const PALABRAS = new Set(("function return for if else var " +
    "var const let new await async def import from in and or not True False None int void typedef bool float").split(" "));

  function escapar(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function resaltar(codigo) {
    const re = /(\/\/[^\n]*|#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\$[A-Za-z_]\w*|\b\d+(?:[.,]\d+)?\b|\b[A-Za-z_]\w*(?=\s*\()|\b[A-Za-z_]\w*\b)/g;
    let salida = "";
    let ultimo = 0;
    codigo.replace(re, (m, _g, pos) => {
      salida += escapar(codigo.slice(ultimo, pos));
      let clase = null;
      if (m.startsWith("//") || m.startsWith("#")) clase = "c-com";
      else if (m[0] === '"' || m[0] === "'") clase = "c-cad";
      else if (m[0] === "$") clase = "c-var";
      else if (/^\d/.test(m)) clase = "c-num";
      else if (PALABRAS.has(m)) clase = "c-pal";
      else if (/\(/.test(codigo.slice(pos + m.length, pos + m.length + 2).trim()[0] || "")) clase = "c-fun";
      salida += clase ? `<span class="${clase}">${escapar(m)}</span>` : escapar(m);
      ultimo = pos + m.length;
      return m;
    });
    salida += escapar(codigo.slice(ultimo));
    return salida;
  }

  function prepararCodigo(raiz) {
    raiz.querySelectorAll("pre.codigo").forEach((pre) => {
      const crudo = pre.textContent.replace(/^\n/, "").replace(/\s+$/, "");
      const html = resaltar(crudo).split("\n")
        .map((l) => `<span class="linea">${l || " "}</span>`).join("");
      pre.innerHTML = html;
    });
  }

  /* ------------------------------------------------------------------------
     Escenas
     ------------------------------------------------------------------------ */

  function contarBeats(sec) {
    let max = Number(sec.dataset.beats) || 1;
    sec.querySelectorAll("[data-in],[data-out],[data-on],[data-foco],.nota[data-beat]").forEach((el) => {
      if (el.dataset.in) max = Math.max(max, Number(el.dataset.in));
      if (el.dataset.out) max = Math.max(max, Number(el.dataset.out) - 1);
      if (el.dataset.beat) max = Math.max(max, Number(el.dataset.beat));
      for (const regla of (el.dataset.on || "").split(/\s+/).filter(Boolean)) {
        const [a, b] = rango(regla.split(":")[0]);
        max = Math.max(max, a, Number.isFinite(b) ? b : 0);
      }
      for (const regla of (el.dataset.foco || "").split(/\s+/).filter(Boolean)) {
        max = Math.max(max, rango(regla.split(":")[0])[0]);
      }
    });
    return max;
  }

  function pintarEscena(sec, beat) {
    sec.querySelectorAll("[data-in],[data-out]").forEach((el) => {
      const desde = Number(el.dataset.in || 1);
      const hasta = Number(el.dataset.out || Infinity);
      el.classList.toggle("oculto", !(beat >= desde && beat < hasta));
    });

    sec.querySelectorAll("[data-on]").forEach((el) => {
      const activas = new Set();
      const todas = new Set();
      for (const regla of el.dataset.on.split(/\s+/).filter(Boolean)) {
        const [r, clase] = regla.split(":");
        const [a, b] = rango(r);
        todas.add(clase);
        if (beat >= a && beat <= b) activas.add(clase);
      }
      todas.forEach((c) => el.classList.toggle(c, activas.has(c)));
    });

    sec.querySelectorAll("pre.codigo[data-foco]").forEach((pre) => {
      let lineas = null;
      for (const regla of pre.dataset.foco.split(/\s+/).filter(Boolean)) {
        const [r, ls] = regla.split(":");
        const [a, b] = rango(r);
        if (beat >= a && beat <= b) lineas = ls;
      }
      const filas = pre.querySelectorAll(".linea");
      pre.classList.toggle("con-foco", !!lineas);
      const elegidas = new Set();
      if (lineas) {
        for (const parte of lineas.split(",")) {
          const [x, y] = rango(parte);
          for (let i = x; i <= (Number.isFinite(y) ? y : x); i++) elegidas.add(i);
        }
      }
      filas.forEach((f, i) => f.classList.toggle("foco", elegidas.has(i + 1)));
    });
  }

  /* ------------------------------------------------------------------------
     Navegación
     ------------------------------------------------------------------------ */

  function ir(escena, beat, opciones = {}) {
    escena = Math.max(0, Math.min(escenas.length - 1, escena));
    const total = escenas[escena].beats;
    beat = Math.max(1, Math.min(total, beat));

    const anterior = { ...estado };
    const mismaEscena = anterior.escena === escena;
    const animar = !CAPTURA && !REDUCIDO && !opciones.sinAnimar &&
      ((mismaEscena && beat === anterior.beat + 1) || (!mismaEscena && beat === 1 && escena === anterior.escena + 1));

    estado = { escena, beat };
    const gen = ++generacion;

    escenas.forEach((e, i) => e.el.classList.toggle("activa", i === escena));
    const actual = escenas[escena];
    if (mismaEscena) pintarEscena(actual.el, beat);
    else {
      // Al entrar en otra escena, sus piezas ya están en su sitio: solo se funde la escena.
      actual.el.classList.add("sin-transicion");
      pintarEscena(actual.el, beat);
      void actual.el.offsetWidth;
      actual.el.classList.remove("sin-transicion");
    }

    const gancho = ganchos[actual.el.dataset.id];
    if (gancho) {
      try {
        gancho({
          el: actual.el,
          beat,
          anterior: mismaEscena ? anterior.beat : null,
          animar,
          vigente: () => gen === generacion,
        });
      } catch (err) { console.error(err); }
    }

    actualizarProgreso();

    const hash = `#${escena + 1}.${beat}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);

    if (!opciones.remoto) emitir();
  }

  function siguiente() {
    const { escena, beat } = estado;
    if (beat < escenas[escena].beats) ir(escena, beat + 1);
    else if (escena < escenas.length - 1) ir(escena + 1, 1);
  }

  function anterior() {
    const { escena, beat } = estado;
    if (beat > 1) ir(escena, beat - 1);
    else if (escena > 0) ir(escena - 1, escenas[escena - 1].beats);
  }

  function leerHash() {
    const m = location.hash.match(/^#(\d+)(?:\.(\d+))?/);
    if (!m) return { escena: 0, beat: 1 };
    return { escena: Number(m[1]) - 1, beat: Number(m[2] || 1) };
  }

  /* ------------------------------------------------------------------------
     Progreso
     ------------------------------------------------------------------------ */

  function actualizarProgreso() {
    const barra = document.getElementById("progreso");
    if (!barra) return;
    let total = 0, hecho = 0;
    escenas.forEach((e, i) => {
      total += e.beats;
      if (i < estado.escena) hecho += e.beats;
    });
    hecho += estado.beat;
    barra.style.width = `${(hecho / total) * 100}%`;
  }

  /* ------------------------------------------------------------------------
     Escalado del escenario
     ------------------------------------------------------------------------ */

  function escalar() {
    const esc = document.getElementById("escenario");
    const f = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    esc.style.transform = `scale(${f})`;
  }

  /* ------------------------------------------------------------------------
     Sincronización con la ventana del presentador
     ------------------------------------------------------------------------ */

  let canal = null;
  try { canal = new BroadcastChannel("beats:" + location.pathname.replace(/[^/]*$/, "")); } catch (e) { canal = null; }
  let ventanaPresentador = null;

  function mensajeEstado() {
    const actual = escenas[estado.escena];
    return {
      tipo: "estado",
      escena: estado.escena,
      beat: estado.beat,
      titulo: actual.el.dataset.titulo || "",
      beats: actual.beats,
      totalEscenas: escenas.length,
      nota: nota(estado.escena, estado.beat),
      notaSiguiente: notaSiguiente(),
    };
  }

  function nota(e, b) {
    const n = escenas[e]?.el.querySelector(`.nota[data-beat="${b}"]`);
    return n ? n.innerHTML.trim() : "";
  }

  function notaSiguiente() {
    const { escena, beat } = estado;
    if (beat < escenas[escena].beats) return nota(escena, beat + 1);
    if (escena < escenas.length - 1) return nota(escena + 1, 1);
    return "";
  }

  function emitir() {
    if (VISTA !== "principal") return;
    const m = mensajeEstado();
    try { canal?.postMessage(m); } catch (e) { /* nada */ }
    try { ventanaPresentador?.postMessage(m, "*"); } catch (e) { /* nada */ }
    try { if (window.opener && window.opener !== window) window.opener.postMessage(m, "*"); } catch (e) { /* nada */ }
  }

  // Las órdenes llegan a la vez por BroadcastChannel y por postMessage: se atienden una sola vez.
  const atendidas = new Set();

  function recibir(m) {
    if (!m || typeof m !== "object") return;
    if (VISTA !== "principal") return;
    if (m.tipo === "orden") {
      if (m.id) {
        if (atendidas.has(m.id)) return;
        atendidas.add(m.id);
      }
      if (m.orden === "siguiente") siguiente();
      else if (m.orden === "anterior") anterior();
      else if (m.orden === "estado") emitir();
      else if (m.orden === "ir") ir(m.escena, m.beat);
    }
  }

  if (canal) canal.onmessage = (ev) => recibir(ev.data);
  window.addEventListener("message", (ev) => recibir(ev.data));

  function abrirPresentador() {
    const url = location.pathname.replace(/[^/]*$/, "presentador.html") + location.hash;
    ventanaPresentador = window.open(url, "presentador", "width=1400,height=850");
    setTimeout(emitir, 600);
  }

  /* ------------------------------------------------------------------------
     Vista general, apagón, ayuda
     ------------------------------------------------------------------------ */

  function alternarGeneral(forzar) {
    const g = document.getElementById("general");
    const activo = forzar ?? !g.classList.contains("activo");
    if (activo) {
      g.innerHTML = "<h2>Escenas · clic para saltar · O para cerrar</h2><ol></ol>";
      const ol = g.querySelector("ol");
      escenas.forEach((e, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<b>${i + 1}. ${e.el.dataset.titulo || ""}</b><span>${e.beats} beats</span>`;
        if (i === estado.escena) li.classList.add("actual");
        li.onclick = (ev) => { ev.stopPropagation(); alternarGeneral(false); ir(i, 1, { sinAnimar: true }); };
        ol.appendChild(li);
      });
    }
    g.classList.toggle("activo", activo);
  }

  let temporizadorAyuda = null;
  function mostrarAyuda() {
    const a = document.getElementById("ayuda");
    if (!a) return;
    a.classList.add("visible");
    clearTimeout(temporizadorAyuda);
    temporizadorAyuda = setTimeout(() => a.classList.remove("visible"), 3500);
  }

  /* ------------------------------------------------------------------------
     Teclado y ratón
     ------------------------------------------------------------------------ */

  function teclado(ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const k = ev.key;
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) { ev.preventDefault(); siguiente(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { ev.preventDefault(); anterior(); }
    else if (k === "Home") ir(0, 1, { sinAnimar: true });
    else if (k === "End") ir(escenas.length - 1, escenas[escenas.length - 1].beats, { sinAnimar: true });
    else if (/^[1-9]$/.test(k)) ir(Number(k) - 1, 1, { sinAnimar: true });
    else if (k === "0") ir(9, 1, { sinAnimar: true });
    else if (k === "f" || k === "F") {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
    }
    else if (k === "o" || k === "O") alternarGeneral();
    else if (k === "b" || k === "B" || k === ".") document.getElementById("apagon").classList.toggle("activo");
    else if (k === "p" || k === "P") abrirPresentador();
    else if (k === "Escape") alternarGeneral(false);
    else if (k === "?" || k === "h" || k === "H") mostrarAyuda();
  }

  /* ------------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------------ */

  function arrancar() {
    if (VISTA === "presentador") return; // la vista del presentador vive en presentador.html

    const raiz = document.getElementById("escenario");
    if (CAPTURA || REDUCIDO) document.body.classList.add("sin-movimiento");
    prepararCodigo(raiz);

    // Una escena con data-fuera está aparcada: sigue en el HTML, pero no cuenta ni se ve.
    escenas = [...raiz.querySelectorAll(".escena:not([data-fuera])")].map((el) => ({ el, beats: contarBeats(el) }));

    escalar();
    window.addEventListener("resize", escalar);

    const inicial = leerHash();
    ir(inicial.escena, inicial.beat, { sinAnimar: true });

    window.addEventListener("hashchange", () => {
      const h = leerHash();
      if (h.escena !== estado.escena || h.beat !== estado.beat) ir(h.escena, h.beat, { sinAnimar: true });
    });

    if (VISTA === "miniatura") return;

    document.addEventListener("keydown", teclado);
    raiz.addEventListener("click", (ev) => {
      if (ev.target.closest("a, button")) return;
      siguiente();
    });
    raiz.addEventListener("contextmenu", (ev) => { ev.preventDefault(); anterior(); });
    if (!CAPTURA) mostrarAyuda();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();
})();
