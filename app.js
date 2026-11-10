/* Interfaz — Tarta de queso de La Viña. Formulario por esquema + resultados en vivo. */
(function () {
  'use strict';
  var E = window.TartaEngine;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nf = E.nf;

  /* ───────── Almacenamiento ───────── */
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  var KS = 'tarta.state.v1', KP = 'tarta.profiles.v1', KF = 'tarta.fichas.v1', KE = 'tarta.noev.v1';
  var saved = LS.get(KS, null);
  var S = Object.assign({}, E.DEFAULTS, saved || {});
  if (!saved) S.estacion = E.seasonFromDate();
  var R = null;
  var openIds = { comparacion: false, desglose: false, ficha: false, fuentes: false };

  /* ───────── Esquema ───────── */
  var O = function (arr) { return arr.map(function (p) { return Array.isArray(p) ? { v: p[0], l: p[1] } : { v: p, l: p }; }); };
  var is = function (k) { var a = Array.prototype.slice.call(arguments, 1); return function (s) { return a.indexOf(s[k]) >= 0; }; };
  var not = function (k) { var a = Array.prototype.slice.call(arguments, 1); return function (s) { return a.indexOf(s[k]) < 0; }; };
  var inMulti = function (k, v) { return function (s) { return (s[k] || []).indexOf(v) >= 0; }; };
  var esInd = function (s) { return s.forma === 'individual' || s.forma === 'mini'; };
  var ENV = ['estevia', 'sucralosa', 'edulcorante_con_volumen'];
  var usaEnv = function (s) { return ENV.indexOf(s.dulce_tipo) >= 0 || (s.dulce_segundo_tipo !== 'ninguno' && ENV.indexOf(s.dulce_segundo_tipo) >= 0); };
  var DULCES = [['blanquilla', 'Azúcar blanquilla'], ['moreno_integral', 'Azúcar moreno o integral'], ['panela_coco', 'Panela o azúcar de coco'], ['miel', 'Miel'], ['sirope_agave_arce', 'Sirope de agave o arce'], ['eritritol', 'Eritritol'], ['allulosa', 'Allulosa'], ['xilitol', 'Xilitol'], ['estevia', 'Estevia'], ['sucralosa', 'Sucralosa'], ['edulcorante_con_volumen', 'Edulcorante con volumen de azúcar'], ['leche_condensada', 'Leche condensada (sin datos)']];

  var SECS = [
    { id: 'com', t: 'Comensales', f: [
      { k: 'raciones', t: 'int', l: 'Raciones', min: 2, max: 40, ev: 'P' },
      { k: 'tamano_racion', t: 'enum', l: 'Tamaño de ración', ev: 'F/I', o: O([['pequena', 'Pequeña (100 g)'], ['normal', 'Normal (150 g)'], ['generosa', 'Generosa (200 g)'], ['personalizada', 'Personalizada']]) },
      { k: 'racion_personalizada_g', t: 'num', l: 'Ración personalizada', min: 60, max: 300, u: 'g', ev: 'I', show: is('tamano_racion', 'personalizada') },
      { k: 'ocasion', t: 'enum', l: 'Ocasión', ev: 'I', o: O([['postre_comida', 'Postre de comida'], ['merienda', 'Merienda'], ['buffet', 'Buffet'], ['celebracion', 'Celebración'], ['regalo', 'Regalo']]) },
      { k: 'ninos', t: 'int', l: 'De ellas, niños', min: 0, max: 40, ev: 'I', h: 'Cada niño cuenta como 0,6 de ración.' },
      { k: 'apetito', t: 'enum', l: 'Apetito', ev: 'I', o: O([['bajo', 'Bajo (×0,85)'], ['medio', 'Medio (×1)'], ['alto', 'Alto (×1,2)']]) },
      { k: 'repetir_racion', t: 'bool', l: 'Se espera repetir (+15 %)', ev: 'I' },
      { k: 'preferencia_queso', t: 'enum', l: 'Sabor del queso', ev: 'F', o: O([['suave', 'Suave'], ['medio', 'Medio'], ['intenso', 'Intenso (admite queso fuerte)']]) },
      { k: 'dietas', t: 'multi', l: 'Dietas', ev: 'P', o: O([['celiaco', 'Celíaco'], ['sin_lactosa', 'Sin lactosa'], ['sin_azucar', 'Sin azúcar'], ['diabetes', 'Diabetes'], ['bajo_grasa', 'Bajo en grasa']]) },
      { k: 'alergias', t: 'multi', l: 'Alergias (bloquean el cálculo)', ev: 'P', o: O([['huevo', 'Huevo'], ['lacteos', 'Lácteos']]) },
      { k: 'grupo_riesgo', t: 'multi', l: 'Personas de riesgo (huevo poco cocido)', ev: 'F', o: O([['embarazo', 'Embarazo'], ['menor_5_anos', 'Menor de 5 años'], ['mayor_fragil', 'Mayor frágil'], ['inmunodeprimido', 'Inmunodeprimido']]) }
    ] },
    { id: 'mol', t: 'Molde y papel', f: [
      { k: 'modo_calculo', t: 'enum', l: 'Qué calculo', ev: 'I', o: O([['por_raciones', 'El molde, a partir de las raciones'], ['por_molde', 'Las raciones, a partir del molde']]) },
      { k: 'forma', t: 'enum', l: 'Forma', ev: 'I', o: O([['redondo', 'Redondo'], ['cuadrado', 'Cuadrado'], ['rectangular', 'Rectangular'], ['individual', 'Individuales (ramekin)'], ['mini', 'Minis']]) },
      { k: 'diametro_cm', t: 'auto', l: 'Diámetro', min: 12, max: 32, u: 'cm', ev: 'F', show: is('forma', 'redondo'), h: 'Vacío = el comercial más cercano al ideal (14 a 30 cm).', hint: 'diam' },
      { k: 'lado_a_cm', t: 'auto', l: 'Lado A', min: 10, max: 40, u: 'cm', ev: 'I', show: is('forma', 'cuadrado', 'rectangular') },
      { k: 'lado_b_cm', t: 'auto', l: 'Lado B', min: 10, max: 40, u: 'cm', ev: 'I', show: is('forma', 'rectangular') },
      { k: 'ind_diametro_cm', t: 'num', l: 'Diámetro de cada uno', min: 4, max: 14, u: 'cm', ev: 'I', show: esInd },
      { k: 'n_individuales', t: 'int', l: 'Número de moldes', min: 1, max: 40, ev: 'I', show: function (s) { return esInd(s) && s.modo_calculo === 'por_molde'; } },
      { k: 'altura_molde_cm', t: 'num', l: 'Altura del molde', min: 4, max: 12, step: 0.5, u: 'cm', ev: 'F/I', hint: 'alt', h: 'Debe superar la altura de la masa en al menos 1,5 cm.' },
      { k: 'material_molde', t: 'enum', l: 'Material', ev: 'F/I', o: O([['aluminio_claro', 'Aluminio claro'], ['acero_inox', 'Acero inoxidable'], ['metal_oscuro', 'Metal oscuro'], ['antiadherente_oscuro', 'Antiadherente oscuro'], ['vidrio', 'Vidrio'], ['ceramica', 'Cerámica'], ['silicona', 'Silicona (no recomendada)'], ['desechable_aluminio', 'Desechable de aluminio']]) },
      { k: 'desmontable', t: 'bool', l: 'Molde desmontable', ev: 'F' },
      { k: 'papel_hojas', t: 'enum', l: 'Papel de horno', ev: 'F', o: O([['dos_hojas', 'Dos hojas'], ['una_pieza', 'Una sola pieza']]) },
      { k: 'papel_sobresale_cm', t: 'num', l: 'El papel sobresale', min: 0, max: 10, step: 0.5, u: 'cm', ev: 'F' },
      { k: 'papel_mojado', t: 'bool', l: 'Papel mojado y arrugado', ev: 'F' },
      { k: 'engrasado_molde', t: 'enum', l: 'Engrasado', ev: 'F/I', o: O([['mantequilla', 'Mantequilla'], ['margarina', 'Margarina'], ['aceite', 'Aceite'], ['spray', 'Spray'], ['ninguno', 'Ninguno']]) },
      { k: 'bandeja_debajo', t: 'bool', l: 'Bandeja debajo del molde', ev: 'I' },
      { k: 'dos_moldes', t: 'bool', l: 'Divido la masa en dos moldes', ev: 'F', show: function (s) { return !esInd(s); } }
    ] },
    { id: 'ing', t: 'Ingredientes: queso, nata y huevos', f: [
      { k: 'ortodoxia', t: 'enum', l: 'Modo de ortodoxia', ev: 'I', o: O([['estricta', 'Estricta (solo La Viña)'], ['flexible', 'Flexible'], ['libre', 'Libre (todo el catálogo)']]), h: 'Filtra las opciones del formulario.' },
      { k: 'perfil', t: 'enum', l: 'Proporciones', ev: 'I', o: O([['auto', 'Automático (por dulzor y textura)'], ['casera_abc', 'Casera ABC'], ['rivera_original', 'Rivera original (dulce)'], ['menos_dulce', 'Menos dulce'], ['extra_cremosa', 'Extra cremosa'], ['firme', 'Firme']]), hint: 'perfil' },
      { sub: 'Queso' },
      { k: 'queso_tipo', t: 'enum', l: 'Queso', ev: 'F', o: O([['crema_tarrina', 'Queso crema en tarrina'], ['crema_bloque', 'Queso crema en bloque'], ['mascarpone', 'Mascarpone'], ['mezcla_crema_mascarpone', 'Mezcla crema y mascarpone'], ['fresco_batido', 'Fresco batido'], ['ricotta_requeson', 'Ricotta o requesón'], ['artesano', 'Artesano'], ['light', 'Light (no recomendado)'], ['sin_lactosa', 'Sin lactosa'], ['batido_montado', 'Batido montado (no recomendado)']]) },
      { k: 'queso_temp', t: 'enum', l: 'Temperatura del queso', ev: 'F', o: O([['ambiente_20C', 'Ambiente (20 ºC)'], ['fresco_15C', 'Fresco (15 ºC)'], ['frio_nevera', 'Frío de nevera']]) },
      { k: 'queso_fuerte_g', t: 'num', l: 'Queso fuerte', min: 0, max: 20, step: 1, u: 'g/kg', ev: 'F', show: function (s) { return s.ortodoxia !== 'estricta' && s.preferencia_queso === 'intenso'; }, h: 'Azul, Cabrales, Idiazabal, cabra o Camembert: máx. 20 g por kilo.' },
      { k: 'queso_mezcla_pct', t: 'num', l: 'Mascarpone u otra marca', min: 0, max: 100, u: '%', ev: 'P', show: is('ortodoxia', 'libre') },
      { sub: 'Nata' },
      { k: 'nata_tipo', t: 'enum', l: 'Nata', ev: 'F', o: O([['montar_35', 'Para montar, 35 %'], ['montar_mayor_38', 'Para montar, 38 % o más'], ['cocinar_18_20', 'De cocinar, 18-20 %'], ['leche_evaporada', 'Leche evaporada'], ['yogur_griego', 'Yogur griego'], ['vegetal', 'Vegetal'], ['sin_lactosa', 'Sin lactosa']]) },
      { k: 'nata_grasa_pct', t: 'num', l: 'Grasa de la nata', min: 15, max: 48, u: '%', ev: 'F', h: 'Mínimo recomendado: 35 %.' },
      { k: 'nata_temp', t: 'enum', l: 'Temperatura de la nata', ev: 'F', o: O([['atemperada', 'Atemperada'], ['fria', 'Fría']]) },
      { sub: 'Huevos' },
      { k: 'huevo_talla', t: 'enum', l: 'Talla', ev: 'I', o: O([['S', 'S (48 g)'], ['M', 'M (58 g)'], ['L', 'L (68 g)'], ['XL', 'XL (76 g)']]) },
      { k: 'huevo_origen', t: 'enum', l: 'Origen', ev: 'F/P', o: O([['normal', 'Normal'], ['campero', 'Campero'], ['ecologico', 'Ecológico'], ['pasteurizado_liquido', 'Pasteurizado líquido']]) },
      { k: 'huevo_temp', t: 'enum', l: 'Temperatura', ev: 'F', o: O([['ambiente', 'Ambiente'], ['frio', 'Frío']]) },
      { k: 'huevo_modo', t: 'enum', l: 'Cómo los mido', ev: 'F', o: O([['por_peso', 'Por peso (más fiable)'], ['por_unidades', 'Por unidades']]) }
    ] },
    { id: 'dul', t: 'Harina y endulzante', f: [
      { k: 'harina_tipo', t: 'enum', l: 'Harina o almidón', ev: 'F', o: O([['trigo', 'Harina de trigo'], ['maicena', 'Maicena (sin gluten)'], ['almidon_trigo', 'Almidón de trigo'], ['harina_arroz', 'Harina de arroz'], ['avena_integral', 'Avena o integral'], ['mezcla_sin_gluten', 'Mezcla sin gluten'], ['ninguna', 'Ninguna (más fundente)']]) },
      { k: 'harina_g_por_kg_queso', t: 'auto', l: 'Harina por kilo de queso', min: 0, max: 30, step: 1, u: 'g/kg', ev: 'F', show: not('harina_tipo', 'ninguna'), hint: 'harina', h: 'Vacío = según el perfil.' },
      { sub: 'Endulzante' },
      { k: 'dulce_tipo', t: 'enum', l: 'Endulzante', ev: 'P', o: O(DULCES) },
      { k: 'dulce_pct_sustituido', t: 'num', l: 'Parte del azúcar que sustituye', min: 0, max: 100, u: '%', ev: 'I', show: not('dulce_tipo', 'blanquilla') },
      { k: 'dulce_segundo_tipo', t: 'enum', l: 'Segundo endulzante (mezcla)', ev: 'P', o: O([['ninguno', 'Ninguno']].concat(DULCES.slice(1))) },
      { k: 'dulce_segundo_pct', t: 'num', l: 'Parte del segundo', min: 0, max: 100, u: '%', ev: 'I', show: not('dulce_segundo_tipo', 'ninguno') },
      { k: 'dulce_equiv_envase', t: 'num', l: 'Equivalencia del envase', min: 1, max: 400, u: 'g/100 g azúcar', ev: 'F', show: usaEnv, h: 'Gramos de endulzante por cada 100 g de azúcar, según el envase.' },
      { k: 'azucar_g_por_kg_queso_manual', t: 'auto', l: 'Azúcar por kilo de queso', min: 100, max: 400, step: 5, u: 'g/kg', ev: 'F', hint: 'azucar', h: 'Vacío = según el perfil. Anula el perfil de dulzor.' },
      { k: 'miel_tipo', t: 'enum', l: 'Tipo de miel', ev: 'I', show: function (s) { return s.dulce_tipo === 'miel' || s.dulce_segundo_tipo === 'miel'; }, o: O([['acacia', 'Acacia'], ['flores', 'Flores'], ['romero_azahar', 'Romero o azahar'], ['mielada_oscura', 'Mielada oscura']]) },
      { k: 'xilitol_mascotas', t: 'bool', l: 'Hay perros en casa', ev: 'P', show: function (s) { return s.dulce_tipo === 'xilitol' || s.dulce_segundo_tipo === 'xilitol'; } }
    ] },
    { id: 'ext', t: 'Grasa, aromas y extras', f: [
      { k: 'grasa_uso', t: 'multi', l: 'Uso de mantequilla o margarina', ev: 'F', o: O([['engrasar_molde', 'Engrasar el molde'], ['base_galleta', 'Base de galleta'], ['en_masa', 'En la masa'], ['ninguna', 'Ninguna']]), rank: function (v) { return (v === 'base_galleta' || v === 'en_masa') ? 2 : 0; } },
      { k: 'grasa_tipo', t: 'enum', l: 'Tipo de grasa', ev: 'F', o: O([['mantequilla', 'Mantequilla'], ['mantequilla_sin_sal', 'Mantequilla sin sal'], ['mantequilla_sin_lactosa', 'Mantequilla sin lactosa'], ['margarina_80', 'Margarina 80 %'], ['margarina_tres_cuartos', 'Margarina «tres cuartos»'], ['margarina_vegetal', 'Margarina vegetal'], ['aceite', 'Aceite']]) },
      { k: 'grasa_en_masa_g', t: 'num', l: 'Grasa en la masa', min: 0, max: 100, u: 'g', ev: 'I', show: inMulti('grasa_uso', 'en_masa'), h: 'Sin fuente tradicional: no recomendado.' },
      { k: 'base_galleta_g', t: 'num', l: 'Base de galleta', min: 0, max: 300, u: 'g', ev: 'F', show: inMulti('grasa_uso', 'base_galleta') },
      { k: 'sal_g', t: 'auto', l: 'Sal', min: 0, max: 4, step: 0.1, u: 'g', ev: 'F', show: not('ortodoxia', 'estricta'), hint: 'sal', h: 'Vacío = según el perfil.' },
      { k: 'vainilla', t: 'enum', l: 'Vainilla', ev: 'F', o: O([['ninguna', 'Ninguna'], ['extracto', 'Extracto'], ['vaina', 'Vaina']]) },
      { k: 'citricos', t: 'enum', l: 'Cítricos', ev: 'F', o: O([['ninguno', 'Ninguno'], ['ralladura_limon', 'Ralladura de limón'], ['ralladura_naranja', 'Ralladura de naranja']]) },
      { k: 'licor', t: 'enum', l: 'Licor', ev: 'I', o: O([['ninguno', 'Ninguno'], ['ron', 'Ron'], ['brandy', 'Brandy'], ['pacharan', 'Pacharán']]) },
      { k: 'cobertura', t: 'enum', l: 'Cobertura', ev: 'F', o: O([['ninguna', 'Ninguna'], ['mermelada', 'Mermelada'], ['coulis', 'Coulis'], ['sal_escamas', 'Sal en escamas']]) }
    ] },
    { id: 'hor', t: 'Horno', f: [
      { k: 'horno_tipo', t: 'enum', l: 'Tipo de horno', ev: 'F/P/I', o: O([['estatico_arriba_abajo', 'Estático, arriba y abajo'], ['ventilado', 'Con ventilador'], ['ventilado_con_resistencia_inferior', 'Ventilador y resistencia inferior'], ['gas', 'De gas'], ['freidora_aire', 'Freidora de aire'], ['horno_pequeno', 'Pequeño o de sobremesa'], ['microondas_combi', 'Microondas combi (sin datos)'], ['vapor_combi', 'Vapor combi (sin datos)'], ['horno_pizza_lena', 'Pizza o leña (sin datos)']]) },
      { k: 'termometro_horno', t: 'bool', l: 'Tengo termómetro de horno', ev: 'F' },
      { k: 'horno_error_c', t: 'num', l: 'Error del horno', min: -30, max: 30, step: 1, u: 'ºC', ev: 'F', show: function (s) { return !!s.termometro_horno; }, h: 'Real medida − la que marca. Positivo si calienta de más.' },
      { k: 'rejilla', t: 'enum', l: 'Rejilla', ev: 'F', o: O([['inferior', 'Inferior'], ['media_baja', 'Media-baja'], ['media', 'Media'], ['media_alta', 'Media-alta']]) },
      { k: 'precalentado_min', t: 'int', l: 'Precalentado', min: 10, max: 45, u: 'min', ev: 'F' },
      { k: 'giro_molde', t: 'enum', l: 'Giro del molde', ev: 'F', o: O([['una_vez', 'Una vez'], ['cada_7_5_min', 'Cada 7,5 min'], ['ninguno', 'Ninguno']]) },
      { k: 'cubrir_aluminio', t: 'enum', l: 'Cubrir con aluminio', ev: 'F', o: O([['si_necesario', 'Si es necesario'], ['desde_mitad', 'Desde la mitad'], ['no', 'No']]) },
      { k: 'gratinador_final', t: 'bool', l: 'Gratinador al final', ev: 'F' },
      { k: 'bandejas_en_horno', t: 'int', l: 'Bandejas en el horno', min: 1, max: 3, ev: 'I' },
      { k: 'piedra_o_bandeja_caliente', t: 'bool', l: 'Piedra o bandeja caliente', ev: 'I' },
      { k: 'esquema_calor', t: 'enum', l: 'Esquema de calor', ev: 'F', o: O([['constante', 'Constante'], ['dos_tiempos', 'Dos tiempos (alto y 150 ºC)']]) },
      { k: 'sonda_temperatura', t: 'bool', l: 'Tengo sonda de temperatura', ev: 'F' }
    ] },
    { id: 'ent', t: 'Entorno y logística', f: [
      { k: 'temp_cocina_c', t: 'num', l: 'Temperatura de la cocina', min: 10, max: 38, u: 'ºC', ev: 'I', hint: 'atemp' },
      { k: 'estacion', t: 'enum', l: 'Estación', ev: 'I', o: O([['verano', 'Verano'], ['invierno', 'Invierno'], ['entretiempo', 'Entretiempo']]) },
      { k: 'altitud_m', t: 'num', l: 'Altitud', min: 0, max: 2500, u: 'm', ev: 'I', h: 'Sin datos de la guía: solo se avisa.' },
      { k: 'hora_servicio', t: 'time', l: 'Hora de servir', ev: 'I' },
      { k: 'horas_hasta_servir', t: 'num', l: 'Horas hasta servir', min: 0, max: 72, step: 0.5, u: 'h', ev: 'I', hint: 'horas', h: 'Desde que sacas los ingredientes de la nevera.' },
      { k: 'nevera_disponible', t: 'bool', l: 'Tengo nevera disponible', ev: 'I' },
      { k: 'transporte', t: 'bool', l: 'La transporto', ev: 'I' },
      { k: 'tiempo_activo_disponible_min', t: 'int', l: 'Tiempo activo disponible', min: 15, max: 240, u: 'min', ev: 'I' }
    ] },
    { id: 'res', t: 'Resultado deseado', f: [
      { k: 'textura', t: 'enum', l: 'Textura del centro', ev: 'F', o: O([['liquida_cremosa', 'Líquida cremosa'], ['cremosa', 'Cremosa'], ['algo_firme', 'Algo firme'], ['firme', 'Firme']]) },
      { k: 'color', t: 'enum', l: 'Color', ev: 'P', o: O([['dorado_claro', 'Dorado claro (190 ºC)'], ['dorado', 'Dorado (200 ºC)'], ['caoba', 'Caoba (210 ºC)'], ['muy_oscuro', 'Muy oscuro (220 ºC)']]) },
      { k: 'altura_final', t: 'enum', l: 'Altura final', ev: 'I', o: O([['baja', 'Baja (4,2 cm)'], ['media', 'Media (4,7 cm)'], ['alta', 'Alta (5,2 cm)']]) },
      { k: 'preferencia_dulzor', t: 'enum', l: 'Dulzor', ev: 'I', o: O([['poco', 'Poco'], ['medio', 'Medio'], ['mucho', 'Mucho']]) },
      { k: 'reposo_horno', t: 'enum', l: 'Reposo en el horno', ev: 'F', o: O([['medio_1h', '1 hora'], ['corto_15min', '15 minutos'], ['largo_4_5h', '4 a 5 horas']]) },
      { k: 'servicio', t: 'enum', l: 'Servicio', ev: 'F', o: O([['temperatura_ambiente', 'A temperatura ambiente'], ['templada', 'Templada'], ['fria', 'Fría']]) },
      { k: 'paso_por_nevera', t: 'enum', l: 'Paso por nevera', ev: 'F', o: O([['una_noche', 'Una noche'], ['2_4h', '2 a 4 horas'], ['no', 'No']]) },
      { k: 'conservacion', t: 'enum', l: 'Conservación', ev: 'F', o: O([['hasta_3_dias', 'Hasta 3 días'], ['consumir_36h', 'Consumir en 36 h (Rivera)'], ['congelar', 'Congelar']]) }
    ] },
    { id: 'coc', t: 'Cocinero y equipo', f: [
      { k: 'experiencia', t: 'enum', l: 'Experiencia', ev: 'I', o: O([['principiante', 'Principiante'], ['intermedio', 'Intermedio'], ['experto', 'Experto']]) },
      { k: 'bascula', t: 'bool', l: 'Tengo báscula', ev: 'I' },
      { k: 'batidora', t: 'enum', l: 'Batidora', ev: 'F', o: O([['varillas_electricas', 'Varillas eléctricas'], ['varillas_manuales', 'Varillas manuales'], ['robot', 'Robot de cocina'], ['thermomix', 'Thermomix']]) },
      { k: 'bate_velocidad_alta', t: 'bool', l: 'Bato a velocidad alta', ev: 'F', show: not('batidora', 'varillas_manuales') },
      { k: 'tolerancia_riesgo_centro', t: 'enum', l: 'Riesgo con el centro', ev: 'I', o: O([['prudente', 'Prudente (más hecho)'], ['normal', 'Normal'], ['atrevido', 'Atrevido']]) }
    ] },
    { id: 'cal', t: 'Ajustes personales', f: [
      { k: 'ajuste_temp_c', t: 'num', l: 'Corrección de temperatura', min: -20, max: 20, step: 5, u: 'ºC', ev: 'P', h: 'Lo que aprendes tras cada prueba (ficha de calibración).' },
      { k: 'ajuste_tiempo_min', t: 'num', l: 'Corrección de tiempo', min: -15, max: 15, step: 1, u: 'min', ev: 'P' }
    ] }
  ];

  var EVT = { F: 'Dato publicado en una fuente citada', P: 'Práctica habitual sin cifra oficial', I: 'Inferencia: coeficiente calibrable' };
  var evBadge = function (e) { return e ? '<span class="ev ' + e.replace(/\//g, '').replace(/^FPI$/, 'FI').replace(/^FP$/, 'P').replace(/^FI$/, 'FI') + '" title="' + esc(EVT[e.charAt(0)] || '') + '">' + e + '</span>' : ''; };
  var rkMax = function () { return E.ORTO_RANK[S.ortodoxia] != null ? E.ORTO_RANK[S.ortodoxia] : 1; };
  var rk = function (f, v) { return f.rank ? f.rank(v) : E.rankOf(f.k, v); };
  var optsFor = function (f) { return f.o.filter(function (o) { return rk(f, o.v) <= rkMax(); }); };
  var allFields = function () { var a = []; SECS.forEach(function (s) { s.f.forEach(function (f) { a.push(f); }); }); return a; };

  /* ───────── Formulario ───────── */
  function optHtml(f) {
    var v = S[f.k];
    return optsFor(f).map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(v) ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('');
  }
  function chipsHtml(f) {
    return optsFor(f).map(function (o) { return '<label class="chip"><input type="checkbox" data-k="' + f.k + '" data-t="multi" data-v="' + esc(o.v) + '"' + ((S[f.k] || []).indexOf(o.v) >= 0 ? ' checked' : '') + '>' + esc(o.l) + '</label>'; }).join('');
  }
  function fieldHtml(f) {
    if (f.sub) return '<div class="sub fld" data-sub="1">' + esc(f.sub) + '</div>';
    var id = 'i-' + f.k, v = S[f.k], h = '';
    var label = '<label class="l" for="' + id + '">' + esc(f.l) + ' ' + evBadge(f.ev) + '</label>';
    var attrs = ' id="' + id + '" data-k="' + f.k + '" data-t="' + f.t + '"';
    var wide = (f.t === 'enum' && f.o.some(function (o) { return String(o.l).length > 22; })) ? ' wide' : '';
    if (f.t === 'int' || f.t === 'num' || f.t === 'auto') {
      var step = f.step || (f.t === 'int' ? 1 : 'any');
      h = '<div class="row"><input type="number" inputmode="decimal"' + attrs + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + ' step="' + step + '" value="' + (f.t === 'auto' && !v ? '' : esc(v)) + '"' + (f.t === 'auto' ? ' placeholder="auto"' : '') + '>' + (f.u ? '<span class="unit">' + esc(f.u) + '</span>' : '') + '</div>';
    } else if (f.t === 'enum') {
      h = '<select' + attrs + '>' + optHtml(f) + '</select>';
    } else if (f.t === 'time') {
      h = '<input type="time"' + attrs + ' value="' + esc(v) + '">';
    } else if (f.t === 'bool') {
      return '<div class="fld" data-f="' + f.k + '"><label class="sw"><input type="checkbox"' + attrs + (v ? ' checked' : '') + '><i></i><span>' + esc(f.l) + ' ' + evBadge(f.ev) + '</span></label>' + (f.h ? '<div class="h">' + esc(f.h) + '</div>' : '') + '</div>';
    } else if (f.t === 'multi') {
      h = '<div class="chips" data-chips="' + f.k + '">' + chipsHtml(f) + '</div>';
      label = '<div class="l">' + esc(f.l) + ' ' + evBadge(f.ev) + '</div>';
    }
    return '<div class="fld' + wide + '" data-f="' + f.k + '">' + label + h + (f.h ? '<div class="h">' + esc(f.h) + '</div>' : '') + (f.hint ? '<div class="h" id="hint-' + f.k + '"></div>' : '') + '</div>';
  }
  function buildForm() {
    var out = '';
    SECS.forEach(function (sec, i) {
      out += '<details class="sec" data-sec="' + sec.id + '"><summary><span class="sec-n">' + (i + 1) + '</span>' + esc(sec.t) + '</summary><div class="sec-body">' + sec.f.map(fieldHtml).join('') + '</div></details>';
    });
    $('#panelForm').innerHTML = out;
  }
  /* tras cambiar el modo de ortodoxia: reconstruye las listas y corrige valores que ya no se permiten */
  function refreshOptions() {
    allFields().forEach(function (f) {
      if (f.sub || (f.t !== 'enum' && f.t !== 'multi')) return;
      var filtered = optsFor(f);
      if (f.t === 'enum') {
        if (!filtered.some(function (o) { return String(o.v) === String(S[f.k]); })) {
          var d = E.DEFAULTS[f.k];
          S[f.k] = filtered.some(function (o) { return String(o.v) === String(d); }) ? d : (filtered[0] ? filtered[0].v : d);
        }
        var el = $('#i-' + f.k); if (el) el.innerHTML = optHtml(f);
      } else {
        S[f.k] = (S[f.k] || []).filter(function (v) { return rk(f, v) <= rkMax(); });
        var box = $('[data-chips="' + f.k + '"]'); if (box) box.innerHTML = chipsHtml(f);
      }
    });
  }
  function updateVisibility() {
    var fields = allFields();
    var subs = fields.filter(function (f) { return f.sub; }), subNodes = $$('#panelForm .fld[data-sub]');
    fields.forEach(function (f) {
      if (f.sub) return;
      var n = $('#panelForm .fld[data-f="' + f.k + '"]');
      if (n) n.hidden = f.show ? !f.show(S) : false;
    });
    subs.forEach(function (f, i) {
      var n = subNodes[i], sib = n.nextElementSibling, any = false;
      while (sib && !sib.hasAttribute('data-sub')) { if (!sib.hidden) any = true; sib = sib.nextElementSibling; }
      n.hidden = !any;
    });
  }
  function syncInputs() {
    refreshOptions();
    allFields().forEach(function (f) {
      if (f.sub) return;
      if (f.t === 'multi') { $$('#panelForm input[data-k="' + f.k + '"]').forEach(function (c) { c.checked = (S[f.k] || []).indexOf(c.dataset.v) >= 0; }); return; }
      var el = $('#i-' + f.k); if (!el) return;
      if (f.t === 'bool') el.checked = !!S[f.k];
      else if (f.t === 'auto') el.value = S[f.k] ? S[f.k] : '';
      else el.value = S[f.k];
    });
  }

  var NATA_GRASA = { montar_35: 35, montar_mayor_38: 38, cocinar_18_20: 20 };
  function onChange(e) {
    var el = e.target.closest('[data-k]'); if (!el) return;
    var k = el.dataset.k, t = el.dataset.t, f = allFields().filter(function (x) { return x.k === k; })[0] || {};
    var v;
    if (t === 'bool') v = el.checked;
    else if (t === 'multi') {
      var arr = (S[k] || []).slice(), x = el.dataset.v, i = arr.indexOf(x);
      if (el.checked && i < 0) arr.push(x); else if (!el.checked && i >= 0) arr.splice(i, 1);
      v = arr;
    } else if (t === 'int' || t === 'num' || t === 'auto') {
      if (el.value === '') { if (t === 'auto') v = 0; else return; }
      else {
        v = Number(el.value); if (!isFinite(v)) return;
        if (e.type === 'change') {
          if (f.min != null && v < f.min && !(t === 'auto' && v === 0)) v = f.min;
          if (f.max != null && v > f.max) v = f.max;
          if (t === 'int') v = Math.round(v);
          el.value = v;
        }
      }
    } else v = el.value;
    S[k] = v;
    /* reacciones entre campos */
    var sync = false;
    if (k === 'ortodoxia') { syncInputs(); sync = true; }
    if (k === 'nata_tipo' && NATA_GRASA[v]) { S.nata_grasa_pct = NATA_GRASA[v]; sync = true; }
    if (k === 'dulce_tipo') { S.dulce_pct_sustituido = (v === 'blanquilla') ? 0 : (S.dulce_pct_sustituido > 0 ? S.dulce_pct_sustituido : 100); sync = true; }
    if (k === 'dulce_segundo_tipo') { S.dulce_segundo_pct = (v === 'ninguno') ? 0 : (S.dulce_segundo_pct > 0 ? S.dulce_segundo_pct : 25); sync = true; }
    if (k === 'ninos' && S.ninos > S.raciones) { S.ninos = S.raciones; sync = true; }
    if (k === 'raciones' && S.ninos > S.raciones) { S.ninos = S.raciones; sync = true; }
    if (sync) syncInputs();
    LS.set(KS, S);
    refresh();
  }

  /* ───────── Resultados ───────── */
  var SEVL = { bloqueante: 'Bloquea', alta: 'Alta', media: 'Media', baja: 'Baja', info: 'Info' };
  var alHtml = function (a) { return '<div class="al ' + a.sev + '"><b>' + SEVL[a.sev] + '</b><span>' + esc(a.msg) + '</span></div>'; };
  var kpi = function (l, b, s) { return '<div class="kpi"><small>' + esc(l) + '</small><b>' + esc(b) + '</b><span>' + esc(s) + '</span></div>'; };
  var row = function (a, b) { return '<tr><td>' + esc(a) + '</td><td class="q">' + b + '</td></tr>'; };
  var tbl = function (rows) { return '<div class="scroll"><table class="t"><tbody>' + rows.join('') + '</tbody></table></div>'; };
  function card(id, title, body, extra) {
    return '<details class="card" data-id="' + id + '"' + (openIds[id] === false ? '' : ' open') + '><summary><h2>' + title + (extra || '') + '</h2></summary>' + body + '</details>';
  }
  var LBL = {
    horno: { estatico_arriba_abajo: 'estático, arriba y abajo', ventilado: 'con ventilador', ventilado_con_resistencia_inferior: 'ventilador y resistencia inferior', gas: 'de gas', freidora_aire: 'freidora de aire', horno_pequeno: 'pequeño', microondas_combi: 'microondas combi', vapor_combi: 'vapor combi', horno_pizza_lena: 'pizza o leña' },
    rejilla: { inferior: 'inferior', media_baja: 'media-baja', media: 'media', media_alta: 'media-alta' },
    material: { aluminio_claro: 'aluminio claro', acero_inox: 'acero inoxidable', metal_oscuro: 'metal oscuro', antiadherente_oscuro: 'antiadherente oscuro', vidrio: 'vidrio', ceramica: 'cerámica', silicona: 'silicona', desechable_aluminio: 'desechable de aluminio' }
  };

  function renderResult() {
    var p = $('#panelResult');
    if (R.vacio) { p.innerHTML = '<div class="card"><h2>Resultado</h2><div class="alerts">' + R.alerts.map(alHtml).join('') + '</div></div>'; return; }
    var rs = R.resumen, m = rs.molde, H = R.horno, c = R.cantidades, h = '';
    var inicio = R.cronograma[0];

    /* 1. Resumen */
    h += '<div class="card"><div class="kpis">' +
      kpi('Raciones', nf(rs.raciones_mostradas, rs.modo === 'por_molde' ? 1 : 0), Math.round(rs.racion_g) + ' g cada una') +
      kpi('Masa cruda', E.fmtG(rs.M), 'cocida ≈ ' + E.fmtG(rs.M_cocida)) +
      kpi('Molde', m.esInd || (S.forma === 'individual' || S.forma === 'mini') ? m.n + ' uds.' : (m.d ? nf(m.d, 1) + ' cm' : nf(m.lado_a, 0) + '×' + nf(m.lado_b, 0)), 'masa a ' + nf(m.h_real, 1) + ' cm · alto ≥ ' + nf(m.altura_rec, 1) + ' cm') +
      kpi('Horno', H.T + ' ºC', Math.round(H.t) + ' min · ventana ' + Math.round(H.ventana[0]) + '-' + Math.round(H.ventana[1])) +
      kpi('Empiezas a las', inicio.hora, inicio.dia + ' · servir ' + S.hora_servicio) +
      '</div></div>';

    /* 8. Alertas */
    var al = R.alerts.filter(function (a) { return a.sev !== 'info'; }), inf = R.alerts.filter(function (a) { return a.sev === 'info'; });
    h += card('alertas', 'Avisos' + (al.length ? ' (' + al.length + ')' : ''), '<div class="alerts">' + (al.length ? al.map(alHtml).join('') : '<div class="muted">Sin avisos importantes con esta configuración.</div>') + '</div>' + (inf.length ? '<div class="alerts" style="margin-top:6px">' + inf.map(alHtml).join('') + '</div>' : ''));

    /* 2. Ingredientes */
    h += card('ingredientes', 'Ingredientes', '<div class="scroll"><table class="t"><tbody>' + R.lista.map(function (i) { return '<tr><td>' + esc(i.n) + (i.nota ? '<span class="n">' + esc(i.nota) + '</span>' : '') + '</td><td class="q">' + esc(i.q) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (R.sinBascula ? '<div class="sub" style="margin-top:8px">Sin báscula (aproximado)</div><ul class="muted" style="margin:4px 0 0;padding-left:18px">' + R.sinBascula.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''),
      '<small>' + R.lista.length + ' líneas</small>');

    /* 3. Molde y papel */
    var mr = [];
    mr.push(row('Molde', esc(m.etiqueta) + (m.auto ? ' <span class="auto">recomendado</span>' : '')));
    if (m.d_ideal) mr.push(row('Diámetro ideal', nf(m.d_ideal, 1) + ' cm → comercial ' + m.d_comercial + ' cm'));
    mr.push(row('Altura de la masa', nf(m.h_real, 2) + ' cm <span class="n">objetivo ' + nf(m.h_obj, 1) + ' cm (rango 4,2-5,2)</span>'));
    mr.push(row('Altura mínima del molde', nf(m.altura_min, 1) + ' cm <span class="n">masa + 1,5 cm · mejor ' + nf(m.altura_rec, 1) + ' cm</span>'));
    mr.push(row('Material', esc(LBL.material[S.material_molde] || '')));
    mr.push(row('Papel', (S.papel_hojas === 'una_pieza' ? 'una pieza' : 'dos hojas') + ', ' + (S.papel_mojado ? 'mojado y arrugado' : 'seco') + ', sobresale ' + nf(S.papel_sobresale_cm, 1) + ' cm <span class="n">recomendado ≥ 5 cm</span>'));
    mr.push(row('Engrasado', esc(S.engrasado_molde === 'ninguno' ? 'ninguno' : S.engrasado_molde) + ' <span class="n">sirve para pegar el papel</span>'));
    h += card('molde', 'Molde y papel', tbl(mr));

    /* 4. Horno */
    var hr = [];
    hr.push(row('Temperatura', '<b>' + H.T + ' ºC</b>' + (Math.abs(H.T_raw - H.T) > 0.5 ? ' <span class="n">calculada ' + nf(H.T_raw, 1) + ' ºC, redondeada a múltiplos de 5</span>' : '')));
    hr.push(row('Modo', esc(LBL.horno[S.horno_tipo] || '') + (S.horno_tipo === 'estatico_arriba_abajo' ? ' <span class="n">sin ventilador</span>' : '')));
    hr.push(row('Rejilla', esc(LBL.rejilla[S.rejilla]) + ' <span class="n">más baja protege la superficie; más alta dora antes</span>'));
    hr.push(row('Precalentado', H.precalentado + ' min'));
    hr.push(row('Tiempo', '<b>' + Math.round(H.t) + ' min</b> <span class="n">ventana ' + Math.round(H.ventana[0]) + ' a ' + Math.round(H.ventana[1]) + ' min</span>'));
    hr.push(row('Primer control', 'a los ' + Math.round(H.control) + ' min'));
    hr.push(row('Giro del molde', H.giros.length ? 'a los ' + H.giros.map(function (x) { return nf(x, 1) + ' min'; }).join(', ') : 'no'));
    hr.push(row('Aluminio', H.aluminio ? 'cubrir a partir del minuto ' + H.aluminio : S.cubrir_aluminio === 'no' ? 'no' : 'si se oscurece antes de tiempo'));
    if (S.gratinador_final) hr.push(row('Gratinador final', 'solo si el centro está listo y la superficie pálida; vigílalo'));
    if (H.dos_tiempos) hr.push(row('Dos tiempos', H.dos_tiempos.fase1_min + ' min a ' + H.dos_tiempos.T1 + ' ºC (giro cada 7,5 min) y luego ' + H.dos_tiempos.T2 + ' ºC hasta la lectura de sonda <span class="n">≈ ' + Math.round(H.dos_tiempos.fase2_est) + ' min, orientativo</span>'));
    h += card('horno', 'Programa de horno', tbl(hr));

    /* 5. Punto de cocción */
    var pr = [row('Señal visual', esc(R.punto.visual)), row('Cuándo apagar', 'cuando se vea esa señal; <b>no esperes a que cuaje del todo</b>')];
    if (R.punto.sonda) {
      pr.push(row('Sonda, método ThermoWorks', '<b>' + R.punto.pull_tw + ' ºC</b> <span class="n">lectura más baja al subir la sonda despacio desde el fondo</span>'));
      pr.push(row('Sonda, centro real', '<b>' + R.punto.pull_cr + ' ºC</b> <span class="n">método Masala Monk</span>'));
    } else pr.push(row('Sonda', 'sin sonda: guíate por el temblor del centro'));
    h += card('punto', 'Punto de cocción', tbl(pr) + '<p class="muted" style="margin:6px 0 0">Los dos métodos de sonda miden cosas distintas: elige uno y no los mezcles.</p>');

    /* 6. Reposo y servicio */
    var rp = R.reposo, rr = [];
    rr.push(row('Reposo en el horno apagado', E.fmtMin(rp.reposo_horno) + ' <span class="n">puerta entreabierta; menor riesgo de grietas</span>'));
    rr.push(row('Enfriado en el molde', E.fmtMin(rp.enfriado) + ' <span class="n">sin desmoldar</span>'));
    rr.push(row('Nevera', rp.nevera_min ? 'sí: ' + nf(R.nevera_real_min / 60, 1) + ' h <span class="n">mínimo ' + rp.nevera_h + ' h, tapada</span>' : 'no' + (R.espera_ambiente_min ? ' <span class="n">espera ' + E.fmtMin(R.espera_ambiente_min) + ' a temperatura ambiente</span>' : '')));
    rr.push(row('Servicio', S.servicio === 'fria' ? 'fría, directa de la nevera' : S.servicio === 'templada' ? 'sacar de la nevera 30 min antes' : (rp.nevera_min ? 'sacar de la nevera 60 min antes' : 'a temperatura ambiente')));
    rr.push(row('Conservación', 'hasta ' + (rp.consumo_h >= 168 ? nf(rp.consumo_h / 24, 0) + ' días' : rp.consumo_h + ' h') + ' <span class="n">desde el horneado' + (S.conservacion === 'congelar' ? ' (congelada)' : '') + '</span>'));
    rr.push(row('Porción', 'pequeña, para apreciar el sabor <span class="n">según Rivera</span>'));
    h += card('reposo', 'Reposo, enfriado y servicio', tbl(rr));

    /* 7. Cronograma */
    h += card('crono', 'Cronograma', '<ul class="tl" style="margin:0">' + R.cronograma.map(function (x) { return '<li class="' + (x.id === 'servir' ? 'end' : '') + '"><time>' + esc(x.hora) + '</time>' + esc(x.n) + ' <small>· ' + esc(x.dia) + '</small></li>'; }).join('') + '</ul>' +
      '<p class="muted" style="margin:4px 0 0">Tiempo mínimo desde el atemperado hasta servir: ' + E.fmtMin(R.t_min_total) + '.</p>');

    /* 9. Energía y dulzor */
    var en = R.energia, d = R.dulce;
    h += card('energia', 'Energía y dulzor', '<div class="two"><div><div class="muted">Energía por ración</div><div class="big">≈ ' + Math.round(en.kcal_racion) + ' kcal</div><div class="muted">3,05 kcal/g × ' + Math.round(rs.racion_g) + ' g' + (en.ajuste > 0.5 ? ' − ' + Math.round(en.ajuste) + ' del endulzante sin calorías' : '') + ' [F/I]</div></div>' +
      '<div><div class="muted">Índice de dulzor</div><div class="big">' + nf(d.IDz, 3) + '</div><div class="muted">' + esc(d.clase) + ' (poco &lt; 0,11 · muy dulce &gt; 0,15) [I]</div></div></div>' +
      '<p class="muted" style="margin:8px 0 0">Perfil «' + esc(R.perfil.nombre) + '»: queso ' + nf(R.perfil.f.q * 100, 1) + ' %, nata ' + nf(R.perfil.f.nt * 100, 1) + ' %, azúcar ' + nf(R.perfil.f.a * 100, 1) + ' %, huevo ' + nf(R.perfil.f.h * 100, 1) + ' %, harina ' + nf(R.perfil.f.f * 100, 1) + ' % de la masa. Masa real de la mezcla: ' + E.fmtG(c.masa_real) + '.</p>');

    /* 10. Comparación */
    var cp = R.comparacion, t = cp.tuya;
    var crow = function (v, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + esc(v.f) + (v.nota ? '<span class="n">' + esc(v.nota) + '</span>' : '') + '</td><td class="q">' + v.n + '</td><td class="q">' + v.a + '</td><td>' + esc(v.h) + '</td><td>' + esc(v.fl) + '</td><td>' + esc(v.m) + '</td><td>' + esc(v.o) + '</td><td>' + esc(v.t) + '</td></tr>'; };
    var rows = [crow({ f: 'Tu receta (por kg de queso)', n: Math.round(t.nata_kg), a: Math.round(t.azucar_kg), h: nf(t.huevo_kg, 0) + ' g', fl: nf(t.harina_kg, 0) + ' g', m: m.etiqueta, o: H.T + ' ºC', t: Math.round(H.t) + ' min' }, 'mine')];
    cp.versiones.forEach(function (v) { rows.push(crow({ f: v.f, nota: v.nota, n: Math.round(v.n_kg), a: v.a_kg != null ? Math.round(v.a_kg) : v.a, h: v.h, fl: v.fl, m: v.m, o: v.o, t: v.t }, v.rivera ? 'riv' : '')); });
    var dAz = cp.rivera.azucar_kg ? Math.round((t.azucar_kg / cp.rivera.azucar_kg - 1) * 100) : 0;
    h += card('comparacion', 'Comparación con Rivera y versiones publicadas', '<p class="muted" style="margin:0 0 6px">Por kilo de queso, Rivera usa 500 ml de nata, 400 g de azúcar, 7 huevos y una cucharada de harina. Tu azúcar está un ' + Math.abs(dAz) + ' % ' + (dAz < 0 ? 'por debajo' : 'por encima') + '.</p><div class="scroll"><table class="t cmp"><thead><tr><th>Fuente</th><th>Nata ml/kg</th><th>Azúcar g/kg</th><th>Huevos</th><th>Harina</th><th>Molde</th><th>Horno</th><th>Tiempo</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>');

    /* 11. Desglose */
    var tr = R.desglose.temperatura.map(function (x, i) { return '<tr><td>' + esc(x.n) + '</td><td class="q">' + (i ? (x.v > 0 ? '+' : '') : '') + nf(x.v, 1) + ' ºC</td><td>' + evBadge(x.ev) + '</td></tr>'; }).join('') + '<tr><td><b>Total (redondeado)</b></td><td class="q"><b>' + H.T + ' ºC</b></td><td></td></tr>';
    var tt = R.desglose.tiempo.map(function (x) { var val = x.tipo === 'abs' ? nf(x.v, 1) + ' min' : x.tipo === 'x' ? '× ' + nf(x.v, 3) : (x.v > 0 ? '+' : '') + nf(x.v, 1) + ' min'; return '<tr><td>' + esc(x.n) + '</td><td class="q">' + val + '</td><td>' + evBadge(x.ev) + '</td></tr>'; }).join('') + '<tr><td><b>Total (redondeado)</b></td><td class="q"><b>' + Math.round(H.t) + ' min</b></td><td></td></tr>';
    h += card('desglose', 'Cómo se ha calculado', '<h3 style="font-size:14px;margin:0 0 4px">Temperatura</h3><div class="scroll"><table class="t"><tbody>' + tr + '</tbody></table></div><h3 style="font-size:14px;margin:10px 0 4px">Tiempo</h3><div class="scroll"><table class="t"><tbody>' + tt + '</tbody></table></div>' +
      '<p class="muted" style="margin:8px 0 0">M = ' + E.fmtG(rs.M) + ' (' + nf(rs.n_ef, 2) + ' raciones eq. × ' + Math.round(rs.racion_g) + ' g ÷ 0,95). Las constantes marcadas con I son inferencias a calibrar.</p>');

    /* 12. Ficha */
    h += card('ficha', 'Ficha de calibración', fichasHtml());

    /* Fuentes */
    h += card('fuentes', 'Fuentes', fuentesHtml());

    h += '<div class="card noprint"><div class="actions"><button class="btn primary" data-act="copy">Copiar receta</button><button class="btn" data-act="print">Imprimir / PDF</button><button class="btn" data-act="saveprof">Guardar como perfil</button></div></div>';
    p.innerHTML = h;
  }

  /* ───────── Fuentes ───────── */
  var SRC = [
    ['Recetas y entrevistas de La Viña', [
      ['ABC De Rechupete (Santiago Rivera)', 'https://www.abc.es/recetasderechupete/tarta-de-queso-la-vina/24906/'],
      ['ABC Gurmé', 'https://www.abc.es/gurme/recetas/famosa-tarta-queso-vina-receta-original-siempre-20250822202804-nts.html'],
      ['Heraldo', 'https://www.heraldo.es/noticias/gastronomia/2026/02/04/receta-famosa-tarta-queso-restaurante-vina-san-sebastian-original-espana-1875788.html'],
      ['RTVE', 'https://www.rtve.es/play/noticias/20220617/receta-tarta-queso-vina-san-sebastian/2053760.shtml'],
      ['Onda Cero (Rivera)', 'https://www.ondacero.es/programas/por-fin-no-es-lunes/podcast/entrevistas/mitica-tarta-queso-vina-asi-esta-receta-conocida-todo-mundo_20230603647b228545377c0001711347.html'],
      ['Diario Vasco', 'https://www.diariovasco.com/gastronomia/recetas/postres/receta-tarta-queso-20201105113026-nt.html'],
      ['Bon Viveur', 'https://bonviveur.com/es/recetas/tarta-queso-vina'],
      ['Invitado de Invierno', 'https://invitadoinvierno.com/tarta-queso-vinia/'],
      ['María Lunarillos', 'https://www.marialunarillos.com/blog/tarta-queso-vina.html'],
      ['Tía Alia', 'https://www.tiaalia.com/2019/03/tarta-de-queso-de-la-vina-receta-con-y-sin-thermomix.html'],
      ['Velocidad Cuchara', 'https://www.velocidadcuchara.com/tarta-de-queso-la-vina-thermomix/'],
      ['La Cocina de Frabisa', 'https://lacocinadefrabisa.lavozdegalicia.es/tarta-de-queso-la-vina-2/'],
      ['Moncloa', 'https://www.moncloa.com/2026/08/09/tarta-queso-la-vina-horno-3412720/'],
      ['Pazo de Vilane', 'https://pazodevilane.com/receta/tarta-queso-la-vina/'],
      ['The Cooking Lab', 'https://thecookinglab.es/tarta-de-queso-la-vina-receta/']]],
    ['Historia', [
      ['El Comercio', 'https://www.elcomercio.es/culturas/gastronomia/tarta-queso-denominacion-origen-inventada-20250829000355-ntrc.html'],
      ['Hogarmanía', 'https://www.hogarmania.com/cocina/actualidad/basque-cheesecake-historia_1_1158750.html'],
      ['Chef Ben San Sebastián', 'https://chefbensansebastian.com/es/blog/basque-cheesecake-real-story/']]],
    ['Técnica, temperatura y molde', [
      ['ThermoWorks (sonda y dos tiempos)', 'https://www.thermoworks.com/blogs/thermoblog/basque-cheesecake-blog'],
      ['Masala Monk (molde y horno)', 'https://masalamonk.com/basque-cheesecake-recipe/'],
      ['Serious Eats (convección)', 'https://www.seriouseats.com/guide-to-convection-settings-12241919'],
      ['King Arthur (freidora de aire)', 'https://www.kingarthurbaking.com/blog/2023/01/04/air-fryer-baking'],
      ["Jane's Patisserie", 'https://www.janespatisserie.com/2026/07/15/basque-cheesecake/'],
      ['House of Nash Eats', 'https://houseofnasheats.com/basque-cheesecake/']]],
    ['Edulcorantes y grasas', [
      ['Ricardo Cuisine (sustituir el azúcar)', 'https://www.ricardocuisine.com/en/articles/food-chemistry/514-replacing-white-sugar-with-local-sweeteners'],
      ['Gourmandelle', 'https://gourmandelle.com/healthy-sugar-alternatives/'],
      ['Recipe Wanted', 'https://recipewanted.com/education/ingredient-guides/sugar-types-explained/'],
      ['Mashed (allulosa y eritritol)', 'https://www.mashed.com/2291918/allulose-vs-erythritol-baking-drawbacks/'],
      ['Dulces Diabéticos', 'https://dulcesdiabeticos.com/tarta-queso-vina/'],
      ['Naturalmente Adri', 'https://naturalmenteadri.com/tarta-de-queso-la-vina/'],
      ['Cookpad (ligera)', 'https://cookpad.com/es/recetas/16613639'],
      ['Cookpad (sin lactosa ni gluten)', 'https://cookpad.com/es/recetas/14816289'],
      ['eSalud (mantequilla o margarina)', 'https://www.esalud.com/mantequilla-o-margarina/'],
      ['Farm Boy', 'https://www.farmboy.ca/products/farm-boy-basque-style-cheesecake-500-g/']]]
  ];
  function fuentesHtml() {
    return '<p class="muted" style="margin:0 0 6px">Cada decisión de la guía lleva su fuente. Las inferencias [I] no tienen fuente: son coeficientes propios a calibrar.</p>' +
      SRC.map(function (g) { return '<div class="sub" style="margin-top:8px">' + esc(g[0]) + '</div><ul class="muted src" style="margin:4px 0 0;padding-left:18px">' + g[1].map(function (l) { return '<li><a href="' + esc(l[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(l[0]) + '</a></li>'; }).join('') + '</ul>'; }).join('');
  }

  /* ───────── Ficha de calibración (sección 12) ───────── */
  function fichas() { return LS.get(KF, []); }
  function fichasHtml() {
    var fs = fichas();
    var out = '<p class="muted" style="margin:0 0 8px">Registra cada prueba y cambia una sola variable por vez. Valora de 1 a 5 el color, la textura del centro y el dulzor.</p><div class="actions"><button class="btn primary small" data-act="newficha">Registrar prueba con estos datos</button>' + (fs.length ? '<button class="btn small" data-act="exportfichas">Copiar fichas</button><button class="btn small" data-act="dlfichas">Descargar TXT</button>' : '') + '</div>';
    fs.slice().reverse().forEach(function (f, ri) {
      var i = fs.length - 1 - ri, sug = [];
      if (f.color && +f.color <= 2) sug.push(['t', 10, 'Temperatura +10 ºC']);
      if (f.color && +f.color === 5) sug.push(['t', -10, 'Temperatura −10 ºC']);
      if (f.textura && +f.textura === 5) sug.push(['m', -3, 'Tiempo −3 min']);
      if (f.textura && +f.textura === 1) sug.push(['m', 3, 'Tiempo +3 min']);
      out += '<div class="ficha"><b>' + esc(f.fecha) + '</b> · ' + esc(f.molde) + '<br>' + esc(f.horno) + '<br>Color <b>' + esc(f.color) + '</b>/5 · Textura <b>' + esc(f.textura) + '</b>/5 · Dulzor <b>' + esc(f.dulzor) + '</b>/5' + (f.sonda ? ' · Sonda ' + esc(f.sonda) + ' ºC' : '') + (f.cambio ? '<br>Cambiar: ' + esc(f.cambio) : '');
      if (sug.length) out += '<div class="actions" style="margin-top:6px">' + sug.map(function (s) { return '<button class="btn small" data-act="sug" data-t="' + s[0] + '" data-v="' + s[1] + '">Aplicar: ' + s[2] + '</button>'; }).join('') + '</div>';
      out += '<div style="margin-top:6px"><button class="btn ghost small" data-act="delficha" data-i="' + i + '">Borrar</button></div></div>';
    });
    return out;
  }
  function fichaTexto(f) {
    return ['Fecha: ' + f.fecha, 'Molde: ' + f.molde, 'Cantidades: ' + f.cantidades, 'Endulzante: ' + f.endulzante, 'Horno: ' + f.horno, 'Tiempo y giro: ' + f.tiempo, 'Sonda en el centro (mínima): ' + (f.sonda || '—'), 'Color (1 a 5): ' + f.color, 'Textura del centro tras el reposo (1 líquida a 5 firme): ' + f.textura, 'Dulzor (1 a 5): ' + f.dulzor, 'Qué cambiar en la siguiente: ' + (f.cambio || '—')].join('\n');
  }
  function openFichaDialog() {
    var d = new Date(), fecha = d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    var rs = R.resumen, c = R.cantidades, H = R.horno;
    var molde = rs.molde.etiqueta + ', ' + nf(S.altura_molde_cm, 1) + ' cm de alto, ' + (S.material_molde || '').replace(/_/g, ' ');
    var cant = 'queso ' + Math.round(c.queso) + ' g, nata ' + Math.round(c.nata_ml) + ' ml, azúcar ' + Math.round(c.azucar_ref) + ' g, huevo ' + Math.round(c.huevo_g) + ' g, harina ' + nf(c.harina, 0) + ' g';
    var endu = R.dulce.partes.length ? R.dulce.partes.map(function (o) { return o.nombre + ' ' + Math.round(o.masa) + ' g'; }).join(' + ') + ' + blanquilla ' + Math.round(c.azucar_blanquilla) + ' g' : 'azúcar blanquilla ' + Math.round(c.azucar_blanquilla) + ' g';
    var horno = (S.horno_tipo || '').replace(/_/g, ' ') + ', ' + H.T + ' ºC' + (S.termometro_horno ? ' (error ' + S.horno_error_c + ' ºC)' : '') + ', rejilla ' + (S.rejilla || '').replace(/_/g, ' ');
    var tiempo = Math.round(H.t) + ' min' + (H.giros.length ? ', giro a los ' + H.giros.map(function (x) { return nf(x, 1); }).join(' / ') + ' min' : '');
    var sel = function (id) { return '<select id="' + id + '"><option value="">—</option>' + [1, 2, 3, 4, 5].map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select>'; };
    dlgOpen('<h3>Registrar prueba</h3><p class="muted">' + esc(molde) + '<br>' + esc(cant) + '<br>' + esc(horno + ' · ' + tiempo) + '</p>' +
      '<div class="two"><div class="fld"><label class="l">Color (1 a 5)</label>' + sel('fc1') + '</div><div class="fld"><label class="l">Textura (1 líquida a 5 firme)</label>' + sel('fc2') + '</div><div class="fld"><label class="l">Dulzor (1 a 5)</label>' + sel('fc3') + '</div><div class="fld"><label class="l">Sonda en el centro (ºC)</label><input type="number" id="fc4" step="1" inputmode="decimal"></div></div>' +
      '<div class="fld" style="margin-top:8px"><label class="l">Qué cambiar en la siguiente</label><input type="text" id="fc5" maxlength="160" placeholder="p. ej. −10 ºC, menos tiempo"></div>' +
      '<div class="actions" style="margin-top:14px"><button class="btn primary" id="fok">Guardar</button><button class="btn" data-close>Cancelar</button></div>');
    $('#fok').onclick = function () {
      var fs = fichas();
      fs.push({ fecha: fecha, molde: molde, cantidades: cant, endulzante: endu, horno: horno, tiempo: tiempo, sonda: $('#fc4').value, color: $('#fc1').value || '—', textura: $('#fc2').value || '—', dulzor: $('#fc3').value || '—', cambio: $('#fc5').value });
      LS.set(KF, fs.slice(-40)); dlgClose(); renderResult(); toast('Prueba guardada');
    };
  }
  function applySuggestion(t, v) {
    if (t === 't') S.ajuste_temp_c = Math.max(-20, Math.min(20, (S.ajuste_temp_c || 0) + v));
    else S.ajuste_tiempo_min = Math.max(-15, Math.min(15, (S.ajuste_tiempo_min || 0) + v));
    LS.set(KS, S); syncInputs(); refresh(); toast('Ajuste aplicado');
  }

  /* ───────── Mini barra, pistas y refresco ───────── */
  function renderMini() {
    var m = $('#mini');
    if (R.vacio) { m.innerHTML = '<span style="color:var(--bad)"><b>Bloqueado</b></span>'; return; }
    var rs = R.resumen, mo = rs.molde;
    m.innerHTML = '<span><b>' + nf(rs.raciones_mostradas, rs.modo === 'por_molde' ? 1 : 0) + '</b> raciones</span><span><b>' + (mo.d ? nf(mo.d, 1) + ' cm' : mo.n + ' uds') + '</b> molde</span><span><b>' + R.horno.T + ' ºC</b></span><span><b>' + Math.round(R.horno.t) + ' min</b></span>' + (R.insuficiente ? '<span style="color:var(--bad)"><b>Sin tiempo</b></span>' : '');
  }
  function updateHints() {
    if (R.vacio) return;
    var set = function (id, t) { var n = $('#hint-' + id); if (n) n.textContent = t; };
    var rs = R.resumen, m = rs.molde, c = R.cantidades;
    if (m.d_comercial) set('diametro_cm', 'Ideal ' + nf(m.d_ideal, 1) + ' cm → comercial ' + m.d_comercial + ' cm · masa a ' + nf(m.h_real, 1) + ' cm.');
    else set('diametro_cm', '');
    set('altura_molde_cm', 'Necesitas al menos ' + nf(m.altura_min, 1) + ' cm (mejor ' + nf(m.altura_rec, 1) + ' cm).');
    set('perfil', 'Perfil aplicado: ' + R.perfil.nombre + '.');
    set('temp_cocina_c', 'Atemperado: ' + (R.cronograma[2].t - R.cronograma[0].t) + ' min.');
    set('horas_hasta_servir', 'Mínimo necesario: ' + nf(R.t_min_total / 60, 1) + ' h' + (R.insuficiente ? ' (no llegas)' : '') + '.');
    set('harina_g_por_kg_queso', c.queso > 0 ? 'Con el perfil: ' + nf(R.perfil.f.f * 1000 / R.perfil.f.q, 1) + ' g/kg.' : '');
    set('azucar_g_por_kg_queso_manual', 'Con el perfil: ' + Math.round(R.perfil.f.a * 1000 / R.perfil.f.q) + ' g/kg.');
    var ph = function (k, val) { var n = $('#i-' + k); if (n) n.placeholder = val ? 'auto (' + val + ')' : 'auto'; };
    ph('diametro_cm', m.d_comercial); ph('lado_a_cm', m.lado_rec || m.lado_a); ph('sal_g', nf(R.perfil.f.s * rs.M, 1));
    ph('harina_g_por_kg_queso', nf(R.perfil.f.f * 1000 / R.perfil.f.q, 1)); ph('azucar_g_por_kg_queso_manual', Math.round(R.perfil.f.a * 1000 / R.perfil.f.q));
  }
  function refresh() {
    R = E.compute(S);
    updateVisibility(); updateHints(); renderMini(); renderResult();
  }

  /* ───────── Diálogo, aviso, portapapeles ───────── */
  var dlg = $('#dlg');
  function dlgOpen(html) { dlg.innerHTML = html; if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', ''); }
  function dlgClose() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.hasAttribute('data-close')) dlgClose(); });
  var toastT;
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1800); }
  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(function () { toast('Copiado'); }, fallback);
    fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copiado'); } catch (e) { toast('No se pudo copiar'); } ta.remove(); }
  }
  function download(name, text, type) {
    try { var b = new Blob([text], { type: type || 'text/plain' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
    catch (e) { copyText(text); }
  }

  /* ───────── Perfiles, importar y exportar ───────── */
  function profiles() { return LS.get(KP, {}); }
  function menuHtml() {
    var ps = profiles(), names = Object.keys(ps);
    return '<h3>Menú</h3><div class="sub" style="margin-top:10px">Perfiles guardados</div>' +
      (names.length ? names.map(function (n) { return '<div class="list-row"><span>' + esc(n) + '</span><button class="btn small" data-act="loadprof" data-n="' + esc(n) + '">Cargar</button><button class="btn ghost small" data-act="delprof" data-n="' + esc(n) + '">Borrar</button></div>'; }).join('') : '<p class="muted">Aún no hay perfiles. Guarda tu molde, tu horno y tu receta con un nombre para recuperarlos con un toque.</p>') +
      '<div class="row" style="display:flex;gap:8px;margin-top:8px"><input type="text" id="pn" maxlength="40" placeholder="Nombre (p. ej. Mi tarta de 20 cm)"><button class="btn primary" data-act="saveprof2">Guardar</button></div>' +
      '<div class="sub" style="margin-top:14px">Datos</div><div class="actions"><button class="btn" data-act="export">Exportar JSON</button><button class="btn" data-act="import">Importar JSON</button><button class="btn" data-act="reset">Restablecer valores</button></div>' +
      '<div class="sub" style="margin-top:14px">Visualización</div><label class="sw"><input type="checkbox" id="evt"' + (document.body.classList.contains('noev') ? '' : ' checked') + '><i></i><span>Mostrar etiquetas de evidencia (F / P / I)</span></label>' +
      '<p class="muted"><span class="ev F">F</span> dato de fuente citada · <span class="ev P">P</span> práctica habitual · <span class="ev I">I</span> inferencia a calibrar.</p>' +
      '<div class="sub" style="margin-top:14px">Instalar</div><p class="muted">En Chrome, Edge o Android pulsa «Instalar» (si aparece). En iPhone: Compartir → «Añadir a pantalla de inicio». Necesita abrirse desde una dirección https (por ejemplo GitHub Pages) o localhost; después funciona sin conexión.</p>' +
      '<div class="actions" style="margin-top:10px"><button class="btn primary" data-close>Cerrar</button></div>';
  }
  function saveProfile(name) {
    name = (name || '').trim(); if (!name) { toast('Pon un nombre'); return false; }
    var ps = profiles(); ps[name] = JSON.parse(JSON.stringify(S)); LS.set(KP, ps); toast('Perfil guardado'); return true;
  }
  function doImport() {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(r.result);
          if (!d || d.app !== 'tarta-calculadora') throw new Error('formato');
          if (d.estado) { S = Object.assign({}, E.DEFAULTS, d.estado); LS.set(KS, S); }
          if (d.perfiles) LS.set(KP, Object.assign({}, profiles(), d.perfiles));
          if (d.fichas) LS.set(KF, d.fichas);
          syncInputs(); refresh(); toast('Datos importados'); dlgClose();
        } catch (e) { toast('Archivo no válido'); }
      };
      r.readAsText(f);
    };
    inp.click();
  }

  /* ───────── Eventos ───────── */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.dataset.act;
    if (a === 'copy') copyText(E.textoReceta(S, R));
    else if (a === 'print') window.print();
    else if (a === 'saveprof') dlgOpen('<h3>Guardar perfil</h3><input type="text" id="pn2" maxlength="40" placeholder="Nombre (p. ej. Mi tarta de 20 cm)"><div class="actions" style="margin-top:12px"><button class="btn primary" data-act="saveprof3">Guardar</button><button class="btn" data-close>Cancelar</button></div>');
    else if (a === 'saveprof3') { if (saveProfile($('#pn2').value)) dlgClose(); }
    else if (a === 'saveprof2') { if (saveProfile($('#pn').value)) dlgOpen(menuHtml()); }
    else if (a === 'loadprof') { var p = profiles()[b.dataset.n]; if (p) { S = Object.assign({}, E.DEFAULTS, p); LS.set(KS, S); syncInputs(); refresh(); dlgClose(); toast('Perfil cargado'); } }
    else if (a === 'delprof') { var ps = profiles(); delete ps[b.dataset.n]; LS.set(KP, ps); dlgOpen(menuHtml()); }
    else if (a === 'export') download('tarta-datos.json', JSON.stringify({ app: 'tarta-calculadora', v: 1, estado: S, perfiles: profiles(), fichas: fichas() }, null, 2), 'application/json');
    else if (a === 'import') doImport();
    else if (a === 'reset') { if (confirm('¿Restablecer todos los valores a los de la guía? Los perfiles y fichas no se borran.')) { S = Object.assign({}, E.DEFAULTS, { estacion: E.seasonFromDate() }); LS.set(KS, S); syncInputs(); refresh(); dlgClose(); toast('Valores restablecidos'); } }
    else if (a === 'newficha') openFichaDialog();
    else if (a === 'exportfichas') copyText(fichas().map(fichaTexto).join('\n\n---\n\n'));
    else if (a === 'dlfichas') download('tarta-fichas-calibracion.txt', fichas().map(fichaTexto).join('\n\n---\n\n') + '\n', 'text/plain');
    else if (a === 'delficha') { var fs = fichas(); fs.splice(+b.dataset.i, 1); LS.set(KF, fs); renderResult(); }
    else if (a === 'sug') applySuggestion(b.dataset.t, +b.dataset.v);
  });
  dlg.addEventListener('change', function (e) { if (e.target.id === 'evt') { document.body.classList.toggle('noev', !e.target.checked); LS.set(KE, !e.target.checked); } });
  $('#btnMenu').addEventListener('click', function () { dlgOpen(menuHtml()); });
  $('#panelForm').addEventListener('input', onChange);
  $('#panelForm').addEventListener('change', onChange);
  $('#panelResult').addEventListener('toggle', function (e) { var d = e.target; if (d && d.dataset && d.dataset.id) openIds[d.dataset.id] = d.open; }, true);
  $('#tabForm').addEventListener('click', function () { document.body.classList.remove('show-result'); $('#tabForm').classList.add('on'); $('#tabRes').classList.remove('on'); window.scrollTo(0, 0); });
  $('#tabRes').addEventListener('click', function () { document.body.classList.add('show-result'); $('#tabRes').classList.add('on'); $('#tabForm').classList.remove('on'); window.scrollTo(0, 0); });

  /* PWA: instalación y conexión */
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; $('#btnInstall').hidden = false; });
  $('#btnInstall').addEventListener('click', function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function () { deferred = null; $('#btnInstall').hidden = true; }); });
  window.addEventListener('appinstalled', function () { $('#btnInstall').hidden = true; toast('Instalada'); });
  var net = function () { $('#netPill').hidden = navigator.onLine !== false; };
  window.addEventListener('online', net); window.addEventListener('offline', net); net();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* sin SW */ }); });
  }

  /* Inicio: todas las secciones del formulario plegadas */
  if (LS.get(KE, false)) document.body.classList.add('noev');
  buildForm();
  refreshOptions();
  refresh();
  if (location.hash === '#resultado') $('#tabRes').click();
  window.__tarta = { get S() { return S; }, get R() { return R; }, refresh: refresh };
})();
