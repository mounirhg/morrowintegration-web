/* Morrow Integration — JavaScript propio, sin librerías externas.
   Una sola cosa: el menú del celular. El contenido se ve entero sin este archivo. */

(function () {
  'use strict';

  var boton = document.querySelector('.btn-menu');
  var menu = document.querySelector('.menu-movil');
  if (!boton || !menu) { return; }

  boton.addEventListener('click', function () {
    var abierto = menu.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  });

  // Al pulsar un enlace del menú se cierra: si no, tapa la sección de destino.
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      menu.classList.remove('abierto');
      boton.setAttribute('aria-expanded', 'false');
    }
  });

  // Escape cierra el menú y devuelve el foco al botón.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('abierto')) {
      menu.classList.remove('abierto');
      boton.setAttribute('aria-expanded', 'false');
      boton.focus();
    }
  });
})();
