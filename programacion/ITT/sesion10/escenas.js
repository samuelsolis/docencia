/* ==========================================================================
   Sesión 9 · Binary. Las filas de bits se generan aquí y cada escena pinta su
   estado según el beat. El número de ejemplo es el 45 = 101101 (TAM = 6),
   el mismo de las capturas del juego.
   ========================================================================== */

(function () {
  "use strict";

  const TAM = 6;
  const BITS = [1, 0, 1, 1, 0, 1];                          // 45
  const PESOS = BITS.map((_, pos) => 2 ** (TAM - 1 - pos)); // 32 16 8 4 2 1
  const PROD = BITS.map((b, i) => b * PESOS[i]);

  document.querySelectorAll(".vec").forEach((vec) => {
    const n = vec.dataset.nombre;
    let celdas = "";
    for (let i = 0; i < TAM; i++) {
      celdas += `<div class="celda" style="--i:${i}"><span class="apodo"></span>` +
        `<span class="val"></span><span class="idx">${n}[${i}]</span></div>`;
    }
    vec.innerHTML = `<span class="vec-nombre">${n}</span><div class="celdas">${celdas}</div>`;
  });

  const celdas = (vec) => [...vec.querySelectorAll(".celda")];
  function pon(vec, i, valor, animado) {
    const val = celdas(vec)[i].querySelector(".val");
    val.textContent = valor === null ? "" : valor;
    val.classList.remove("nuevo");
    if (animado) { void val.offsetWidth; val.classList.add("nuevo"); }
  }
  const todos = (vec, valores) => valores.forEach((x, i) => pon(vec, i, x));
  function marca(vec, ...posiciones) {
    celdas(vec).forEach((c, i) => c.classList.toggle("marca", posiciones.includes(i)));
  }

  /* ---- 5 · vector -------------------------------------------------------- */
  Charla.escena("vector", (ctx) => todos(ctx.el.querySelector("#vec-bits"), BITS));

  /* ---- 6 · de binario a decimal ----------------------------------------- */
  const textoSuma = (hasta) => {
    const sumandos = PROD.slice(0, hasta + 1);
    const total = sumandos.reduce((a, b) => a + b, 0);
    return `suma = ${sumandos.join(" + ")} = <b>${total}</b>`;
  };
  Charla.escena("decimal", async (ctx) => {
    const v = ctx.el.querySelector("#vec-dec");
    const p = ctx.el.querySelector("#vec-prod");
    const suma = ctx.el.querySelector("#suma-dec");
    todos(v, BITS);
    celdas(v).forEach((c, i) => { c.querySelector(".apodo").textContent = PESOS[i]; });
    todos(p, PROD);
    marca(v); marca(p);
    suma.innerHTML = textoSuma(TAM - 1);
    if (ctx.beat !== 3 || !ctx.animar) return;

    suma.innerHTML = "suma = 0";
    for (let i = 0; i < TAM; i++) {
      marca(v, i); marca(p, i);
      await Charla.esperar(i < 2 ? 900 : 600);
      if (!ctx.vigente()) return;
      suma.innerHTML = textoSuma(i);
      await Charla.esperar(i < 2 ? 700 : 450);
      if (!ctx.vigente()) return;
    }
    marca(v); marca(p);
  });

  /* ---- 9 · bucle: color según la biblioteca ------------------------------ */
  const DE_VECTOR = new Set(["iniciarVector", "ponerValorEnVector", "obtenerValorDeVector",
    "pesoDePosicion", "calcularValorDeVector", "esCorrectoElNumero"]);
  const DE_ENTORNO = new Set(["entornoLeerEvento", "entornoTipoEvento", "entornoBitEvento",
    "entornoMarcarPosicion", "entornoPonerBit"]);
  Charla.escena("bucle", (ctx) => {
    ctx.el.querySelectorAll("pre.codigo .c-fun").forEach((s) => {
      s.classList.toggle("lib-vec", DE_VECTOR.has(s.textContent));
      s.classList.toggle("lib-ent", DE_ENTORNO.has(s.textContent));
    });
  });

  /* ---- 12 · criba -------------------------------------------------------- */
  const LIMITE = 20;
  const NUMS = Array.from({ length: LIMITE - 1 }, (_, k) => k + 2);
  const multiplos = (p) => NUMS.filter((n) => n > p && n % p === 0);
  const PRIMOS = NUMS.filter((n) => NUMS.every((d) => d >= n || n % d !== 0));
  const criba = document.getElementById("criba");
  criba.innerHTML = NUMS.map((n) => `<div class="cn" data-n="${n}">${n}</div>`).join("");
  const casilla = (n) => criba.querySelector(`[data-n="${n}"]`);

  Charla.escena("criba", async (ctx) => {
    const txt = ctx.el.querySelector("#criba-txt");
    const pasos = ctx.beat >= 3 ? [2, 3] : ctx.beat >= 2 ? [2] : [];
    const tachados = new Set(pasos.flatMap(multiplos));
    const primos = ctx.beat >= 4 ? PRIMOS : pasos;
    criba.querySelectorAll(".cn").forEach((c) => {
      const n = Number(c.dataset.n);
      c.classList.toggle("tachado", tachados.has(n));
      c.classList.toggle("primo", primos.includes(n));
      c.classList.remove("pisa");
    });
    txt.innerHTML = { 1: "del 2 al 20", 2: "2 es primo → se tachan 4, 6, 8…",
      3: "3 es primo → se tachan 6, 9, 12…", 4: `primos: <b>${PRIMOS.join(", ")}</b>` }[ctx.beat];
    if (!ctx.animar || (ctx.beat !== 2 && ctx.beat !== 3)) return;

    const p = ctx.beat === 2 ? 2 : 3;
    multiplos(p).forEach((n) => { if (p === 2 || n % 2 !== 0) casilla(n).classList.remove("tachado"); });
    for (const n of multiplos(p)) {
      const c = casilla(n);
      c.classList.add("pisa");
      await Charla.esperar(380);
      if (!ctx.vigente()) return;
      c.classList.remove("pisa");
      c.classList.add("tachado");
    }
  });
})();
