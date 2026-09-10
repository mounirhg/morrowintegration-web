/* Morrow Integration — el mapa que se ordena.
   El proceso enredado de la portada se queda fijo a la derecha y, a medida que el
   visitante baja por los cinco pasos del método, se dibuja limpio, se tachan los pasos
   que sobran, se disuelve la cola del cuello de botella, se marcan los tramos que se
   automatizan y termina como el roadmap numerado. Sin librerías. Sin JavaScript, la
   portada muestra el mapa enredado y el texto se lee entero. */

(function () {
  'use strict';

  var svg = document.querySelector('.mapa[data-mapa]');
  if (!svg || !('IntersectionObserver' in window) || !window.requestAnimationFrame) { return; }

  var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var estatico = svg.querySelector('.mapa__trazo');
  var capaEnlaces = svg.querySelector('.mapa__enlaces');
  var capaExtras = svg.querySelector('.mapa__extras');
  var pie = document.querySelector('.mapa__pie');
  var textoAuto = svg.getAttribute('data-texto-auto') || 'auto';

  var nodos = {};
  svg.querySelectorAll('.nodo').forEach(function (g) {
    nodos[g.getAttribute('data-id')] = { g: g, txt: g.querySelector('text'), circ: g.querySelector('circle'), x: 0, y: 0 };
  });

  var A = 'start', M = 'middle', E = 'end';

  /* Las seis etapas del mapa. pos: dónde está cada nodo. lab: dónde va su etiqueta
     (dx, dy, anclaje). enlaces: [de, a, tipo]. hv/vh = codo horizontal-vertical o
     vertical-horizontal (el enredo); sin tipo = recto; bucle = arco (teclear dos veces);
     auto = tramo automatizado. */
  var ETAPAS = [
    { // 0 · hoy, como se cuenta en la primera llamada
      pos: { call: [50, 470], wa: [200, 470], note: [120, 330], xls: [340, 200], quote: [260, 290], inv: [440, 330], qb: [520, 120], paid: [610, 430] },
      lab: { call: [-6, 26, A], wa: [10, 18, A], note: [-10, -12, E], xls: [10, -10, A], quote: [-10, 22, E], inv: [10, 24, A], qb: [-10, -12, E], paid: [-10, 26, E] },
      enlaces: [['call', 'wa', 'hv'], ['wa', 'note', 'vh'], ['note', 'xls', 'hv'], ['xls', 'quote', 'vh'], ['quote', 'inv', 'hv'], ['inv', 'qb', 'vh'], ['qb', 'paid', 'hv'], ['qb', 'xls', 'vh']]
    },
    { igual: 0, fuerte: true }, // 1 · la llamada: los mismos pasos, con nombre
    { // 2 · dibujado como funciona de verdad
      pos: { call: [45, 300], wa: [130, 300], note: [215, 300], xls: [300, 300], quote: [385, 300], inv: [470, 300], qb: [555, 300], paid: [640, 300] },
      lab: { call: [0, 28, M], wa: [0, -16, M], note: [0, 28, M], xls: [0, -16, M], quote: [0, 28, M], inv: [0, -16, M], qb: [0, 28, M], paid: [0, -16, M] },
      enlaces: [['call', 'wa'], ['wa', 'note'], ['note', 'xls'], ['xls', 'quote'], ['quote', 'inv'], ['inv', 'qb'], ['qb', 'paid'], ['xls', 'note', 'bucle'], ['qb', 'xls', 'bucle2']],
      cola: 'inv'
    },
    { // 3 · sin los pasos que sobran, sin la cola
      pos: { call: [45, 300], wa: [150, 300], note: [190, 212], xls: [275, 212], quote: [300, 300], inv: [430, 300], qb: [540, 300], paid: [640, 300] },
      lab: { call: [0, 28, M], wa: [0, 28, M], note: [0, -16, M], xls: [0, -16, M], quote: [0, 28, M], inv: [0, 28, M], qb: [0, 28, M], paid: [0, 28, M] },
      enlaces: [['call', 'wa'], ['wa', 'quote'], ['quote', 'inv'], ['inv', 'qb'], ['qb', 'paid']],
      tachados: ['note', 'xls']
    },
    { // 4 · tres tramos automatizados, cada uno comprobado
      pos: { call: [45, 300], wa: [150, 300], note: [190, 212], xls: [275, 212], quote: [300, 300], inv: [430, 300], qb: [540, 300], paid: [640, 300] },
      lab: { call: [0, 32, M], wa: [0, 32, M], note: [0, -16, M], xls: [0, -16, M], quote: [0, 32, M], inv: [0, 32, M], qb: [0, 32, M], paid: [0, 32, M] },
      enlaces: [['call', 'wa'], ['wa', 'quote', 'auto'], ['quote', 'inv'], ['inv', 'qb', 'auto'], ['qb', 'paid', 'auto']],
      ocultos: ['note', 'xls'],
      marcas: 'check'
    },
    { // 5 · el roadmap, en orden
      pos: { call: [45, 300], wa: [150, 300], note: [190, 212], xls: [275, 212], quote: [300, 300], inv: [430, 300], qb: [540, 300], paid: [640, 300] },
      lab: { call: [0, 32, M], wa: [0, 32, M], note: [0, -16, M], xls: [0, -16, M], quote: [0, 32, M], inv: [0, 32, M], qb: [0, 32, M], paid: [0, 32, M] },
      enlaces: [['call', 'wa'], ['wa', 'quote', 'auto'], ['quote', 'inv'], ['inv', 'qb', 'auto'], ['qb', 'paid', 'auto']],
      ocultos: ['note', 'xls'],
      marcas: 'numeros'
    }
  ];

  function resolver(n) {
    var e = ETAPAS[n];
    if (e.igual !== undefined) { var base = ETAPAS[e.igual]; return { pos: base.pos, lab: base.lab, enlaces: base.enlaces, fuerte: e.fuerte }; }
    return e;
  }

  function crear(tag, attrs, padre) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) { el.setAttribute(k, attrs[k]); }
    (padre || capaExtras).appendChild(el);
    return el;
  }

  function trazo(a, b, tipo) {
    var ax = r1(a.x), ay = r1(a.y), bx = r1(b.x), by = r1(b.y);
    if (tipo === 'hv') { return 'M' + ax + ' ' + ay + ' H' + bx + ' V' + by; }
    if (tipo === 'vh') { return 'M' + ax + ' ' + ay + ' V' + by + ' H' + bx; }
    if (tipo === 'bucle') { return 'M' + ax + ' ' + (ay - 7) + ' C' + ax + ' ' + (ay - 64) + ', ' + bx + ' ' + (by - 64) + ', ' + bx + ' ' + (by - 7); }
    if (tipo === 'bucle2') { return 'M' + ax + ' ' + (ay + 7) + ' C' + ax + ' ' + (ay + 88) + ', ' + bx + ' ' + (by + 88) + ', ' + bx + ' ' + (by + 7); }
    return 'M' + ax + ' ' + ay + ' L' + bx + ' ' + by;
  }
  function r1(v) { return Math.round(v * 10) / 10; }

  /* --- enlaces: un <path> por tramo, que entra y sale con transición ------------- */

  var enlaces = {}; // clave -> { el, a, b, tipo }

  function sincronizarEnlaces(lista) {
    var vivos = {};
    lista.forEach(function (l) {
      var tipo = l[2] || 'recto';
      var clave = l[0] + '>' + l[1] + '|' + tipo;
      vivos[clave] = true;
      if (!enlaces[clave]) {
        var el = crear('path', { 'class': 'enlace' + (tipo === 'auto' ? ' enlace--auto' : '') + ' enlace--entra' }, capaEnlaces);
        enlaces[clave] = { el: el, a: l[0], b: l[1], tipo: tipo };
        requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove('enlace--entra'); }); });
      }
    });
    Object.keys(enlaces).forEach(function (clave) {
      if (!vivos[clave]) {
        var e = enlaces[clave];
        e.el.classList.add('enlace--sale');
        delete enlaces[clave];
        setTimeout(function () { if (e.el.parentNode) { e.el.parentNode.removeChild(e.el); } }, reducido ? 0 : 500);
      }
    });
  }

  function redibujarEnlaces() {
    Object.keys(enlaces).forEach(function (clave) {
      var e = enlaces[clave];
      e.el.setAttribute('d', trazo(nodos[e.a], nodos[e.b], e.tipo));
    });
  }

  /* --- extras: la cola, los tachones, las marcas de automatizado, los números ---- */

  function limpiarExtras() { while (capaExtras.firstChild) { capaExtras.removeChild(capaExtras.firstChild); } }

  function aparecer(el) {
    el.classList.add('extra--entra');
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove('extra--entra'); }); });
  }

  function pintarExtras(E) {
    limpiarExtras();
    if (E.cola) {
      /* La cola delante del cuello de botella: cuatro trabajos esperando. */
      var n = nodos[E.cola];
      var g = crear('g', { 'class': 'cola' });
      [46, 35, 25, 16].forEach(function (d, i) { crear('circle', { cx: r1(n.x - d), cy: r1(n.y), r: 3.6 - i * 0.3 }, g); });
      aparecer(g);
    }
    if (E.tachados) {
      E.tachados.forEach(function (id) {
        var n = nodos[id];
        var linea = crear('line', { 'class': 'tachon', x1: r1(n.x - 46), y1: r1(n.y + 14), x2: r1(n.x + 46), y2: r1(n.y - 34) });
        requestAnimationFrame(function () { requestAnimationFrame(function () { linea.classList.add('tachon--hecho'); }); });
      });
    }
    if (E.marcas) {
      /* Encima de cada tramo automatizado: la comprobacion (etapa 4) o su numero de
         orden en el roadmap (etapa 5), y la palabra "automatizado" debajo de la marca. */
      var num = 0;
      E.enlaces.forEach(function (l) {
        if (l[2] !== 'auto') { return; }
        num++;
        var a = nodos[l[0]], b = nodos[l[1]];
        var mx = r1((a.x + b.x) / 2), my = r1((a.y + b.y) / 2), cy = my - 44;
        var g = crear('g', { 'class': E.marcas === 'numeros' ? 'marca marca--num' : 'marca marca--check' });
        crear('circle', { cx: mx, cy: cy, r: 12 }, g);
        if (E.marcas === 'numeros') {
          var t = crear('text', { x: mx, y: cy + 5 }, g); t.textContent = String(num);
        } else {
          crear('polyline', { points: (mx - 5.5) + ',' + cy + ' ' + (mx - 1.5) + ',' + (cy + 4) + ' ' + (mx + 6) + ',' + (cy - 5) }, g);
        }
        var et = crear('text', { 'class': 'etiqueta-auto', x: mx, y: my - 16 }, g); et.textContent = textoAuto;
        aparecer(g);
      });
    }
  }

  /* --- etiquetas y estados de los nodos ---------------------------------------- */

  function aplicarNodos(E) {
    Object.keys(nodos).forEach(function (id) {
      var n = nodos[id], l = E.lab[id];
      n.txt.setAttribute('x', l[0]); n.txt.setAttribute('y', l[1]); n.txt.setAttribute('text-anchor', l[2]);
      n.g.classList.toggle('nodo--fuerte', !!E.fuerte);
      n.g.classList.toggle('nodo--tachado', !!(E.tachados && E.tachados.indexOf(id) > -1));
      n.g.classList.toggle('nodo--oculto', !!(E.ocultos && E.ocultos.indexOf(id) > -1));
    });
  }

  /* --- la transición entre etapas ------------------------------------------------ */

  var etapaActual = -1, cuadro = null;

  function irA(n, pieTexto) {
    if (n === etapaActual) { return; }
    etapaActual = n;
    var E = resolver(n);
    if (estatico) { estatico.classList.toggle('mapa__trazo--oculto', n > 0); }
    if (n > 0) { svg.classList.add('mapa--vivo'); }
    if (pie && pieTexto) { pie.textContent = pieTexto; }

    limpiarExtras();
    aplicarNodos(E);
    sincronizarEnlaces(E.enlaces);

    var desde = {}, hasta = E.pos;
    Object.keys(nodos).forEach(function (id) { desde[id] = [nodos[id].x, nodos[id].y]; });
    var dur = reducido ? 0 : 900, t0 = null;
    if (cuadro) { cancelAnimationFrame(cuadro); }

    function paso(t) {
      if (t0 === null) { t0 = t; }
      var p = dur ? Math.min((t - t0) / dur, 1) : 1;
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      Object.keys(nodos).forEach(function (id) {
        var n = nodos[id];
        n.x = desde[id][0] + (hasta[id][0] - desde[id][0]) * e;
        n.y = desde[id][1] + (hasta[id][1] - desde[id][1]) * e;
        n.g.setAttribute('transform', 'translate(' + r1(n.x) + ' ' + r1(n.y) + ')');
      });
      redibujarEnlaces();
      if (p < 1) { cuadro = requestAnimationFrame(paso); } else { cuadro = null; pintarExtras(E); }
    }
    cuadro = requestAnimationFrame(paso);
  }

  /* --- arranque: la etapa 0 tal como está en el HTML ------------------------------- */

  var E0 = resolver(0);
  Object.keys(nodos).forEach(function (id) { nodos[id].x = E0.pos[id][0]; nodos[id].y = E0.pos[id][1]; });
  etapaActual = 0;
  var pieInicial = pie ? pie.textContent : '';

  /* Qué etapa toca: el último paso cuyo borde superior ya ha cruzado la mitad de la
     pantalla. Si ninguno lo ha hecho, la etapa 0 (la portada). Se calcula al hacer
     scroll, con un solo cálculo por cuadro, y una vez al cargar. */
  var fases = Array.prototype.slice.call(document.querySelectorAll('.fase[data-etapa]'));
  var pendiente = false;

  function elegir() {
    pendiente = false;
    var limite = window.innerHeight * 0.5, activa = null;
    fases.forEach(function (f) { if (f.getBoundingClientRect().top < limite) { activa = f; } });
    if (activa) { irA(parseInt(activa.getAttribute('data-etapa'), 10), activa.getAttribute('data-pie')); }
    else { irA(0, pieInicial); }
  }
  function alScroll() { if (!pendiente) { pendiente = true; requestAnimationFrame(elegir); } }
  var temporizador = null;
  function alRedimensionar() { clearTimeout(temporizador); temporizador = setTimeout(elegir, 150); }

  window.addEventListener('scroll', alScroll, { passive: true });
  window.addEventListener('resize', alRedimensionar);
  elegir();
})();
