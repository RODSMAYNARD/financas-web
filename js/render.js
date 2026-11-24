/* Renderização do catálogo e das páginas de cada calculadora. */
(function () {
  "use strict";
  const CAT = window.CATALOGO;
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const NUM = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const INT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const PCT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });

  function formatar(tipo, valor) {
    if (valor === null || valor === undefined) return "—";
    if (typeof valor === "number" && !Number.isFinite(valor)) return "—";
    switch (tipo) {
      case "dinheiro": return CAT.brl(valor);
      case "percentual": return PCT.format(valor) + "%";
      case "numero": return NUM.format(valor);
      case "inteiro": return INT.format(valor);
      case "data": return valor instanceof Date ? DATA.format(valor) : String(valor);
      default: return String(valor);
    }
  }

  function grupoDe(id) {
    return CAT.grupos.find((g) => g.id === id);
  }

  /* ---------- Catálogo (home) ---------- */
  function renderCatalogo() {
    const html = CAT.grupos
      .map((g) => {
        const itens = CAT.itens.filter((i) => i.grupo === g.id);
        if (!itens.length) return "";
        const tiles = itens
          .map(
            (i) => `<a class="tile" href="#${esc(i.id)}">
              <code>${esc(i.cmd)}</code>
              <h3>${esc(i.titulo)}</h3>
              <p>${esc(i.desc)}</p>
            </a>`
          )
          .join("");
        return `<section class="grupo" aria-labelledby="g-${g.id}">
          <h2 id="g-${g.id}">${esc(g.titulo)}</h2>
          <div class="tiles">${tiles}</div>
        </section>`;
      })
      .join("");
    $("catalogo-lista").innerHTML = html;
  }

  /* ---------- Página de uma calculadora ---------- */
  function campoHTML(c) {
    const id = `c-${c.id}`;
    const ajuda = c.ajuda ? `<em>${esc(c.ajuda)}</em>` : "";
    const rotulo = `<span class="rotulo">${esc(c.rot)} ${ajuda}</span>`;
    const val = esc(c.valor);
    switch (c.tipo) {
      case "dinheiro":
        return `<label class="campo">${rotulo}<span class="input-moeda"><span>R$</span><input id="${id}" name="${c.id}" type="text" inputmode="decimal" value="${val}"></span></label>`;
      case "percentual":
        return `<label class="campo">${rotulo}<span class="input-sufixo"><input id="${id}" name="${c.id}" type="text" inputmode="decimal" value="${val}"><span>%</span></span></label>`;
      case "numero":
        return `<label class="campo">${rotulo}<span class="input-sufixo"><input id="${id}" name="${c.id}" type="text" inputmode="decimal" value="${val}"></span></label>`;
      case "inteiro":
        return `<label class="campo">${rotulo}<span class="input-sufixo"><input id="${id}" name="${c.id}" type="text" inputmode="numeric" value="${val}"></span></label>`;
      case "data":
        return `<label class="campo">${rotulo}<input class="input-data" id="${id}" name="${c.id}" type="date" value="${val}"></label>`;
      case "opcoes":
        return `<label class="campo">${rotulo}<select id="${id}" name="${c.id}" class="select">${c.opcoes
          .map((o) => `<option value="${esc(o.v)}"${o.v === c.valor ? " selected" : ""}>${esc(o.rot)}</option>`)
          .join("")}</select></label>`;
      case "lista":
        return `<label class="campo">${rotulo}<textarea id="${id}" name="${c.id}" rows="3" class="texto">${esc(c.valor)}</textarea></label>`;
      default:
        return "";
    }
  }

  function lerValores(item, form) {
    const v = {};
    item.campos.forEach((c) => {
      const raw = form.elements[c.id] ? form.elements[c.id].value : c.valor;
      if (["dinheiro", "percentual", "numero", "inteiro"].includes(c.tipo)) v[c.id] = CAT.parseNum(raw);
      else v[c.id] = raw;
    });
    return v;
  }

  function resultadoHTML(res) {
    const itens = (res.itens || [])
      .map(
        (it) => `<div${it.destaque ? ' class="destaque"' : ""}><dt>${esc(it.rot)}</dt><dd>${esc(formatar(it.tipo, it.valor))}</dd></div>`
      )
      .join("");
    return `<dl class="resumo">${itens}</dl>
      ${res.explica ? `<p class="explica">${esc(res.explica)}</p>` : ""}
      ${res.aviso ? `<p class="aviso">${esc(res.aviso)}</p>` : ""}
      ${res.formula ? `<details class="detalhe"><summary>Ver a conta</summary><pre class="formula">${esc(res.formula)}</pre></details>` : ""}`;
  }

  function renderDetalhe(item) {
    const g = grupoDe(item.grupo);
    $("detalhe").innerHTML = `
      <a class="voltar" href="#">← todas as calculadoras</a>
      <header class="calc-cabeca">
        <p class="calc-cmd">$ ${esc(item.cmd)}</p>
        <h1 class="calc-titulo">${esc(item.titulo)}</h1>
        <p class="calc-desc">${esc(item.desc)}${g ? ` <span class="grupo-tag">${esc(g.titulo)}</span>` : ""}</p>
      </header>
      <div class="calc-grade">
        <form class="painel entrada" id="form-calc" novalidate>
          ${item.campos.map(campoHTML).join("")}
          <button class="btn-primario" type="submit">Calcular</button>
        </form>
        <div class="painel saida" id="saida" aria-live="polite"></div>
      </div>`;

    const form = $("form-calc");
    const saida = $("saida");
    function calcular() {
      const v = lerValores(item, form);
      let res;
      try {
        res = item.calcular(v);
      } catch (e) {
        res = { itens: [], explica: "Preencha os campos com números válidos para ver o resultado." };
      }
      const invalido = (res.itens || []).length === 0 || (res.itens || []).every((it) => !Number.isFinite(it.valor) && it.valor !== undefined && typeof it.valor === "number");
      saida.innerHTML = `<div class="saida-cabeca"><span>resultado</span><span class="tag">estimativa</span></div>${invalido && !res.explica ? '<p class="explica">Preencha os campos para ver o resultado.</p>' : resultadoHTML(res)}`;
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      calcular();
    });
    form.addEventListener("input", calcular);
    calcular();
  }

  /* ---------- Roteamento por hash ---------- */
  function rota() {
    const id = decodeURIComponent(location.hash.slice(1));
    const item = CAT.itens.find((i) => i.id === id);
    const home = !item;
    $("hero").hidden = !home;
    $("catalogo").hidden = !home;
    $("detalhe").hidden = home;
    if (item) {
      document.title = `${item.titulo} — Finanças`;
      renderDetalhe(item);
    } else {
      document.title = "Finanças — calculadoras claras";
    }
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  renderCatalogo();
  window.addEventListener("hashchange", rota);
  rota();
})();
