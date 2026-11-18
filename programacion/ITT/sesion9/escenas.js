/* ==========================================================================
   Sesión 9 (ITT): solo la escena de pruebaPertenece necesita un vector.
   Se rellena como en la prueba real del proyecto: v[i] = i.
   ========================================================================== */

(function () {
  "use strict";

  const MAX = 10;

  document.querySelectorAll(".vec").forEach((vec) => {
    const n = vec.dataset.nombre;
    let celdas = "";
    for (let i = 0; i < MAX; i++) {
      celdas += `<div class="celda" style="--i:${i}"><span class="apodo"></span>` +
        `<span class="val">${i}</span><span class="idx">${n}[${i}]</span></div>`;
    }
    vec.innerHTML = `<span class="vec-nombre">${n}</span><div class="celdas">${celdas}</div>`;
  });

  const MARCAS = { 2: [0, 6, MAX - 1] };
  Charla.escena("pertenece", (ctx) => {
    const marcas = MARCAS[ctx.beat] || [];
    ctx.el.querySelectorAll("#vec-pert .celda").forEach((c, i) => c.classList.toggle("marca", marcas.includes(i)));
  });
})();
