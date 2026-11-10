/* Motor de cálculo — Tarta de queso de La Viña (secciones 14-16 de la guía).
   Sin dependencias, sin DOM. Funciona en navegador (window.TartaEngine) y en Node (module.exports).
   Evidencia: F = fuente citada · P = práctica habitual · I = inferencia calibrable. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TartaEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────────── Constantes de la guía ───────────── */
  var COMERCIALES = [14, 16, 18, 20, 22, 24, 26, 28, 30];
  var RACION = { pequena: 100, normal: 150, generosa: 200 };
  var APETITO = { bajo: 0.85, medio: 1, alto: 1.2 };
  var HMASA = { baja: 4.2, media: 4.7, alta: 5.2 };
  var PERFILES = {
    rivera_original: { n: 'Rivera original (dulce)', q: 0.490, nt: 0.202, a: 0.163, h: 0.135, f: 0.009, s: 0 },
    casera_abc:      { n: 'Casera ABC (defecto)',    q: 0.467, nt: 0.231, a: 0.140, h: 0.152, f: 0.009, s: 0.001 },
    menos_dulce:     { n: 'Menos dulce',             q: 0.490, nt: 0.240, a: 0.100, h: 0.160, f: 0.009, s: 0.001 },
    extra_cremosa:   { n: 'Extra cremosa',           q: 0.460, nt: 0.270, a: 0.130, h: 0.139, f: 0,     s: 0.001 },
    firme:           { n: 'Firme',                   q: 0.470, nt: 0.200, a: 0.140, h: 0.170, f: 0.019, s: 0.001 }
  };
  var HUEVO = { S: { c: 48, e: 42 }, M: { c: 58, e: 51 }, L: { c: 68, e: 60 }, XL: { c: 76, e: 67 } };
  var T_COLOR = { dorado_claro: 190, dorado: 200, caoba: 210, muy_oscuro: 220 };
  var T_MODO = { estatico_arriba_abajo: 0, ventilado: -20, ventilado_con_resistencia_inferior: -15, freidora_aire: -15, gas: 0, horno_pequeno: -10, microondas_combi: 0, vapor_combi: 0, horno_pizza_lena: 0 };
  var SIN_DATO_HORNO = ['microondas_combi', 'vapor_combi', 'horno_pizza_lena'];
  var F_MODO = { freidora_aire: 0.78, ventilado: 0.95 };
  var T_TEXTURA = { liquida_cremosa: -10, cremosa: 0, algo_firme: 4, firme: 8 };
  var REPOSO = { corto_15min: 15, medio_1h: 60, largo_4_5h: 270 };
  var NEVERA_H = { no: 0, '2_4h': 3, una_noche: 10 };
  var PULL_TW = { liquida_cremosa: 46, cremosa: 49, algo_firme: 52, firme: 68 };
  var PULL_CR = { liquida_cremosa: 60, cremosa: 66, algo_firme: 68, firme: 71 };
  var CONSUMO_H = { consumir_36h: 36, hasta_3_dias: 72, congelar: 2160 };
  var OSCUROS = ['metal_oscuro', 'antiadherente_oscuro'];
  var DULCE = {
    blanquilla:        { n: 'Azúcar blanquilla',       m: 1.00, d: 1.00 },
    moreno_integral:   { n: 'Azúcar moreno / integral', m: 1.00, d: 1.00 },
    panela_coco:       { n: 'Panela / azúcar de coco', m: 1.00, d: 0.90 },
    miel:              { n: 'Miel',                    m: 0.75, d: 1.33, nata: -0.18, dT: -15, liq: true },
    sirope_agave_arce: { n: 'Sirope de agave / arce',  m: 0.75, d: 1.33, nata: -0.25, dT: -15, liq: true },
    eritritol:         { n: 'Eritritol',               m: 0.70, d: 0.70 },
    allulosa:          { n: 'Allulosa',                m: 1.30, d: 0.70, dT: -10, dtPct: -10 },
    xilitol:           { n: 'Xilitol',                 m: 1.00, d: 1.00 },
    estevia:           { n: 'Estevia',                 env: true },
    sucralosa:         { n: 'Sucralosa',               env: true },
    edulcorante_con_volumen: { n: 'Edulcorante con volumen de azúcar', env: true },
    leche_condensada:  { n: 'Leche condensada',        nc: true }
  };
  var CERO_CAL = ['eritritol', 'estevia', 'sucralosa', 'edulcorante_con_volumen'];

  /* Modo de ortodoxia: rango mínimo en el que se permite cada opción (0 estricta, 1 flexible, 2 libre). */
  var ORTO_RANK = { estricta: 0, flexible: 1, libre: 2 };
  var ORTO = {
    queso_tipo: { crema_bloque: 0, crema_tarrina: 0, _: 2 },
    nata_tipo: { montar_35: 0, montar_mayor_38: 0, _: 2 },
    huevo_origen: { _: 0 },
    harina_tipo: { trigo: 0, maicena: 1, _: 2 },
    dulce_tipo: { blanquilla: 0, moreno_integral: 1, _: 2 },
    dulce_segundo_tipo: { ninguno: 0, blanquilla: 0, moreno_integral: 1, _: 2 },
    vainilla: { ninguna: 0, _: 1 },
    citricos: { ninguno: 0, _: 1 },
    licor: { ninguno: 0, _: 2 },
    cobertura: { ninguna: 0, _: 2 }
  };
  var ORTO_LABEL = { queso_tipo: 'queso', nata_tipo: 'nata', harina_tipo: 'harina', dulce_tipo: 'endulzante', dulce_segundo_tipo: 'segundo endulzante', vainilla: 'vainilla', citricos: 'cítricos', licor: 'licor', cobertura: 'cobertura' };
  function rankOf(campo, valor) {
    var t = ORTO[campo]; if (!t) return 0;
    return t[valor] != null ? t[valor] : (t._ != null ? t._ : 0);
  }

  /* Versiones publicadas (sección 2). n: nata ml, a: azúcar g (o texto), q: queso g */
  var PUBLICADAS = [
    { f: 'ABC: original de La Viña', q: 1200, n: 500, a: 400, h: '7', fl: '1,5 cda', m: '26 cm', o: 'sin dato', t: '65-70 min' },
    { f: 'Diario Vasco / Onda Cero (Rivera)', q: 1000, n: 500, a: 400, h: '7', fl: '1 cda', m: '~26 cm', o: '200 ºC arriba y abajo', t: '45 min', rivera: true },
    { f: 'ABC De Rechupete: casera', q: 1000, n: 500, a: 300, h: '5 XL', fl: '15 g', m: '24 cm', o: '190 ºC, centro', t: '55 min (45-50 si más líquida)' },
    { f: 'ABC Gurmé', q: 1000, n: 400, a: 200, h: '6', fl: '1 cda', m: '22 cm', o: '200 ºC sin ventilador', t: '50-60 min' },
    { f: 'Heraldo', q: 750, n: 400, a: 270, h: '5 L', fl: '25 g', m: '22 cm', o: '200 ºC, 2.º nivel', t: '45 min (35 si líquida)' },
    { f: 'Bon Viveur', q: 570, n: 285, a: 230, h: '4', fl: '10 g', m: '18 cm', o: '200 ºC, media-baja', t: '40 min' },
    { f: 'Invitado de Invierno', q: 570, n: 280, a: 230, h: '4', fl: '1 cda', m: '20 cm', o: '215-220 ºC, inferior', t: '40 min' },
    { f: 'RTVE', q: 1000, n: 500, a: 400, h: '7', fl: '1 cda', m: 'desmontable', o: '200 ºC, media', t: '40-50 min' },
    { f: 'Masala Monk', q: 750, n: 310, a: 200, h: '220 g batidos', fl: '30 g', m: '20 cm', o: '220 ºC (200 con ventilador)', t: '45-55 min' },
    { f: 'ThermoWorks', q: 1000, n: 500, a: '350-400', h: '5-7', fl: '30 g', m: '23-25 cm', o: '215/227 ºC, luego 150 ºC', t: 'sonda 49 ºC' },
    { f: 'Cookpad (ligera)', q: 600, n: 300, a: 70, h: '4', fl: 'integral', m: 'sin dato', o: '180 ºC', t: '40 min', nota: 'yogur griego y eritritol' }
  ];

  var CIUDADES_NADA = null;

  var DEFAULTS = {
    /* A. Comensales */
    raciones: 10, tamano_racion: 'normal', racion_personalizada_g: 150, ocasion: 'postre_comida', ninos: 0, apetito: 'medio',
    repetir_racion: false, dietas: [], alergias: [], grupo_riesgo: [], preferencia_queso: 'medio',
    /* B. Molde y papel */
    modo_calculo: 'por_raciones', forma: 'redondo', diametro_cm: 0, lado_a_cm: 0, lado_b_cm: 0, ind_diametro_cm: 9, n_individuales: 6,
    altura_molde_cm: 7, material_molde: 'aluminio_claro', desmontable: true, papel_hojas: 'dos_hojas', papel_sobresale_cm: 5, papel_mojado: true,
    engrasado_molde: 'mantequilla', bandeja_debajo: false, dos_moldes: false,
    /* C. Ingredientes */
    ortodoxia: 'flexible', perfil: 'auto',
    queso_tipo: 'crema_tarrina', queso_temp: 'ambiente_20C', queso_fuerte_g: 0, queso_mezcla_pct: 0,
    nata_tipo: 'montar_35', nata_grasa_pct: 35, nata_temp: 'atemperada',
    huevo_talla: 'L', huevo_origen: 'normal', huevo_temp: 'ambiente', huevo_modo: 'por_peso',
    harina_tipo: 'trigo', harina_g_por_kg_queso: 0,
    dulce_tipo: 'blanquilla', dulce_pct_sustituido: 0, dulce_segundo_tipo: 'ninguno', dulce_segundo_pct: 0, dulce_equiv_envase: 100,
    azucar_g_por_kg_queso_manual: 0, miel_tipo: 'flores', xilitol_mascotas: false,
    grasa_uso: ['engrasar_molde'], grasa_tipo: 'mantequilla', grasa_en_masa_g: 0, base_galleta_g: 0,
    sal_g: 0, vainilla: 'ninguna', citricos: 'ninguno', licor: 'ninguno', cobertura: 'ninguna',
    /* D. Horno */
    horno_tipo: 'estatico_arriba_abajo', termometro_horno: false, horno_error_c: 0, rejilla: 'media_baja', precalentado_min: 30,
    giro_molde: 'una_vez', cubrir_aluminio: 'si_necesario', gratinador_final: false, bandejas_en_horno: 1, piedra_o_bandeja_caliente: false,
    esquema_calor: 'constante', sonda_temperatura: false,
    /* E. Entorno y logística */
    temp_cocina_c: 22, estacion: 'entretiempo', altitud_m: 0, hora_servicio: '14:30', horas_hasta_servir: 25, nevera_disponible: true,
    transporte: false, tiempo_activo_disponible_min: 90,
    /* F. Resultado */
    textura: 'cremosa', color: 'caoba', altura_final: 'media', preferencia_dulzor: 'medio', reposo_horno: 'medio_1h',
    servicio: 'temperatura_ambiente', paso_por_nevera: 'una_noche', conservacion: 'hasta_3_dias',
    /* G. Cocinero */
    experiencia: 'intermedio', bascula: true, batidora: 'varillas_electricas', bate_velocidad_alta: false, tolerancia_riesgo_centro: 'normal',
    /* Ajustes personales (tras la ficha de calibración) */
    ajuste_temp_c: 0, ajuste_tiempo_min: 0
  };

  var SEV_ORDER = { bloqueante: 0, alta: 1, media: 2, baja: 3, info: 4 };

  /* ───────────── Utilidades ───────────── */
  function num(x, d) { x = Number(x); return isFinite(x) ? x : d; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function nearest(arr, x) {
    var best = arr[0], bd = Infinity;
    for (var i = 0; i < arr.length; i++) { var d = Math.abs(arr[i] - x); if (d < bd) { bd = d; best = arr[i]; } }
    return best;
  }
  function nf(x, d) { return Number(x).toLocaleString('es-ES', { maximumFractionDigits: d == null ? 1 : d }); }
  function fmtG(g) {
    if (g >= 1000) return nf(g / 1000, 2) + ' kg';
    if (g < 10) return nf(g, 1) + ' g';
    return Math.round(g).toLocaleString('es-ES') + ' g';
  }
  function fmtMl(ml) { return Math.round(ml).toLocaleString('es-ES') + ' ml'; }
  function fmtMin(m) {
    m = Math.round(m);
    if (m < 90) return m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return h + ' h' + (r ? ' ' + r + ' min' : '');
  }
  function parseHM(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ''));
    return m ? (+m[1]) * 60 + (+m[2]) : 14 * 60 + 30;
  }
  /* t: minutos respecto a las 00:00 del día de servir. Devuelve "HH:MM" y la etiqueta del día. */
  function dayOf(t) { return Math.floor(Math.round(t) / 1440); }
  function fmtHM(t) {
    t = Math.round(t);
    var d = Math.floor(t / 1440), m = t - d * 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }
  function dayLabel(t) {
    var d = dayOf(t);
    if (d === 0) return 'día de servir';
    if (d === -1) return 'víspera';
    if (d < -1) return Math.abs(d) + ' días antes';
    return '+' + d + ' d';
  }
  function seasonFromDate(d) {
    var m = (d || new Date()).getMonth() + 1;
    if (m >= 6 && m <= 9) return 'verano';
    if (m === 12 || m <= 2) return 'invierno';
    return 'entretiempo';
  }
  function tAtemperado(tc) {
    if (tc < 19) return 120;
    if (tc < 24) return 90;
    if (tc < 28) return 60;
    return 40;
  }
  function autoPerfil(S) {
    if (S.preferencia_dulzor === 'poco') return 'menos_dulce';
    if (S.preferencia_dulzor === 'mucho') return 'rivera_original';
    if (S.textura === 'firme') return 'firme';
    if (S.textura === 'liquida_cremosa') return 'extra_cremosa';
    return 'casera_abc';
  }

  /* ───────────── Cálculo principal ───────────── */
  function compute(input) {
    var S = {}, k;
    for (k in DEFAULTS) S[k] = DEFAULTS[k];
    for (k in (input || {})) if (input[k] !== undefined && input[k] !== null) S[k] = input[k];

    var R = { alerts: [], lista: [], desglose: {} };
    var al = function (sev, msg, id) { R.alerts.push({ sev: sev, msg: msg, id: id || '' }); };
    var dietas = S.dietas || [], alergias = S.alergias || [], riesgo = S.grupo_riesgo || [];
    var hasD = function (x) { return dietas.indexOf(x) >= 0; };
    var finish = function () {
      R.alerts.sort(function (a, b) { return SEV_ORDER[a.sev] - SEV_ORDER[b.sev]; });
      R.bloqueada = R.alerts.some(function (a) { return a.sev === 'bloqueante'; });
      return R;
    };

    /* AL01 — bloqueo por alergia */
    if (alergias.length) {
      var q = [];
      if (alergias.indexOf('huevo') >= 0) q.push('huevo');
      if (alergias.indexOf('lacteos') >= 0) q.push('lácteos');
      al('bloqueante', 'Esta receta se basa en huevo y lácteos y no es compatible con la alergia a ' + q.join(' y ') + '. No hay sustitutos validados en la guía, así que no se calcula.', 'AL01');
      R.vacio = true; R.motivoBloqueo = 'alergia';
      return finish();
    }

    /* ── R1. Comensales y masa objetivo ── */
    var raciones = Math.max(1, Math.round(num(S.raciones, 10)));
    var ninos = clamp(Math.round(num(S.ninos, 0)), 0, raciones);
    var racBase = S.tamano_racion === 'personalizada' ? num(S.racion_personalizada_g, 150) : (RACION[S.tamano_racion] || 150);
    var racionG = racBase * (APETITO[S.apetito] || 1);
    var nEf = (raciones - ninos) + 0.6 * ninos;
    if (S.repetir_racion) nEf *= 1.15;
    var esInd = S.forma === 'individual' || S.forma === 'mini';
    var hObj = HMASA[S.altura_final] || 4.7;
    var nMoldes = (S.dos_moldes && !esInd) ? 2 : 1;
    var mCocida = nEf * racionG;
    var M = mCocida / 0.95;
    var A, hReal, molde = { forma: S.forma, n: nMoldes }, racionesEst = null, nUnid = 1;
    var porMolde = S.modo_calculo === 'por_molde';

    if (esInd) {
      var di = num(S.ind_diametro_cm, S.forma === 'mini' ? 6 : 9);
      A = Math.PI * Math.pow(di / 2, 2);
      molde.d = di; molde.lado = null; molde.area = A;
      if (porMolde) { nUnid = Math.max(1, Math.round(num(S.n_individuales, 6))); M = nUnid * A * 3; racionesEst = M * 0.95 / racionG; }
      else nUnid = Math.max(1, Math.ceil(M / (A * 3)));
      hReal = M / (nUnid * A);
      molde.n = nUnid;
      molde.etiqueta = nUnid + ' × ' + (S.forma === 'mini' ? 'mini' : 'individual') + ' de ' + nf(di, 0) + ' cm';
      molde.auto = false;
    } else {
      var Mt = M / nMoldes;
      var Aobj = Mt / hObj;
      if (S.forma === 'redondo') {
        var dIdeal = 2 * Math.sqrt(Aobj / Math.PI), dCom = nearest(COMERCIALES, dIdeal);
        var dUser = num(S.diametro_cm, 0);
        var d = dUser > 0 ? dUser : (porMolde ? 24 : dCom);
        A = Math.PI * Math.pow(d / 2, 2);
        molde.d = d; molde.d_ideal = dIdeal; molde.d_comercial = dCom; molde.auto = !(dUser > 0) && !porMolde;
        molde.etiqueta = nMoldes + (nMoldes > 1 ? ' moldes de ' : ' molde de ') + nf(d, 1) + ' cm';
      } else if (S.forma === 'cuadrado') {
        var aU = num(S.lado_a_cm, 0), aRec = Math.round(Math.sqrt(Aobj));
        var a = aU > 0 ? aU : (porMolde ? 20 : aRec);
        A = a * a; molde.lado_a = a; molde.lado_b = a; molde.auto = !(aU > 0) && !porMolde; molde.lado_rec = aRec;
        molde.etiqueta = nMoldes + (nMoldes > 1 ? ' moldes de ' : ' molde de ') + nf(a, 0) + ' × ' + nf(a, 0) + ' cm';
      } else {
        var a2U = num(S.lado_a_cm, 0), b2U = num(S.lado_b_cm, 0);
        var a2 = a2U > 0 ? a2U : (porMolde ? 20 : Math.round(Math.sqrt(Aobj / 1.5)));
        var b2 = b2U > 0 ? b2U : (porMolde ? 20 : Math.max(10, Math.round(Aobj / a2)));
        A = a2 * b2; molde.lado_a = a2; molde.lado_b = b2; molde.auto = !(a2U > 0 && b2U > 0) && !porMolde;
        molde.etiqueta = nMoldes + (nMoldes > 1 ? ' moldes de ' : ' molde de ') + nf(a2, 0) + ' × ' + nf(b2, 0) + ' cm';
      }
      molde.area = A;
      if (porMolde) { M = nMoldes * A * hObj; racionesEst = M * 0.95 / racionG; mCocida = M * 0.95; }
      hReal = (M / nMoldes) / A;
    }
    var hMin = hReal + 1.5;
    molde.h_real = hReal; molde.h_obj = hObj;
    molde.altura_min = Math.round(hMin * 10) / 10;
    molde.altura_rec = Math.ceil(hMin * 2) / 2;
    var dEq = 2 * Math.sqrt(A / Math.PI);
    molde.d_eq = dEq;
    var racionesMostradas = porMolde ? racionesEst : raciones;
    R.resumen = { raciones: raciones, ninos: ninos, racion_g: racionG, n_ef: nEf, M_cocida: mCocida, M: M, h_obj: hObj, molde: molde,
      raciones_est: racionesEst, modo: S.modo_calculo, raciones_mostradas: racionesMostradas };

    /* ── R2. Perfil de proporciones ── */
    var perfilKey = (S.perfil && S.perfil !== 'auto' && PERFILES[S.perfil]) ? S.perfil : autoPerfil(S);
    var P = PERFILES[perfilKey];
    var estricta = S.ortodoxia === 'estricta';
    var gQuesoTot = M * P.q, gNata = M * P.nt, gSacRef = M * P.a, gHuevo = M * P.h, gHarina = M * P.f;
    var gSal = estricta ? 0 : (num(S.sal_g, 0) > 0 ? num(S.sal_g, 0) : M * P.s);
    var azManual = num(S.azucar_g_por_kg_queso_manual, 0);
    if (azManual > 0) gSacRef = azManual * gQuesoTot / 1000;
    R.perfil = { key: perfilKey, nombre: P.n, f: P };

    /* ── Dieta y sustituciones de tipo ── */
    var quesoTipo = S.queso_tipo, nataTipo = S.nata_tipo, harinaTipo = S.harina_tipo, grasaTipo = S.grasa_tipo;
    var sinLact = hasD('sin_lactosa');
    if (hasD('celiaco') && (harinaTipo === 'trigo' || harinaTipo === 'almidon_trigo' || harinaTipo === 'avena_integral')) {
      harinaTipo = 'maicena';
      al('media', 'Dieta celíaca: se usa maicena (almidón de maíz) en lugar de harina de trigo. Vigila la contaminación cruzada (molde, batidora, harina).', 'celiaco');
    } else if (hasD('celiaco')) {
      al('info', 'Dieta celíaca: vigila la contaminación cruzada (molde, batidora, utensilios) y revisa las etiquetas.', 'celiaco');
    }
    if (sinLact) {
      if (quesoTipo !== 'sin_lactosa' || (nataTipo !== 'sin_lactosa' && nataTipo !== 'vegetal')) {
        al('media', 'Sin lactosa: usa queso crema y nata sin lactosa (y mantequilla sin lactosa para engrasar).', 'sinlactosa');
      }
      quesoTipo = 'sin_lactosa'; if (nataTipo !== 'vegetal') nataTipo = 'sin_lactosa';
      if (grasaTipo === 'mantequilla' || grasaTipo === 'mantequilla_sin_sal') grasaTipo = 'mantequilla_sin_lactosa';
    }

    /* ── Endulzantes (R3) ── */
    var p1 = clamp(num(S.dulce_pct_sustituido, 0) / 100, 0, 1);
    var t1 = S.dulce_tipo, t2 = S.dulce_segundo_tipo;
    if (t1 === 'blanquilla') p1 = 0;
    var p2 = (t2 && t2 !== 'ninguno' && t2 !== 'blanquilla') ? clamp(num(S.dulce_segundo_pct, 0) / 100, 0, 1 - p1) : 0;
    var equiv = Math.max(1, num(S.dulce_equiv_envase, 100)) / 100;
    var dulces = [];
    var addDulce = function (tipo, p) {
      var def = DULCE[tipo]; if (!def || p <= 0) return null;
      if (def.nc) {
        al('alta', def.n + ': no hay datos fiables de conversión. Se mantiene el azúcar del perfil; haz una prueba pequeña antes.', 'dulce_nc');
        return { tipo: tipo, p: 0, masa: 0, d: 1, nc: true };
      }
      var m = def.env ? p * gSacRef * equiv : p * gSacRef * def.m;
      var d = def.env ? 1 / equiv : def.d;
      var o = { tipo: tipo, nombre: def.n, p: p, masa: m, d: d, def: def };
      dulces.push(o); return o;
    };
    var o1 = (t1 !== 'blanquilla') ? addDulce(t1, p1) : null;
    var o2 = p2 > 0 ? addDulce(t2, p2) : null;
    var pBase = 1 - (o1 ? o1.p : 0) - (o2 ? o2.p : 0);
    var masaBase = pBase * gSacRef;
    var masaLiq = 0, ajNata = 0, dTend = 0, fEd = 1;
    dulces.forEach(function (o) {
      if (o.def.liq) { masaLiq += o.masa; ajNata += o.def.nata * o.masa; }
      if (o.tipo === 'allulosa') { dTend += o.def.dT * o.p; fEd *= (1 + o.def.dtPct / 100 * o.p); }
    });
    if (masaLiq > 0) dTend += -15 * Math.min(1, masaLiq / (0.10 * M));
    var sumaDulzor = masaBase + dulces.reduce(function (a, o) { return a + o.masa * o.d; }, 0);
    var IDz = sumaDulzor / M;
    var clsDz = IDz < 0.11 ? 'poco dulce' : IDz <= 0.15 ? 'medio' : 'muy dulce';
    var gAzCero = dulces.reduce(function (a, o) { return a + (CERO_CAL.indexOf(o.tipo) >= 0 ? o.p * gSacRef : 0); }, 0);
    R.dulce = { IDz: IDz, clase: clsDz, g_sac_ref: gSacRef, masa_base: masaBase, partes: dulces, aj_nata_ml: ajNata, dT: dTend, f_t: fEd };
    var sustTotal = (o1 ? o1.p : 0) + (o2 ? o2.p : 0);
    if (t1 !== 'blanquilla' && num(S.dulce_pct_sustituido, 0) === 0 && !DULCE[t1].nc) {
      al('info', 'Has elegido ' + DULCE[t1].n.toLowerCase() + ' pero el porcentaje sustituido es 0 %: se usa solo azúcar blanquilla.', 'dulce_pct0');
    }

    /* ── Ingredientes: pesos ── */
    var gFuerte = 0;
    if (!estricta && S.preferencia_queso === 'intenso' && num(S.queso_fuerte_g, 0) > 0) gFuerte = clamp(num(S.queso_fuerte_g, 0), 0, 20) * gQuesoTot / 1000;
    var gQuesoCrema = gQuesoTot - gFuerte;
    var pctMezcla = clamp(num(S.queso_mezcla_pct, 0), 0, 100);
    if (quesoTipo === 'mezcla_crema_mascarpone' && pctMezcla === 0) pctMezcla = 50;
    var gMasc = (quesoTipo === 'mezcla_crema_mascarpone' || pctMezcla > 0) ? gQuesoCrema * pctMezcla / 100 : 0;
    var mlNataBase = gNata / 0.99;
    var mlNata = Math.max(0, mlNataBase + ajNata);
    var huevoDef = HUEVO[S.huevo_talla] || HUEVO.L;
    var nHuevos = Math.max(1, Math.round(gHuevo / huevoDef.e));
    var pasteur = S.huevo_origen === 'pasteurizado_liquido';
    var gHarinaFin = harinaTipo === 'ninguna' ? 0 : (num(S.harina_g_por_kg_queso, 0) > 0 ? num(S.harina_g_por_kg_queso, 0) * gQuesoTot / 1000 : gHarina);
    var galleta = num(S.base_galleta_g, 0) > 0 && (S.grasa_uso || []).indexOf('base_galleta') >= 0 ? num(S.base_galleta_g, 0) : 0;
    var gGrasaBase = galleta * 0.30;
    var gGrasaMasa = (S.grasa_uso || []).indexOf('en_masa') >= 0 ? num(S.grasa_en_masa_g, 0) : 0;
    var masaReal = gQuesoTot + mlNata * 0.99 + masaBase + dulces.reduce(function (a, o) { return a + o.masa; }, 0) + gHuevo + gHarinaFin + gSal + gGrasaMasa;
    R.cantidades = { queso: gQuesoTot, queso_crema: gQuesoCrema, queso_fuerte: gFuerte, mascarpone: gMasc, nata_ml: mlNata, nata_g: mlNata * 0.99, azucar_ref: gSacRef,
      azucar_blanquilla: masaBase, huevo_g: gHuevo, n_huevos: nHuevos, harina: gHarinaFin, sal: gSal, masa_real: masaReal, galleta: galleta, grasa_base: gGrasaBase };

    /* ── R6 atemperado ── */
    var tCocina = num(S.temp_cocina_c, 22);
    var tAtemp = tAtemperado(tCocina);

    /* ── R4. Temperatura y tiempo ── */
    var Tc = T_COLOR[S.color] || 210;
    var Tmod = T_MODO[S.horno_tipo] != null ? T_MODO[S.horno_tipo] : 0;
    var Tmat = OSCUROS.indexOf(S.material_molde) >= 0 ? -10 : 0;
    var err = S.termometro_horno ? num(S.horno_error_c, 0) : 0;
    var ajT = num(S.ajuste_temp_c, 0);
    var Traw = Tc + Tmod + Tmat + dTend + ajT - err;
    var T = clamp(Math.round(Traw / 5) * 5, 180, 230);
    var t0 = esInd ? 20 : 40 + 4 * Math.max(0, dEq - 20);
    var fH = clamp(hReal / 4.7, 0.85, 1.15);
    if (esInd) fH = 1;
    var fModo = F_MODO[S.horno_tipo] || 1;
    var tTex = T_TEXTURA[S.textura] != null ? T_TEXTURA[S.textura] : 0;
    var tRiesgo = S.tolerancia_riesgo_centro === 'prudente' ? 2 : S.tolerancia_riesgo_centro === 'atrevido' ? -2 : 0;
    var ajM = num(S.ajuste_tiempo_min, 0);
    var t = t0 * fH * fModo * fEd + tTex + ajM + tRiesgo;
    t = Math.max(10, Math.round(t)); /* la guía trabaja con minutos enteros (43 min → ventana 32-54) */
    var principiante = S.experiencia === 'principiante';
    var kCtl = principiante ? 0.60 : 0.70, vLo = principiante ? 0.70 : 0.75, vHi = principiante ? 1.30 : 1.25;
    var dosT = S.esquema_calor === 'dos_tiempos';
    R.horno = { T: T, T_raw: Traw, tipo: S.horno_tipo, t: t, t0: t0, f_h: fH, f_modo: fModo, f_ed: fEd, t_tex: tTex,
      ventana: [vLo * t, vHi * t], control: kCtl * t, rejilla: S.rejilla, precalentado: num(S.precalentado_min, 30) };
    if (esInd) { R.horno.ventana = [15, 25]; R.horno.control = 14; }
    R.horno.giros = S.giro_molde === 'cada_7_5_min' ? [7.5, 15, 22.5, 30].filter(function (x) { return x < t; }) : S.giro_molde === 'una_vez' ? [Math.round(t / 2)] : [];
    R.horno.aluminio = S.cubrir_aluminio === 'desde_mitad' ? Math.round(t / 2) : null;
    R.horno.dos_tiempos = dosT ? { fase1_min: 30, T1: T, T2: 150, fase2_est: Math.max(5, t - 30) } : null;
    R.desglose.temperatura = [
      { n: 'Color ' + String(S.color).replace(/_/g, ' '), v: Tc, ev: 'P' },
      { n: 'Tipo de horno', v: Tmod, ev: Tmod ? 'F' : 'I' },
      { n: 'Material del molde', v: Tmat, ev: 'I' },
      { n: 'Endulzante', v: Math.round(dTend * 10) / 10, ev: 'I' },
      { n: 'Ajuste personal', v: ajT, ev: 'P' },
      { n: 'Error del horno medido', v: -err, ev: 'F' }
    ].filter(function (x) { return x.v !== 0 || x.n.indexOf('Color') === 0; });
    R.desglose.tiempo = [
      { n: 'Base por diámetro equivalente (' + nf(dEq, 1) + ' cm)', v: t0, ev: 'I', tipo: 'abs' },
      { n: 'Altura de masa ' + nf(hReal, 2) + ' cm ÷ 4,7', v: fH, ev: 'I', tipo: 'x' },
      { n: 'Modo del horno', v: fModo, ev: 'P', tipo: 'x' },
      { n: 'Endulzante', v: fEd, ev: 'I', tipo: 'x' },
      { n: 'Textura', v: tTex, ev: 'F', tipo: 'min' },
      { n: 'Tolerancia al riesgo del centro', v: tRiesgo, ev: 'I', tipo: 'min' },
      { n: 'Ajuste personal', v: ajM, ev: 'P', tipo: 'min' }
    ].filter(function (x) { return x.tipo === 'abs' || (x.tipo === 'x' ? Math.abs(x.v - 1) > 1e-9 : x.v !== 0); });

    /* ── R9 punto de cocción ── */
    var ajPull = (riesgo.length ? 0 : (S.tolerancia_riesgo_centro === 'prudente' ? 2 : S.tolerancia_riesgo_centro === 'atrevido' ? -2 : 0));
    var pullTW = PULL_TW[S.textura] + ajPull, pullCR = PULL_CR[S.textura] + ajPull;
    if (riesgo.length && !pasteur && S.textura === 'firme') pullCR = Math.max(pullCR, 71);
    var blanda = S.textura === 'liquida_cremosa' || S.textura === 'cremosa';
    R.punto = { pull_tw: pullTW, pull_cr: pullCR, sonda: !!S.sonda_temperatura, textura: S.textura, color: S.color };

    /* ── R5 reposo, enfriado y servicio ── */
    var reposo = REPOSO[S.reposo_horno] != null ? REPOSO[S.reposo_horno] : 60;
    var enf = Math.max(120, 0.08 * M);
    var pasoNev = S.paso_por_nevera;
    if (!S.nevera_disponible && pasoNev !== 'no') {
      al('media', 'No tienes nevera disponible: se calcula sin paso por nevera.', 'sin_nevera');
      pasoNev = 'no';
    }
    var neveraMin = (NEVERA_H[pasoNev] || 0) * 60;
    var sacarMin = 0;
    if (neveraMin > 0) sacarMin = S.servicio === 'fria' ? 0 : S.servicio === 'templada' ? 30 : 60;
    if (S.servicio === 'fria' && pasoNev === 'no') al('info', 'Servicio frío sin paso por nevera: no se enfriará; elige nevera o servicio a temperatura ambiente.', 'fria_sin_nevera');
    var consumoH = CONSUMO_H[S.conservacion] || 72;
    R.reposo = { reposo_horno: reposo, enfriado: enf, nevera_min: neveraMin, nevera_h: NEVERA_H[pasoNev] || 0, sacar_min: sacarMin, consumo_h: consumoH, paso_nevera: pasoNev };

    /* ── R7 cronograma hacia atrás ── */
    var Hs = parseHM(S.hora_servicio);
    var precal = Math.max(0, num(S.precalentado_min, 30));
    var tMin = tAtemp + 15 + t + reposo + enf + neveraMin + sacarMin;
    var horas = num(S.horas_hasta_servir, 25) * 60;
    var tA, insuficiente = horas < tMin - 1e-6;
    tA = Hs - (insuficiente ? tMin : horas);
    var tMez = tA + tAtemp, tHor = tMez + 15, tPre = tHor - precal, tSal = tHor + t, tFinRep = tSal + reposo, tFinEnf = tFinRep + enf;
    var tSacarNev = Hs - sacarMin;
    R.t_min_total = tMin; R.insuficiente = insuficiente;
    var C = [];
    var add = function (id, n, tt, extra) { C.push({ id: id, n: n, t: tt, hora: fmtHM(tt), dia: dayLabel(tt), extra: extra || '' }); };
    add('atemp', 'Sacar de la nevera queso, nata y huevos (atemperar ' + tAtemp + ' min)', tA);
    add('precal', 'Encender el horno a ' + T + ' ºC (' + precal + ' min de precalentado)', tPre);
    add('mezcla', 'Forrar el molde y mezclar (≈ 15 min)', tMez);
    add('hornear', 'Hornear (rejilla ' + String(S.rejilla).replace(/_/g, ' ') + ')', tHor);
    add('control', 'Primer control visual', tHor + R.horno.control);
    add('sacar', 'Sacar del horno cuando esté caoba y tiemble (ventana ' + Math.round(R.horno.ventana[0]) + '-' + Math.round(R.horno.ventana[1]) + ' min) y apagar', tSal);
    add('finreposo', 'Fin del reposo en el horno apagado (puerta entreabierta, ' + fmtMin(reposo) + ')', tFinRep);
    if (neveraMin > 0) {
      add('nevera', 'Enfriada a temperatura ambiente en el molde (' + fmtMin(enf) + '): tapar y a la nevera', tFinEnf);
      if (sacarMin > 0) add('sacarnev', 'Sacar de la nevera (' + sacarMin + ' min antes de servir)', tSacarNev);
    } else {
      add('enfriado', 'Enfriada a temperatura ambiente en el molde (' + fmtMin(enf) + '); desmoldar en frío', tFinEnf);
    }
    add('servir', 'Servir', Hs);
    C.sort(function (a, b) { return a.t - b.t; });
    R.cronograma = C;
    R.nevera_real_min = neveraMin > 0 ? Math.max(0, tSacarNev - tFinEnf) : 0;
    R.espera_ambiente_min = neveraMin > 0 ? 0 : Math.max(0, Hs - tFinEnf);

    /* ── R10 energía ── */
    var kcal = 3.05 * racionG - 4 * gAzCero / Math.max(1, nEf);
    R.energia = { kcal_racion: kcal, kcal_base: 3.05 * racionG, ajuste: 4 * gAzCero / Math.max(1, nEf), g_azucar_cero: gAzCero };

    /* ── Lista de ingredientes ── */
    var L = R.lista;
    var addI = function (n, q, nota, cat) { L.push({ n: n, q: q, nota: nota || '', cat: cat || '' }); };
    var nombresQueso = { crema_bloque: 'Queso crema en bloque', crema_tarrina: 'Queso crema en tarrina', mascarpone: 'Mascarpone', mezcla_crema_mascarpone: 'Queso crema', fresco_batido: 'Queso fresco batido', ricotta_requeso: 'Ricotta / requesón', artesano: 'Queso crema artesano', light: 'Queso crema light', sin_lactosa: 'Queso crema sin lactosa', batido_montado: 'Queso batido montado' };
    addI(nombresQueso[quesoTipo] || 'Queso crema', fmtG(gQuesoCrema - gMasc), (S.queso_temp === 'ambiente_20C' ? 'a temperatura ambiente' : S.queso_temp === 'fresco_15C' ? 'fresco (15 ºC)' : 'FRÍO: atempéralo antes'), 'lacteo');
    if (gMasc > 0) addI('Mascarpone o queso de untar de otra marca', fmtG(gMasc), nf(pctMezcla, 0) + ' % del queso', 'lacteo');
    if (gFuerte > 0) addI('Queso fuerte (azul, Cabrales, Idiazabal, cabra o Camembert)', fmtG(gFuerte), 'máx. 20 g por kilo de queso crema [F]', 'lacteo');
    var nombresNata = { montar_35: 'Nata líquida para montar (35 % grasa)', montar_mayor_38: 'Nata líquida para montar (38 % o más)', cocinar_18_20: 'Nata de cocinar (18-20 %)', leche_evaporada: 'Leche evaporada', yogur_griego: 'Yogur griego', vegetal: 'Nata vegetal', sin_lactosa: 'Nata sin lactosa' };
    var nataNota = (S.nata_temp === 'atemperada' ? 'atemperada (15 min fuera de la nevera)' : 'FRÍA: sácala 15 min antes') + (ajNata ? ' · ' + fmtMl(-ajNata) + ' menos por el endulzante líquido' : '');
    addI(nombresNata[nataTipo] || 'Nata', fmtMl(mlNata), '≈ ' + fmtG(mlNata * 0.99) + ' · ' + nataNota, 'lacteo');
    var huevoQ, huevoNota;
    if (pasteur) { huevoQ = fmtG(gHuevo); huevoNota = 'huevo líquido pasteurizado'; }
    else if (S.huevo_modo === 'por_unidades') { huevoQ = nHuevos + ' huevos ' + S.huevo_talla; huevoNota = 'peso real ≈ ' + fmtG(nHuevos * huevoDef.e) + ' sin cáscara (objetivo ' + fmtG(gHuevo) + ')'; }
    else { huevoQ = fmtG(gHuevo); huevoNota = '≈ ' + nHuevos + ' huevos ' + S.huevo_talla + ' · pesa los huevos sin cáscara, de uno en uno'; }
    addI('Huevos' + (S.huevo_origen === 'campero' ? ' camperos' : S.huevo_origen === 'ecologico' ? ' ecológicos' : ''), huevoQ, huevoNota + (S.huevo_temp === 'frio' ? ' · FRÍOS: atempéralos' : ''), 'huevo');
    if (masaBase > 0.05) addI('Azúcar blanquilla', fmtG(masaBase), '', 'dulce');
    dulces.forEach(function (o) {
      var nota = o.def.env ? 'según la equivalencia del envase (' + nf(equiv * 100, 0) + ' g por 100 g de azúcar)' : nf(o.p * 100, 0) + ' % del azúcar × ' + nf(o.def.m, 2).replace('.', ',');
      if (o.tipo === 'miel') nota += ' · miel ' + String(S.miel_tipo || 'flores').replace(/_/g, ' ');
      addI(o.nombre, fmtG(o.masa), nota, 'dulce');
    });
    if (gHarinaFin > 0) {
      var nomH = { trigo: 'Harina de trigo', maicena: 'Maicena (almidón de maíz)', almidon_trigo: 'Almidón de trigo', harina_arroz: 'Harina de arroz', avena_integral: 'Avena / harina integral', mezcla_sin_gluten: 'Mezcla de harinas sin gluten' };
      var nCda = gHarinaFin / 14;
      addI(nomH[harinaTipo] || 'Harina', fmtG(gHarinaFin), '≈ ' + (Math.abs(nCda - 1) < 0.08 ? '1 cucharada rasa' : nf(nCda, 1) + ' cucharadas rasas') + ' · tamizada', 'harina');
    } else addI('Harina', '0 g', 'sin harina: textura más fundente', 'harina');
    if (gSal > 0.05) addI('Sal', fmtG(gSal), 'una pizca', 'base');
    if (S.vainilla !== 'ninguna') addI('Vainilla (' + S.vainilla + ')', 'al gusto', 'no tradicional [F]', 'extra');
    if (S.citricos !== 'ninguno') addI('Ralladura de ' + (S.citricos === 'ralladura_limon' ? 'limón' : 'naranja'), 'al gusto', 'no tradicional [F]', 'extra');
    if (S.licor !== 'ninguno') addI('Licor (' + S.licor + ')', 'al gusto', 'no tradicional; añade líquido: resta nata en la misma cantidad [I]', 'extra');
    if (galleta > 0) { addI('Galleta triturada (base)', fmtG(galleta), 'variante no tradicional', 'base'); addI('Mantequilla para la base', fmtG(gGrasaBase), '≈ 60 g por cada 200 g de galleta [F/I]', 'base'); }
    if (gGrasaMasa > 0) addI('Grasa en la masa (' + String(grasaTipo).replace(/_/g, ' ') + ')', fmtG(gGrasaMasa), 'sin fuente tradicional; no recomendado', 'extra');
    if (S.cobertura !== 'ninguna') addI('Cobertura (' + String(S.cobertura).replace(/_/g, ' ') + ')', 'al gusto', 'la original no lleva cobertura', 'extra');
    var grasaMolde = (S.grasa_uso || []).indexOf('engrasar_molde') >= 0 && S.engrasado_molde !== 'ninguno';
    if (grasaMolde) addI('Para engrasar el molde (' + String(S.engrasado_molde === 'mantequilla' ? grasaTipo : S.engrasado_molde).replace(/_/g, ' ') + ')', 'una capa fina', 'sirve para pegar el papel', 'base');
    addI('Papel de horno', (S.papel_hojas === 'una_pieza' ? '1 pieza' : '2 hojas'), (S.papel_mojado ? 'mojado, escurrido y arrugado' : 'seco') + ' · debe sobresalir ≥ 5 cm', 'base');

    /* Sin báscula (I) */
    if (!S.bascula) {
      R.sinBascula = [
        'Queso crema: ≈ ' + nf((gQuesoCrema) / 250, 1) + ' tarrinas o bloques de 250 g [I]',
        'Nata: mídela en jarra, ' + fmtMl(mlNata) + ' [I]',
        'Azúcar: ≈ ' + nf(gSacRef / 200, 1) + ' tazas (1 taza ≈ 200 g) [I]',
        'Huevos: ' + nHuevos + ' unidades talla ' + S.huevo_talla + ' [I]',
        'Harina: ≈ ' + (Math.abs(gHarinaFin / 14 - 1) < 0.08 ? '1 cucharada rasa' : nf(gHarinaFin / 14, 1) + ' cucharadas rasas') + ' (1 cda. ≈ 14 g) [I]',
        'Sal: una pizca (≈ 2 g) [F]'
      ];
    }

    /* Comparación con Rivera y con las versiones publicadas */
    var kgQ = gQuesoTot / 1000;
    R.comparacion = {
      tuya: { q: gQuesoTot, nata_kg: mlNata / kgQ, azucar_kg: (masaBase + dulces.reduce(function (a, o) { return a + o.masa; }, 0)) / kgQ, azucar_ref_kg: gSacRef / kgQ, huevo_kg: gHuevo / kgQ, harina_kg: gHarinaFin / kgQ },
      rivera: { nata_kg: 500, azucar_kg: 400, huevos: 7, harina: 'una cucharada' },
      versiones: PUBLICADAS.map(function (r) {
        var o = { f: r.f, q: r.q, n: r.n, a: r.a, h: r.h, fl: r.fl, m: r.m, o: r.o, t: r.t, nota: r.nota || '', rivera: !!r.rivera };
        o.n_kg = r.n / (r.q / 1000);
        o.a_kg = typeof r.a === 'number' ? r.a / (r.q / 1000) : null;
        return o;
      })
    };

    /* Textos del punto */
    var TXT_TEX = {
      liquida_cremosa: 'el centro baila mucho, casi líquido; saldrá tipo crema',
      cremosa: 'el centro tiembla como una gelatina y los bordes están firmes',
      algo_firme: 'solo tiembla un círculo pequeño en el centro',
      firme: 'casi sin temblor; ya no se asienta tanto al reposar'
    };
    var TXT_COL = { dorado_claro: 'dorada clara', dorado: 'dorada', caoba: 'caoba (marrón oscuro)', muy_oscuro: 'muy oscura, casi quemada' };
    R.punto.visual = 'Superficie ' + TXT_COL[S.color] + ' y bordes inflados; ' + TXT_TEX[S.textura] + '. Se asienta al reposar.';

    /* ───────────── Alertas (sección 16) ───────────── */
    /* AL02 / AL03 */
    var altMolde = num(S.altura_molde_cm, 7);
    if (altMolde < hMin - 1e-9) al('alta', 'El molde es bajo (' + nf(altMolde, 1) + ' cm) para una masa de ' + nf(hReal, 1) + ' cm: puede desbordarse. Usa uno de al menos ' + nf(molde.altura_rec, 1) + ' cm o aumenta el papel.', 'AL02');
    if (num(S.papel_sobresale_cm, 5) < 3) al('alta', 'El papel debe sobresalir al menos 3 a 5 cm: la tarta crece mucho y luego baja.', 'AL03');
    if (!S.papel_mojado) al('info', 'Humedece el papel, escúrrelo y arrúgalo para que se adapte al molde.', 'papel_seco');
    if (S.papel_hojas === 'una_pieza') al('info', 'Una sola pieza de papel evita fugas de masa por la unión, a costa de arrugas.', 'papel_una');
    if (!S.desmontable) al('info', 'Molde fijo: el papel debe permitir levantar la tarta fría.', 'molde_fijo');
    if (S.engrasado_molde === 'margarina') al('info', 'Con margarina baja en grasa el papel pega peor; usa margarina de al menos 80 % o mantequilla.', 'margarina_engrase');
    /* AL04-AL06 */
    if (quesoTipo === 'light' || quesoTipo === 'batido_montado') al('media', 'Menos grasa y más agua: la tarta cuajará distinto.', 'AL04');
    if (nataTipo === 'cocinar_18_20') al('media', 'La nata de cocinar hace que la tarta pierda sabor y cremosidad.', 'AL05');
    if (quesoTipo === 'mascarpone' || quesoTipo === 'fresco_batido' || quesoTipo === 'ricotta_requeso') al('media', 'Este queso da una textura más densa.', 'AL06');
    if (nataTipo === 'leche_evaporada' || nataTipo === 'yogur_griego' || nataTipo === 'vegetal') al('info', 'Los sustitutos de la nata dan versiones ligeras, no la tarta original.', 'nata_sust');
    if ((nataTipo === 'montar_35' || nataTipo === 'montar_mayor_38' || nataTipo === 'cocinar_18_20' || nataTipo === 'sin_lactosa') && num(S.nata_grasa_pct, 35) < 35) al('media', 'La nata debe tener al menos un 35 % de materia grasa.', 'nata_grasa');
    if (S.queso_temp === 'frio_nevera' || S.nata_temp === 'fria' || S.huevo_temp === 'frio') al('media', 'Ingredientes fríos: dan grumos y una mezcla desigual. Atempéralos.', 'frios');
    if (quesoTipo === 'artesano') al('info', 'Rivera dice que no hay marca mágica: adapta la receta al queso local.', 'queso_artesano');
    /* AL07-AL10 */
    if (S.horno_tipo === 'ventilado' || S.horno_tipo === 'ventilado_con_resistencia_inferior') al('alta', 'Horno con ventilador: se ha bajado la temperatura ' + Math.abs(Tmod) + ' ºC (las fuentes dan 15 a 25 ºC). Vigila antes de lo habitual.', 'AL07');
    if (S.horno_tipo === 'freidora_aire') al('alta', 'Freidora de aire: dora rápido por fuera y cuece más despacio por dentro. Se baja 15 ºC y se acorta el tiempo (×0,78); cubre con aluminio si se oscurece.', 'AL08');
    if (S.horno_tipo === 'gas') al('info', 'Horno de gas: la guía no tiene datos específicos. Calibra con un termómetro de horno.', 'horno_gas');
    if (SIN_DATO_HORNO.indexOf(S.horno_tipo) >= 0) al('media', 'No hay datos en la guía para este tipo de horno: la temperatura y el tiempo son una referencia; guíate por las señales visuales.', 'horno_sin_dato');
    if (S.horno_tipo === 'horno_pequeno') al('info', 'Horno pequeño: usa un molde pequeño y cuidado con el gratinador a poca distancia.', 'horno_pequeno');
    if (OSCUROS.indexOf(S.material_molde) >= 0) al('media', 'Molde oscuro: el borde se dora antes. Se ha bajado 10 ºC; baja también la rejilla.', 'AL09');
    if (S.material_molde === 'silicona') al('alta', 'La silicona conduce mal el calor y tiene poca estructura para una masa tan líquida; no hay datos fiables para esta receta.', 'AL10');
    if (S.material_molde === 'vidrio' || S.material_molde === 'ceramica') al('info', 'Vidrio o cerámica: más tiempo y menos borde dorado (I).', 'vidrio');
    if (S.rejilla === 'media_alta') al('info', 'Rejilla alta: la superficie dora antes; vigila o cubre con aluminio.', 'rejilla_alta');
    if (num(S.bandejas_en_horno, 1) > 1) al('info', 'Más bandejas reducen la corriente de aire y el calor (I): vigila el tiempo.', 'bandejas');
    if (S.piedra_o_bandeja_caliente) al('info', 'Piedra o bandeja caliente: más calor inferior; puede ayudar a un horno flojo (I).', 'piedra');
    if (S.bandeja_debajo) al('info', 'Bandeja debajo: protege el horno de fugas y modifica un poco el calor inferior (I).', 'bandeja_debajo');
    if (num(S.precalentado_min, 30) < 20) al('media', 'Menos de 20 minutos de precalentado puede dar un horneado desigual (se recomiendan unos 30).', 'precalentado');
    if (S.gratinador_final) al('info', 'Gratinador al final: solo si el centro está listo y la superficie pálida; no te apartes del horno.', 'gratinador');
    if (dosT && !S.sonda_temperatura) al('media', 'El esquema en dos tiempos (ThermoWorks) se guía por la sonda: sin ella solo tienes el temblor del centro como referencia.', 'dos_tiempos');
    if (S.termometro_horno && Math.abs(err) >= 20) al('info', 'Tu horno marca ' + nf(Math.abs(err), 0) + ' ºC de diferencia con la real: la temperatura ya está corregida.', 'error_horno');
    /* AL11-AL14, AL21 */
    if (o1 && (t1 === 'miel' || t1 === 'sirope_agave_arce') && o1.p > 0.5) al('media', 'Dora rápido: se baja el horno y se reduce la nata.', 'AL11');
    else if (masaLiq > 0) al('info', 'Endulzante líquido: dora antes; se resta nata y se baja la temperatura.', 'dulce_liq');
    if (o1 && t1 === 'moreno_integral' || o2 && t2 === 'moreno_integral') al('info', 'Azúcar moreno: dora antes y aporta sabor a caramelo; vigila el color.', 'moreno');
    if (dulces.some(function (o) { return o.tipo === 'eritritol'; })) al('media', 'El eritritol no dora y puede recristalizar al enfriar: la tarta quedará más pálida y firme.', 'AL12');
    if (dulces.some(function (o) { return o.tipo === 'allulosa'; })) al('media', 'La allulosa dora muy rápido: la superficie no indica el punto del centro. Se baja 10 ºC y el tiempo un 10 %.', 'AL13');
    if (dulces.some(function (o) { return o.tipo === 'xilitol'; })) al(S.xilitol_mascotas ? 'alta' : 'info', 'El xilitol es tóxico para los perros' + (S.xilitol_mascotas ? ': mantén la tarta fuera de su alcance.' : '.'), 'AL14');
    if (dulces.some(function (o) { return o.def.env; })) al('media', 'Estevia, sucralosa o edulcorantes de envase: se pierde volumen y estructura. Sigue la equivalencia del envase y prueba en pequeño.', 'dulce_env');
    var sinVolumen = dulces.filter(function (o) { return o.tipo === 'eritritol' || o.def.env; }).reduce(function (a, o) { return a + o.p; }, 0);
    if (sinVolumen > 0.5) al('media', 'Más del 50 % del azúcar sustituido por un edulcorante sin volumen: la masa quedará más líquida y con menos dorado.', 'dulce_estructura');
    if (azManual > 0 && azManual < 150) al('media', 'Menos de 150 g de azúcar por kilo de queso: menos dorado y textura más firme.', 'AL21');
    if (hasD('sin_azucar') && sustTotal < 0.99) al('media', 'Dieta sin azúcar: sustituye todo el azúcar con el bloque de endulzantes y ten en cuenta que la textura cambiará.', 'sin_azucar');
    if (hasD('diabetes')) al('info', 'Diabetes: elige un edulcorante, pero la harina y la nata siguen aportando energía.', 'diabetes');
    if (hasD('bajo_grasa')) al('info', 'Bajo en grasa: el queso light y la nata ligera cambian el cuajado.', 'bajo_grasa');
    /* Grasa */
    if ((S.grasa_uso || []).indexOf('base_galleta') >= 0) al('info', 'La base de galleta es una variante: no es la tarta de La Viña. Con margarina usa una de al menos 80 % de grasa.', 'base_galleta');
    if (gGrasaMasa > 0) al('media', 'Grasa en la masa: no está en la receta tradicional ni hay fuente; no se recomienda.', 'grasa_masa');
    if (S.grasa_tipo === 'margarina_tres_cuartos') al('info', 'La margarina «tres cuartos» no equivale a la mantequilla: tiene más agua.', 'margarina34');
    /* Horas, tiempo, nevera */
    if (S.dos_moldes && !esInd) al('media', 'Dividir la masa en dos moldes cambia la altura y el tiempo original deja de valer: usa las señales visuales (I).', 'AL19');
    if (esInd) al('info', 'Individuales y minis: tiempo estimado de 15 a 25 minutos sin fuente publicada. Empieza a los 15 y vigila.', 'individuales');
    if (S.color === 'muy_oscuro') al('info', 'Rivera advierte que un tostado muy intenso aporta amargor.', 'AL20');
    if (pasoNev === 'una_noche' && S.conservacion === 'consumir_36h') al('info', 'Rivera desaconseja la nevera: refrigerada se vuelve más densa. Ajusta la preferencia si quieres seguir su consejo.', 'AL17');
    if (insuficiente) al('alta', 'No hay tiempo: necesitas empezar al menos ' + fmtMin(tMin) + ' antes de servir y solo dispones de ' + fmtMin(horas) + '. Elige una textura más rápida, menos nevera o una hora de servicio posterior.', 'AL18');
    if (tCocina >= 28) al('media', 'Cocina a ' + nf(tCocina, 0) + ' ºC: no dejes los lácteos y los huevos más de 1 a 2 horas fuera de la nevera' + (tCocina > 32 ? ' (1 hora si pasa de 32 ºC).' : '.'), 'AL16');
    if (S.estacion === 'verano') al('info', 'En verano el atemperado es más corto (45 a 60 minutos según el procedimiento de referencia) y hay más riesgo de pasar tiempo a temperatura ambiente.', 'verano');
    if (num(S.altitud_m, 0) > 500) al('info', 'Altitud de ' + nf(S.altitud_m, 0) + ' m: no hay datos documentados para esta tarta; anota el resultado en la ficha de calibración.', 'altitud');
    if (S.transporte) al('info', 'Para transportarla: déjala enfriar en el molde y mantenla fría durante el viaje.', 'transporte');
    if (R.espera_ambiente_min > 36 * 60) al('media', 'Sin nevera, Rivera recomienda consumirla en 36 horas: la tarta esperaría ' + fmtMin(R.espera_ambiente_min) + ' a temperatura ambiente.', 'espera_larga');
    var activo = 15 + 10 + 10 + 5;
    if (num(S.tiempo_activo_disponible_min, 90) < activo) al('info', 'Necesitas unos ' + activo + ' minutos de trabajo activo (mezclar, forrar, controlar y desmoldar) y has indicado menos.', 'tiempo_activo');
    if (!porMolde && !esInd && molde.auto === false && Math.abs(hReal - hObj) > 0.5) al('info', 'Con el molde que indicas la masa queda a ' + nf(hReal, 1) + ' cm (objetivo ' + nf(hObj, 1) + ' cm): el tiempo se ajusta pero el resultado cambia (' + (hReal > hObj ? 'más alta' : 'más baja y seca antes') + ').', 'altura_distinta');
    if (porMolde && racionesEst < raciones) al('media', 'El molde da para unas ' + nf(racionesEst, 1) + ' raciones y has pedido ' + raciones + ': no alcanza para todos los invitados.', 'AL22');
    if (S.ocasion === 'buffet' && S.tamano_racion !== 'pequena') al('info', 'Para buffet se suele usar la ración pequeña (100 g).', 'ocasion_buffet');
    /* Batidora */
    if (S.bate_velocidad_alta && (S.batidora === 'robot' || S.batidora === 'thermomix' || S.batidora === 'varillas_electricas')) al('media', 'Batir a velocidad alta mete demasiado aire: la tarta se infla y luego se hunde. Usa velocidad baja.', 'AL23');
    if (principiante) al('info', 'Principiante: se usan rangos de tiempo más amplios y el primer control más pronto. Mira la tarta desde el primer control.', 'principiante');
    /* Seguridad */
    var pasteurMsg = pasteur;
    if (riesgo.length && blanda && !pasteurMsg) al('alta', 'Hay personas de riesgo (' + riesgo.map(function (r) { return r.replace(/_/g, ' '); }).join(', ') + ') y el centro queda muy poco cocido. Opciones: huevos pasteurizados líquidos, textura firme con lectura central ≥ 71 ºC, u otro postre.', 'AL15');
    else if (riesgo.length && pasteurMsg) al('info', 'Huevo pasteurizado: resuelve la alerta de seguridad por huevo poco cocido.', 'pasteurizado');
    else if (riesgo.length && !blanda) al('info', 'Personas de riesgo: con textura firme apaga solo con una lectura central ≥ 71 ºC (método «centro real»).', 'riesgo_firme');
    if (ninos > 0 && blanda && !pasteurMsg) al('media', 'Hay niños y el centro queda poco cocido: aviso por huevo poco hecho.', 'AL24');
    if (!riesgo.length && blanda && !pasteurMsg) al('info', 'Con el centro a ' + pullTW + ' ºC la tarta no está pasteurizada (el huevo no llega a 71 ºC).', 'no_pasteurizada');
    /* Ortodoxia */
    var viol = [];
    var chk = function (campo, valor) { if (rankOf(campo, valor) > ORTO_RANK[S.ortodoxia]) viol.push(ORTO_LABEL[campo] + ' (' + String(valor).replace(/_/g, ' ') + ')'); };
    chk('queso_tipo', S.queso_tipo); chk('nata_tipo', S.nata_tipo); chk('harina_tipo', S.harina_tipo);
    chk('dulce_tipo', S.dulce_tipo); if (S.dulce_segundo_tipo !== 'ninguno' && num(S.dulce_segundo_pct, 0) > 0) chk('dulce_segundo_tipo', S.dulce_segundo_tipo);
    chk('vainilla', S.vainilla); chk('citricos', S.citricos); chk('licor', S.licor); chk('cobertura', S.cobertura);
    if ((S.grasa_uso || []).some(function (u) { return u === 'base_galleta' || u === 'en_masa'; }) && S.ortodoxia !== 'libre') viol.push('grasa en base o masa');
    if (viol.length) al('media', 'Fuera del modo «' + S.ortodoxia + '»: ' + viol.join(', ') + '. Cambia el modo de ortodoxia o la opción.', 'ortodoxia');
    if (hasD('sin_azucar') === false && false) { /* reservado */ }
    /* Calibración */
    al('info', 'Los coeficientes marcados [I] son inferencias: calibra con la ficha de la sección 12 de la guía (anota en cada prueba color, textura y dulzor).', 'calibrar');

    R.estado = { perfilKey: perfilKey, pasteurizado: pasteur, blanda: blanda, riesgo: riesgo.length > 0, esInd: esInd, porMolde: porMolde };
    return finish();
  }

  /* ───────────── Texto exportable ───────────── */
  function textoReceta(S0, R) {
    var S = Object.assign({}, DEFAULTS, S0 || {});
    if (R.vacio) return 'Sin cálculo: ' + (R.alerts[0] ? R.alerts[0].msg : 'sin datos');
    var o = [], H = R.horno, rs = R.resumen;
    o.push('TARTA DE QUESO DE LA VIÑA — receta calculada');
    o.push('Raciones: ' + nf(rs.raciones_mostradas, 1) + ' de ' + Math.round(rs.racion_g) + ' g · masa cruda ' + fmtG(rs.M) + ' · perfil «' + R.perfil.nombre + '»');
    o.push('Molde: ' + rs.molde.etiqueta + ' · altura mínima ' + nf(rs.molde.altura_min, 1) + ' cm (recomendada ' + nf(rs.molde.altura_rec, 1) + ' cm) · masa a ' + nf(rs.molde.h_real, 1) + ' cm');
    o.push('');
    o.push('INGREDIENTES');
    R.lista.forEach(function (i) { o.push('- ' + i.n + ': ' + i.q + (i.nota ? ' (' + i.nota + ')' : '')); });
    o.push('');
    o.push('HORNO: ' + H.T + ' ºC, ' + String(S.horno_tipo).replace(/_/g, ' ') + ', rejilla ' + String(S.rejilla).replace(/_/g, ' ') + ', precalentado ' + H.precalentado + ' min');
    o.push('TIEMPO: ' + Math.round(H.t) + ' min (ventana ' + Math.round(H.ventana[0]) + '-' + Math.round(H.ventana[1]) + ' min; primer control a los ' + Math.round(H.control) + ' min)');
    if (R.punto.sonda) o.push('SONDA (centro): ' + R.punto.pull_tw + ' ºC método ThermoWorks / ' + R.punto.pull_cr + ' ºC centro real. No mezcles métodos.');
    o.push('PUNTO: ' + R.punto.visual);
    o.push('Reposo en el horno: ' + fmtMin(R.reposo.reposo_horno) + ' · enfriado: ' + fmtMin(R.reposo.enfriado) + (R.reposo.nevera_min ? ' · nevera' : ''));
    o.push('Energía: ≈ ' + Math.round(R.energia.kcal_racion) + ' kcal por ración');
    o.push('');
    o.push('CRONOGRAMA (servir a las ' + S.hora_servicio + ')');
    R.cronograma.forEach(function (c) { o.push(c.hora + ' (' + c.dia + ')  ' + c.n); });
    var av = R.alerts.filter(function (a) { return a.sev !== 'info'; });
    if (av.length) { o.push(''); o.push('AVISOS'); av.forEach(function (a) { o.push('- [' + a.sev + '] ' + a.msg); }); }
    o.push(''); o.push('Valores [I] = inferencias a calibrar. Fuente: guía «Tarta de queso de La Viña: guía definitiva y catálogo de variables».');
    return o.join('\n');
  }

  return {
    DEFAULTS: DEFAULTS, PERFILES: PERFILES, DULCE: DULCE, COMERCIALES: COMERCIALES, HUEVO: HUEVO, PUBLICADAS: PUBLICADAS,
    ORTO: ORTO, ORTO_RANK: ORTO_RANK, rankOf: rankOf,
    compute: compute, textoReceta: textoReceta, seasonFromDate: seasonFromDate,
    fmtG: fmtG, fmtMl: fmtMl, fmtMin: fmtMin, fmtHM: fmtHM, parseHM: parseHM, dayLabel: dayLabel, nf: nf
  };
});
