/* ==========================================================================
   Sesión 8 (ITT): las filas de celdas se generan aquí y cada escena pinta su
   estado según el beat. El vector evoluciona como en un programa real: v del
   guion → asignaciones de la escena 4 → iniciarAleatorio.
   ========================================================================== */

(function () {
  "use strict";

  const V_GUION = [5, 6, 0, -30, 42, 10, 66, 50, 273, 75];   // figura del guion de la sesión 7
  const V_TRAS_ACCESO = [7, 6, 0, 12, 42, 10, 66, 50, 273, 75];
  const W = [12, 4, 30, 8, 1, 9, 25, 3, 7, 40];              // ejemplo
  const azar = Charla.azar(8);
  const V_ALEATORIO = V_GUION.map(() => Math.floor(azar() * 10)); // como rand() % 10
  const MAX = 10;
  const CELDA = 140, X0 = 210;

  // Dónde está cada caja antes de agruparse (coordenadas del escenario).
  const SUELTAS = [[240, 230], [560, 420], [830, 210], [1120, 300], [1480, 220],
                   [200, 520], [720, 600], [1000, 510], [1320, 560], [1620, 430]];

  document.querySelectorAll(".vec").forEach((vec) => {
    const n = vec.dataset.nombre;
    let celdas = "";
    for (let i = 0; i < MAX; i++) {
      const [x, y] = SUELTAS[i];
      celdas += `<div class="celda" style="--i:${i};--dx:${x - (X0 + CELDA * i)}px;--dy:${y - 500}px">` +
        `<span class="apodo">x${i}</span><span class="val"></span><span class="idx">${n}[${i}]</span></div>`;
    }
    vec.innerHTML = `<span class="vec-nombre">${n}</span><div class="celdas">${celdas}</div>`;
  });

  const celdas = (vec) => [...vec.querySelectorAll(".celda")];

  function pon(vec, i, valor, animado) {
    const val = celdas(vec)[i].querySelector(".val");
    val.textContent = valor === null ? "" : valor;
    val.classList.toggle("vacio", valor === "?");
    val.classList.remove("nuevo");
    if (animado) { void val.offsetWidth; val.classList.add("nuevo"); }
  }
  const todos = (vec, valores) => valores.forEach((x, i) => pon(vec, i, x));
  const interrogantes = () => Array(MAX).fill("?");
  function marca(vec, ...posiciones) {
    celdas(vec).forEach((c, i) => c.classList.toggle("marca", posiciones.includes(i)));
  }
  function foco(pre, ...lineas) {
    pre.classList.toggle("con-foco", lineas.length > 0);
    pre.querySelectorAll(".linea").forEach((l, i) => l.classList.toggle("foco", lineas.includes(i + 1)));
  }

  /* ---- 2 · concepto ------------------------------------------------------ */
  Charla.escena("concepto", (ctx) => todos(ctx.el.querySelector("#vec-concepto"), V_GUION));

  /* ---- 3 · definición ---------------------------------------------------- */
  Charla.escena("definicion", (ctx) => {
    const [v, w, z] = ["#vec-def", "#vec-def-w", "#vec-def-z"].map((s) => ctx.el.querySelector(s));
    todos(v, ctx.beat >= 3 ? interrogantes() : V_GUION);
    todos(w, interrogantes());
    todos(z, interrogantes());
  });

  /* ---- 4 · acceso -------------------------------------------------------- */
  const MARCAS_ACCESO = { 1: [0], 2: [3], 3: [7], 4: [0, 9, 1], 5: [4] };
  Charla.escena("acceso", async (ctx) => {
    const vec = ctx.el.querySelector("#vec-acceso");
    const valores = [...V_GUION];
    if (ctx.beat >= 1) valores[0] = 7;
    if (ctx.beat >= 2) valores[3] = 12;
    marca(vec, ...MARCAS_ACCESO[ctx.beat]);
    todos(vec, valores);
    if (!ctx.animar) return;
    const cambio = { 1: [0, V_GUION[0], 7], 2: [3, V_GUION[3], 12] }[ctx.beat];
    if (!cambio) return;
    const [i, antes, despues] = cambio;
    pon(vec, i, antes);
    await Charla.esperar(650);
    if (!ctx.vigente()) return;
    pon(vec, i, despues, true);
  });

  /* ---- 5 · lo que no se puede -------------------------------------------- */
  Charla.escena("prohibido", (ctx) => {
    todos(ctx.el.querySelector("#vec-p-v"), V_TRAS_ACCESO);
    todos(ctx.el.querySelector("#vec-p-w"), W);
  });

  /* ---- 6 · memoria -------------------------------------------------------- */
  Charla.escena("memoria", (ctx) => {
    const vec = ctx.el.querySelector("#vec-memoria");
    todos(vec, V_TRAS_ACCESO);
    celdas(vec).forEach((c, i) => { c.querySelector(".apodo").textContent = `+${i * 4}`; });
    marca(vec, ...(ctx.beat === 2 ? [5] : []));
  });

  /* ---- 7 · iniciarAleatorio ---------------------------------------------- */
  Charla.escena("aleatorio", async (ctx) => {
    const vec = ctx.el.querySelector("#vec-aleatorio");
    const pre = ctx.el.querySelector("#cod-aleatorio");
    const ptr = ctx.el.querySelector("#ptr-aleatorio");
    const traza = ctx.el.querySelector("#traza-aleatorio");
    const fin = () => {
      ptr.style.setProperty("--i", MAX);
      traza.innerHTML = "i = 10 → i &lt; MAX es falso → <b>fin del bucle</b>";
      marca(vec); foco(pre);
    };
    if (ctx.beat === 1) { todos(vec, V_TRAS_ACCESO); marca(vec); foco(pre); return; }
    todos(vec, V_ALEATORIO);
    if (!ctx.animar) { fin(); return; }

    todos(vec, V_TRAS_ACCESO);
    for (let i = 0; i < MAX; i++) {
      const lento = i < 3;
      ptr.style.setProperty("--i", i);
      marca(vec, i);
      foco(pre, 3);
      traza.innerHTML = `i = ${i} → i &lt; MAX es cierto`;
      await Charla.esperar(lento ? 700 : 220);
      if (!ctx.vigente()) return;
      foco(pre, 4);
      pon(vec, i, V_ALEATORIO[i], true);
      traza.innerHTML = `v[${i}] = rand() % 10 → <b>${V_ALEATORIO[i]}</b>`;
      await Charla.esperar(lento ? 900 : 300);
      if (!ctx.vigente()) return;
    }
    fin();
  });

  /* ---- 8 · copiar --------------------------------------------------------- */
  const Y_CV = 520, Y_CW = 660;
  function ficha(ctx, texto, i, y) {
    const f = document.createElement("div");
    f.className = "ficha";
    f.textContent = texto;
    f.style.left = `${X0 + CELDA * i}px`;
    f.style.top = `${y}px`;
    ctx.el.appendChild(f);
    return f;
  }

  Charla.escena("copiar", async (ctx) => {
    const v = ctx.el.querySelector("#vec-c-v");
    const w = ctx.el.querySelector("#vec-c-w");
    const pre = ctx.el.querySelector("#cod-copiar");
    const col = ctx.el.querySelector("#col-copiar");
    const traza = ctx.el.querySelector("#traza-copiar");
    ctx.el.querySelectorAll(".ficha").forEach((f) => f.remove());
    todos(v, V_ALEATORIO);
    foco(pre);
    col.style.setProperty("--i", 0);
    if (ctx.beat === 1) { todos(w, interrogantes()); return; }
    todos(w, V_ALEATORIO);
    if (ctx.beat !== 2) return;
    const fin = () => {
      col.style.setProperty("--i", MAX - 1);
      traza.innerHTML = "i = 10 → i &lt; MAX es falso → <b>fin del bucle</b>";
      foco(pre);
    };
    if (!ctx.animar) { fin(); return; }

    todos(w, interrogantes());
    for (let i = 0; i < MAX; i++) {
      const lento = i < 3;
      col.style.setProperty("--i", i);
      foco(pre, 3);
      traza.innerHTML = `i = ${i}`;
      await Charla.esperar(lento ? 600 : 180);
      if (!ctx.vigente()) return;
      foco(pre, 4);
      traza.innerHTML = `w[${i}] = v[${i}] → <b>${V_ALEATORIO[i]}</b>`;
      const f = ficha(ctx, V_ALEATORIO[i], i, Y_CV);
      await f.animate(
        [{ transform: "none" }, { transform: `translateY(${Y_CW - Y_CV}px)` }],
        { duration: lento ? 700 : 260, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }).finished;
      f.remove();
      if (!ctx.vigente()) return;
      pon(w, i, V_ALEATORIO[i], true);
      await Charla.esperar(lento ? 700 : 150);
      if (!ctx.vigente()) return;
    }
    fin();
  });

  /* ---- 11 · ejercicio 2 ------------------------------------------------------- */
  const azarNotas = Charla.azar(26);
  const NOTAS = V_GUION.map(() => Math.floor(azarNotas() * 11)); // como rand() % 11
  Charla.escena("ejercicio2", (ctx) => todos(ctx.el.querySelector("#vec-notas"), NOTAS));
})();
