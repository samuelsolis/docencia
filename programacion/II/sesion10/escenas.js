/* ==========================================================================
   Sesión 10 (II): matrices.
   - "dimensiones": 27 celdas que se recolocan en cada beat
     (vector → 3 vectores → vector de vectores → matriz → 3 matrices → cubo).
   - "patrones": la rejilla de 9×9 y las miniaturas se calculan aquí con las
     mismas condiciones que tendrían las soluciones; en pantalla no se ven.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------- vectores de vectores ---------------- */

  const N = 3;
  const VALORES = [
    [[4, 8, 1], [2, 9, 5], [6, 3, 7]],   // m (filas: a, b, c)
    [[1, 0, 3], [5, 2, 8], [9, 4, 6]],   // n
    [[3, 7, 2], [0, 1, 4], [8, 5, 9]],   // p
  ];
  const mundo = document.getElementById("mundo");
  const celdas = [];   // celdas[k][f][c]
  for (let k = 0; k < N; k++) {
    celdas.push([]);
    for (let f = 0; f < N; f++) {
      celdas[k].push([]);
      for (let c = 0; c < N; c++) {
        const d = document.createElement("div");
        d.className = "c3";
        d.textContent = VALORES[k][f][c];
        mundo.appendChild(d);
        celdas[k][f].push(d);
      }
    }
  }
  function crear(clase, texto) {
    const d = document.createElement("div");
    d.className = clase;
    if (texto) d.textContent = texto;
    mundo.appendChild(d);
    return d;
  }
  const marcosM = [0, 1, 2].map(() => crear("marco3"));
  const marcosC = [0, 1, 2].map(() => crear("marco3"));
  const nomVec = ["a", "b", "c"].map((t) => crear("rot3", t));
  const nomM = crear("rot3", "m");
  const rotM = [0, 1, 2].map((k) => crear("rot3", `m[${k}]`));
  const rotFila = [0, 1, 2].map((k) => crear("rot3 gris", `fila ${k}`));
  const rotCol = [0, 1, 2].map((k) => crear("rot3 gris", `col ${k}`));
  const nomMat = ["m", "n", "p"].map((t) => crear("rot3", t));
  const nomC = crear("rot3", "c");
  const rotC = [0, 1, 2].map((k) => crear("rot3", `c[${k}]`));
  const rotCapa = [0, 1, 2].map((k) => crear("rot3 gris", `capa ${k}`));

  function pon(el, x, y, w, h, visible = true) {
    el.style.left = x + "px";
    el.style.top = y + "px";
    if (w != null) el.style.width = w + "px";
    if (h != null) el.style.height = h + "px";
    el.classList.toggle("oc", !visible);
  }
  const ocultar = (lista) => lista.forEach((el) => el.classList.add("oc"));

  // una matriz k con celdas de lado s y esquina (x, y); dx/dy separan las filas (vectores sueltos)
  function matriz(k, x, y, s, visible = true) {
    for (let f = 0; f < N; f++)
      for (let c = 0; c < N; c++) {
        const el = celdas[k][f][c];
        pon(el, x + c * (s - 2), y + f * (s - 2), s, s, visible);
        el.style.fontSize = Math.round(s * 0.44) + "px";
      }
  }
  // fila f de la matriz 0 como vector suelto en (x, y)
  function vector(f, x, y, s = 100, visible = true) {
    for (let c = 0; c < N; c++) {
      const el = celdas[0][f][c];
      pon(el, x + c * (s - 2), y, s, s, visible);
      el.style.fontSize = Math.round(s * 0.44) + "px";
    }
  }

  Charla.escena("dimensiones", (ctx) => {
    const b = ctx.beat;
    ocultar([...marcosM, ...marcosC, ...nomVec, nomM, ...rotM, ...rotFila, ...rotCol, ...nomMat, nomC, ...rotC, ...rotCapa]);
    celdas.flat(2).forEach((el) => { el.classList.remove("fila-on", "diana", "capa1", "capa2"); el.style.zIndex = ""; });
    celdas[0][1][2].textContent = b >= 6 ? 7 : VALORES[0][1][2];

    if (b <= 2) {
      // b1: solo a, en el centro; b2: a, b y c sueltos
      const xs = b === 1 ? [810, 810, 810] : [330, 810, 1290];
      for (let f = 0; f < N; f++) {
        vector(f, xs[f], 620, 100, b === 2 || f === 0);
        pon(nomVec[f], xs[f] - 50, 645, null, null, b === 2 || f === 0);
      }
      [1, 2].forEach((k) => matriz(k, 810, 620, 100, false));
    } else if (b === 3) {
      // m: un vector horizontal de 3 casillas; cada casilla, un vector
      for (let k = 0; k < N; k++) {
        pon(marcosM[k], 420 + 360 * k, 585, 360, 170);
        vector(k, 420 + 360 * k + 31, 620);
        pon(rotM[k], 420 + 360 * k + 140, 770);
      }
      pon(nomM, 360, 645);
      [1, 2].forEach((k) => matriz(k, 810, 620, 100, false));
    } else if (b === 4) {
      // las casillas de m, una debajo de otra
      for (let k = 0; k < N; k++) {
        pon(marcosM[k], 780, 420 + 160 * k, 360, 160);
        vector(k, 811, 450 + 160 * k);
        pon(rotM[k], 650, 475 + 160 * k);
      }
      [1, 2].forEach((k) => matriz(k, 810, 520, 100, false));
    } else if (b <= 6) {
      // la matriz
      matriz(0, 811, 500, 100);
      for (let k = 0; k < N; k++) {
        pon(rotFila[k], 680, 532 + 98 * k);
        pon(rotCol[k], 811 + 98 * k + 10, 450);
      }
      if (b === 6) {
        celdas[0][1].forEach((el) => el.classList.add("fila-on"));
        celdas[0][1][2].classList.add("diana");
      }
      [1, 2].forEach((k) => matriz(k, 811, 500, 100, false));
    } else if (b === 7) {
      // tres matrices sueltas
      const xs = [495, 855, 1215];
      for (let k = 0; k < N; k++) {
        matriz(k, xs[k], 580, 72);
        pon(nomMat[k], xs[k] + 90, 525);
      }
    } else if (b === 8) {
      // c: un vector de matrices
      for (let k = 0; k < N; k++) {
        pon(marcosC[k], 525 + 290 * k, 540, 290, 290);
        matriz(k, 525 + 290 * k + 43, 580, 72);
        pon(rotC[k], 525 + 290 * k + 110, 845);
      }
      pon(nomC, 470, 660);
    } else {
      // el cubo: las matrices, apiladas en profundidad
      for (let k = N - 1; k >= 0; k--) {
        const x = 800 + 80 * k, y = 640 - 80 * k;
        matriz(k, x, y, 90);
        celdas[k].flat().forEach((el) => {
          el.style.zIndex = 30 - 10 * k;
          if (k) el.classList.add("capa" + k);
        });
        pon(rotCapa[k], x - 140, y + 30, 120);
      }
    }
  });

  /* ---------------- patrones ---------------- */

  const MAX = 9;
  const RGB = ["#ffffff", "rgb(255,0,0)", "#000000", "rgb(200,200,50)", "rgb(0,100,0)", "rgb(20,105,216)", "rgb(200,200,200)"];
  const [BLANCO, ROJO, NEGRO, AMARILLO, VERDE, AZUL, GRIS] = [0, 1, 2, 3, 4, 5, 6];

  // mismos colores que usa el main del proyecto
  const PATRONES = [
    ["damero", ROJO, VERDE, (f, c) => (f + c) % 2 === 0],
    ["corona", AZUL, AMARILLO, (f, c) => f === 0 || c === 0 || f === MAX - 1 || c === MAX - 1],
    ["diagonales", GRIS, NEGRO, (f, c) => f === c || f + c === MAX - 1],
    ["cruz", ROJO, AZUL, (f, c) => f === (MAX - 1) / 2 || c === (MAX - 1) / 2],
    ["lineasH", VERDE, ROJO, (f) => f % 2 === 0],
    ["lineasV", ROJO, GRIS, (f, c) => c % 2 === 0],
    ["triangulo_sup_izq", AMARILLO, VERDE, (f, c) => f + c <= MAX - 1],
    ["triangulo_sup_der", AZUL, VERDE, (f, c) => c >= f],
  ];

  const minis = document.getElementById("minis");
  minis.innerHTML = PATRONES.map(([nombre, c1, c2, cond], k) => {
    let rej = "";
    for (let f = 0; f < MAX; f++)
      for (let c = 0; c < MAX; c++) rej += `<i style="background:${RGB[cond(f, c) ? c1 : c2]}"></i>`;
    return `<figure class="mini" style="--k:${k};margin:0"><div class="rej">${rej}</div><figcaption>${nombre}</figcaption></figure>`;
  }).join("");

  const tablero = document.getElementById("tablero");
  tablero.innerHTML = "<i></i>".repeat(MAX * MAX);
  const casillas = [...tablero.children];
  const msg = document.getElementById("msg-tablero");

  Charla.escena("patrones", (ctx) => {
    const b = ctx.beat;
    const rellenar = b >= 2;
    const animar = ctx.animar && b === 2 && ctx.anterior === 1;
    casillas.forEach((el, i) => {
      const f = Math.floor(i / MAX);
      el.style.transitionDelay = animar ? i * 22 + "ms" : "0ms";
      el.style.background = rellenar ? RGB[f === 0 ? NEGRO : GRIS] : "#e9e9e9";
    });
    msg.textContent = rellenar ? "Fila 0" : "";
    minis.classList.toggle("ver", b >= 4);
  });
})();
