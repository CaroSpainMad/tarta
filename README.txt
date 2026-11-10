TARTA DE QUESO DE LA VIÑA - CALCULADORA (PWA)
=============================================

QUE ES
App web instalable, sin dependencias ni servidor, basada en la guia
"Tarta de queso de La Viña: guia definitiva y catalogo de variables".
Cambias raciones, molde, queso, nata, endulzante, horno, cocina, hora de servir,
etc. y recalcula en vivo: ingredientes, molde y papel, temperatura y tiempo de
horno, punto de cocción (sonda), reposo, cronograma hacia atras, energia,
comparacion con Rivera y avisos.

ARCHIVOS
  index.html            interfaz y estilos
  app.js                formulario (por esquema), resultados, perfiles, fichas
  engine.js             motor de calculo (reglas R1-R10 de la guia)
  sw.js                 service worker (funciona sin conexion)
  manifest.webmanifest  datos de instalacion
  icon.svg, icons/      iconos
  tests/engine.test.js  pruebas del motor (node tests/engine.test.js): 157 comprobaciones,
                        incluidos los 3 ejemplos resueltos de la seccion 19
  tools/make_icons.py   regenera los iconos PNG (Pillow)

COMO USARLA
  Opcion A - sin instalar: abrir tarta-standalone.html con doble clic.
             Funciona pero NO se puede instalar como app (los navegadores
             exigen https o localhost para instalar).
  Opcion B - instalable (recomendada): subir TODA la carpeta a un hosting https,
             por ejemplo GitHub Pages (Settings > Pages > rama main, carpeta /root).
             Abrir la URL: Chrome/Edge/Android muestran el boton "Instalar";
             en iPhone: Compartir > "Añadir a pantalla de inicio".
  Prueba local: en la carpeta, ejecutar   python3 -m http.server 8000
                y abrir http://localhost:8000

ACTUALIZAR TRAS CAMBIAR ARCHIVOS
  En sw.js, subir el numero de VERSION (tarta-v1 -> tarta-v2) para que los
  dispositivos reciban la version nueva.

DATOS GUARDADOS (solo en tu navegador, localStorage)
  tarta.state.v1      valores actuales
  tarta.profiles.v1   perfiles con nombre (tu molde + tu horno)
  tarta.fichas.v1     fichas de calibracion (seccion 12 de la guia)
  Menu > Exportar JSON / Importar JSON para copias de seguridad.

ETIQUETAS DE EVIDENCIA (como en la guia)
  F = dato de fuente citada
  P = practica extendida sin cifra oficial
  I = inferencia: punto de partida que hay que calibrar con tu horno

MODO DE ORTODOXIA
  Por defecto "Flexible". Filtra las opciones del formulario: Estricta = solo lo
  de La Viña (crema, nata 35 %+, trigo, blanquilla); Flexible añade maicena,
  azucar moreno, vainilla y citricos; Libre abre todo el catalogo (eritritol,
  estevia, nata de cocinar, ricotta, licores...). Para usar un endulzante
  alternativo hay que pasar a "Libre".

DECISIONES DONDE LA GUIA ERA AMBIGUA (todas son inferencias a calibrar)
  - horas_hasta_servir = horas desde que sacas los ingredientes de la nevera
    hasta servir (por defecto 25 h; asi cuadra el ejemplo 1: 13:30 -> 14:30).
    Todo el tiempo sobrante se suma a la estancia en nevera.
  - Perfil automatico: primero manda el dulzor (poco/mucho) y despues la textura
    (firme/liquida).
  - Allulosa: la variacion de temperatura y tiempo se escala por la parte del
    azucar que sustituye.
  - queso_fuerte_g se interpreta como gramos por kilo de queso y se descuenta
    del queso crema.
  - Sal: no se añade en modo Estricta (la receta original no la lleva).
  - "Mezcla" de endulzantes: se resuelve con un segundo endulzante
    (dulce_segundo_tipo + dulce_segundo_pct).
  - AL07 se muestra como aviso informativo de que la temperatura ya esta bajada.
  - Casos "sin dato" de la tabla de hornos (microondas combi, vapor combi,
    pizza/leña): variacion 0 ºC y aviso.
  - Tiempo activo (~40 min) es una estimacion [I].
  - Leche condensada y altitud: sin datos en la guia; solo se avisa.
