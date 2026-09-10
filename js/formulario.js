/* Morrow Integration — formularios sin servidor.
   Al enviar, se abre el programa de correo del visitante con las respuestas ya
   escritas, para que vea exactamente qué manda antes de mandarlo. Nada se guarda en
   la página ni viaja a terceros. Sin JavaScript, el formulario manda igual por
   mailto: en texto plano (action del <form>). Este archivo solo mejora el texto,
   añade el botón de copiar y, en el cuestionario, el índice con el avance. */

(function () {
  'use strict';

  var formularios = document.querySelectorAll('form[data-mailto]');
  if (!formularios.length) { return; }

  function etiquetaDe(el, f) {
    var propia = el.getAttribute('data-etiqueta');
    if (propia) { return propia; }
    var campo = el.closest('.campo');
    if (campo && campo.querySelector('.campo__etiqueta')) { return campo.querySelector('.campo__etiqueta').textContent; }
    var fs = el.closest('fieldset');
    if (fs && fs.querySelector('legend')) { return fs.querySelector('legend').textContent.replace(/^\s*\d+\s*/, ''); }
    return el.name;
  }

  function recoger(f) {
    var vistos = {}, lineas = [];
    f.querySelectorAll('input[name], textarea[name], select[name]').forEach(function (el) {
      var n = el.name;
      if (vistos[n]) { return; }
      vistos[n] = true;
      var valores = [];
      f.querySelectorAll('[name="' + n + '"]').forEach(function (e) {
        if (e.type === 'radio' || e.type === 'checkbox') { if (e.checked) { valores.push(e.value); } }
        else if (e.value && e.value.trim()) { valores.push(e.value.trim()); }
      });
      if (!valores.length) { return; }
      lineas.push(etiquetaDe(el, f).trim().replace(/\s+/g, ' ').toUpperCase() + '\n' + valores.join(', ') + '\n');
    });
    return lineas;
  }

  function texto(f) {
    var titulo = f.getAttribute('data-titulo') || '';
    return [titulo, ''].concat(recoger(f)).join('\n').trim() + '\n';
  }

  function asunto(f) {
    var base = f.getAttribute('data-asunto') || '';
    var campo = f.getAttribute('data-asunto-campo');
    var el = campo ? f.querySelector('[name="' + campo + '"]') : null;
    var detalle = el && el.value ? el.value.split('\n')[0].trim().slice(0, 60) : '';
    return detalle ? base + ' — ' + detalle : base;
  }

  formularios.forEach(function (f) {
    var correo = f.getAttribute('data-mailto');

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var destino = 'mailto:' + correo + '?subject=' + encodeURIComponent(asunto(f)) + '&body=' + encodeURIComponent(texto(f));
      f.setAttribute('data-ultimo-envio', destino); // para poder comprobarlo sin abrir el correo
      window.location.href = destino;
    });

    var copiar = f.querySelector('[data-copiar]');
    var ok = f.querySelector('.formulario__ok');
    if (copiar) {
      copiar.addEventListener('click', function () {
        var t = texto(f);
        var listo = function () {
          if (!ok) { return; }
          ok.classList.add('formulario__ok--visible');
          setTimeout(function () { ok.classList.remove('formulario__ok--visible'); }, 2200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(listo, listo); }
        else { window.prompt(copiar.getAttribute('data-copiar') || '', t); }
      });
    }
  });

  /* --- el cuestionario: índice con avance y barra de progreso ---------------------- */

  var indice = document.querySelector('.indice ol');
  var progreso = document.querySelector('.progreso');
  var preguntas = Array.prototype.slice.call(document.querySelectorAll('fieldset.pregunta[id]'));
  if (!preguntas.length) { return; }
  var form = preguntas[0].closest('form');

  function avance() {
    var hechas = 0;
    preguntas.forEach(function (q) {
      var llena = Array.prototype.slice.call(q.querySelectorAll('input, textarea')).some(function (el) {
        return (el.type === 'radio' || el.type === 'checkbox') ? el.checked : el.value.trim() !== '';
      });
      var li = indice ? indice.querySelector('[data-q="' + q.id + '"]') : null;
      if (li) { li.classList.toggle('hecho', llena); }
      if (llena) { hechas++; }
    });
    if (progreso) { progreso.style.width = (hechas / preguntas.length * 100) + '%'; }
  }
  if (form) { form.addEventListener('input', avance); form.addEventListener('change', avance); }
  avance();

  var pendiente = false;
  function activa() {
    pendiente = false;
    if (!indice) { return; }
    var limite = window.innerHeight * 0.5, actual = preguntas[0];
    preguntas.forEach(function (q) { if (q.getBoundingClientRect().top < limite) { actual = q; } });
    indice.querySelectorAll('li').forEach(function (li) { li.classList.toggle('act', li.getAttribute('data-q') === actual.id); });
  }
  window.addEventListener('scroll', function () { if (!pendiente) { pendiente = true; requestAnimationFrame(activa); } }, { passive: true });
  activa();
})();
