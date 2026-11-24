/*
 * Gráficos simples, em HTML e SVG, sem bibliotecas.
 * Uso: Graficos.renderizar(spec) devolve o HTML do gráfico. Cada calculadora pode devolver
 * `grafico` dentro de calcular(); render.js mostra o gráfico abaixo do resumo.
 *
 * Tipos (campo `tipo`), todos com `titulo`:
 *   barras   { dados: [{rot, valor, destaque?}], formato }            comparação na horizontal
 *   colunas  { dados: [{rot, valor, destaque?}], formato }            comparação na vertical (valores abreviados)
 *   linha    { rotulos: [...], series: [{rot, valores, cor?, tracejado?}], formato }   evolução
 *   rosca    { dados: [{rot, valor}], formato }                       composição de um total
 *   faixa    { valor, min, max, zonas: [{ate, rot, cor?}], formato }  em qual faixa o valor cai
 *   trilha   { min, max, marcas: [{pos, curto, rot, texto?, destaque?}] }   datas ou dias no tempo
 * formato: dinheiro | percentual | numero | inteiro | nenhum
 */
(function (root) {
  "use strict";

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const BRL_CURTO = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
  const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
  const CURTO = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

  const CORES = ["var(--verde)", "#64d2ff", "#ff9f0a", "#bf5af2"];
  const CINZA = "var(--texto-3)";
  const ERRO = "var(--erro)";

  const ok = (v) => Number.isFinite(v);
  const pctNa = (v, min, max) =>
    !ok(v) || !(max > min) ? 50 : Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

  function texto(formato, v) {
    if (formato === "nenhum") return "";
    if (!ok(v)) return "—";
    if (formato === "dinheiro") return BRL.format(v);
    if (formato === "percentual") return NUM.format(v) + "%";
    if (formato === "inteiro") return NUM.format(Math.round(v));
    return NUM.format(v);
  }

  function curto(formato, v) {
    if (formato === "nenhum" || !ok(v)) return "";
    if (formato === "dinheiro") return BRL_CURTO.format(v);
    if (formato === "percentual") return NUM.format(v) + "%";
    return CURTO.format(v);
  }

  /* ---------- barras (horizontal) ---------- */
  function barras(s) {
    const dados = s.dados.filter((d) => ok(d.valor));
    if (!dados.length) return "";
    const max = Math.max(1e-9, ...dados.map((d) => Math.abs(d.valor)));
    return `<div class="barras">${dados
      .map((d) => {
        const w = Math.max(1.5, (Math.abs(d.valor) / max) * 100);
        const cor = d.valor < 0 ? ERRO : d.destaque ? "var(--verde)" : CINZA;
        return `<div class="barra${d.destaque ? " destaque" : ""}">
          <div class="barra-topo"><span>${esc(d.rot)}</span><b>${esc(texto(s.formato, d.valor))}</b></div>
          <div class="barra-trilho"><i style="width:${w.toFixed(2)}%;background:${cor}"></i></div>
        </div>`;
      })
      .join("")}</div>`;
  }

  /* ---------- colunas (vertical) ---------- */
  function colunas(s) {
    const dados = s.dados.filter((d) => ok(d.valor));
    if (!dados.length) return "";
    const max = Math.max(1e-9, ...dados.map((d) => Math.abs(d.valor)));
    return `<div class="colunas">${dados
      .map((d) => {
        const h = Math.max(3, (Math.abs(d.valor) / max) * 100);
        const cor = d.valor < 0 ? ERRO : d.destaque ? "var(--verde)" : CINZA;
        return `<div class="coluna${d.destaque ? " destaque" : ""}">
          <span class="coluna-valor">${esc(curto(s.formato, d.valor))}</span>
          <div class="coluna-area"><i style="height:${h.toFixed(2)}%;background:${cor}"></i></div>
          <span class="coluna-rot">${esc(d.rot)}</span>
        </div>`;
      })
      .join("")}</div>`;
  }

  /* ---------- linha (SVG) ---------- */
  function linha(s) {
    const W = 440;
    const H = 240;
    const L = 86;
    const R = 12;
    const T = 12;
    const B = 30;
    const pw = W - L - R;
    const ph = H - T - B;
    const n = s.rotulos.length;
    const todos = s.series.flatMap((x) => x.valores).filter(ok);
    if (!todos.length || n === 0) return "";

    let lo = Math.min(...todos);
    let hi = Math.max(...todos);
    if (hi === lo) hi = lo + 1;
    if (lo >= 0 && lo < hi * 0.5) lo = 0;
    else if (lo > 0) lo -= (hi - lo) * 0.08;
    hi = hi + (hi - lo) * 0.04;

    const x = (i) => (n <= 1 ? L + pw / 2 : L + (i / (n - 1)) * pw);
    const y = (v) => T + ph - ((v - lo) / (hi - lo)) * ph;

    let grade = "";
    for (let k = 0; k <= 4; k++) {
      const v = lo + ((hi - lo) * k) / 4;
      const yy = y(v).toFixed(1);
      grade += `<line class="grade" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/>`;
      grade += `<text class="eixo" x="${L - 8}" y="${yy}" text-anchor="end" dominant-baseline="middle">${esc(curto(s.formato, v))}</text>`;
    }

    const passo = Math.max(1, Math.ceil(n / 6));
    let eixoX = "";
    for (let i = 0; i < n; i += passo) {
      eixoX += `<text class="eixo" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(s.rotulos[i])}</text>`;
    }

    let desenho = "";
    s.series.forEach((serie, k) => {
      const cor = serie.cor || CORES[k % CORES.length];
      const pts = serie.valores.map((v, i) => (ok(v) ? [x(i), y(v)] : null)).filter(Boolean);
      if (!pts.length) return;
      if (pts.length === 1) {
        desenho += `<circle cx="${pts[0][0].toFixed(1)}" cy="${pts[0][1].toFixed(1)}" r="4" style="fill:${cor}"/>`;
        return;
      }
      const d = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`);
      if (k === 0) {
        const base = (T + ph).toFixed(1);
        desenho += `<path class="area" style="fill:${cor}" d="M${d[0]} L${d.slice(1).join(" L")} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z"/>`;
      }
      desenho += `<polyline fill="none" style="stroke:${cor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"${
        serie.tracejado ? ' stroke-dasharray="6 6"' : ""
      } points="${d.join(" ")}"/>`;
    });

    const legenda =
      s.series.length > 1
        ? `<ul class="legenda">${s.series
            .map((serie, k) => `<li><i style="background:${serie.cor || CORES[k % CORES.length]}"></i>${esc(serie.rot)}</li>`)
            .join("")}</ul>`
        : "";

    return `<svg class="grafico-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(s.titulo)}">${grade}${eixoX}${desenho}</svg>${legenda}`;
  }

  /* ---------- rosca (composição) ---------- */
  function rosca(s) {
    const dados = s.dados.filter((d) => ok(d.valor) && d.valor > 0);
    const total = dados.reduce((a, d) => a + d.valor, 0);
    if (!total) return "";
    const R = 48;
    const C = 2 * Math.PI * R;
    let acc = 0;
    const arcos = dados
      .map((d, k) => {
        const len = (d.valor / total) * C;
        const arco = `<circle cx="60" cy="60" r="${R}" fill="none" style="stroke:${CORES[k % CORES.length]}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 60 60)"/>`;
        acc += len;
        return arco;
      })
      .join("");
    const itens = dados
      .map(
        (d, k) =>
          `<li><i style="background:${CORES[k % CORES.length]}"></i><span>${esc(d.rot)}</span><b>${esc(texto(s.formato, d.valor))}</b><em>${Math.round((d.valor / total) * 100)}%</em></li>`
      )
      .join("");
    return `<div class="rosca"><svg class="rosca-svg" viewBox="0 0 120 120" role="img" aria-label="${esc(s.titulo)}"><circle cx="60" cy="60" r="${R}" fill="none" style="stroke:var(--vidro-forte)" stroke-width="16"/>${arcos}</svg><ul class="legenda-lista">${itens}</ul></div>`;
  }

  /* ---------- faixa (em qual zona o valor cai) ---------- */
  function faixa(s) {
    const pct = (v) => pctNa(v, s.min, s.max);
    let ini = s.min;
    const segs = s.zonas.map((z, k) => {
      const fim = Math.min(z.ate, s.max);
      const w = Math.max(0, pct(fim) - pct(ini));
      ini = fim;
      return { w, cor: z.cor || CORES[k % CORES.length], rot: z.rot };
    });
    const pos = pct(s.valor).toFixed(2);
    return `<div class="faixa">
      <span class="faixa-valor" style="left:${pos}%">${esc(texto(s.formato, s.valor))}</span>
      <div class="faixa-trilho">${segs.map((g) => `<i style="width:${g.w.toFixed(2)}%;background:${g.cor}"></i>`).join("")}<span class="faixa-marca" style="left:${pos}%"></span></div>
      <ul class="legenda-lista">${segs.map((g) => `<li><i style="background:${g.cor}"></i><span>${esc(g.rot)}</span></li>`).join("")}</ul>
    </div>`;
  }

  /* ---------- trilha (datas ou dias marcados numa linha) ---------- */
  function trilha(s) {
    const pct = (v) => pctNa(v, s.min, s.max);
    const marcas = s.marcas
      .map(
        (m, k) =>
          `<span class="trilha-marca${m.destaque ? " destaque" : ""} ${k % 2 ? "baixo" : "cima"}" style="left:${pct(m.pos).toFixed(2)}%"><b>${esc(m.curto)}</b></span>`
      )
      .join("");
    const legenda = s.marcas
      .map((m) => `<li><b>${esc(m.curto)}</b><span>${esc(m.rot)}</span>${m.texto ? `<em>${esc(m.texto)}</em>` : ""}</li>`)
      .join("");
    return `<div class="trilha">${marcas}</div><ul class="legenda-lista">${legenda}</ul>`;
  }

  const TIPOS = { barras, colunas, linha, rosca, faixa, trilha };

  function renderizar(spec) {
    const fn = spec && TIPOS[spec.tipo];
    if (!fn) return "";
    const corpo = fn(spec);
    if (!corpo) return "";
    return `<figure class="grafico"><figcaption class="grafico-titulo">${esc(spec.titulo || "gráfico")}</figcaption>${corpo}</figure>`;
  }

  root.Graficos = { renderizar };
})(typeof window !== "undefined" ? window : globalThis);
