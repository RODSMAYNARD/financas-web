(function () {
  "use strict";

  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const pct = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const $ = (id) => document.getElementById(id);
  const num = (id) => {
    const v = $(id).value.replace(",", ".");
    return v === "" ? NaN : Number(v);
  };
  const fmt = (n) => (Number.isFinite(n) ? brl.format(n) : "—");

  /* ---------- Juros compostos ---------- */
  function rodarJuros() {
    const inicial = num("j-inicial");
    const aporte = num("j-aporte");
    const taxa = num("j-taxa");
    const anos = num("j-anos");
    const tabela = $("j-tabela");

    if ([inicial, aporte, taxa, anos].some((v) => !Number.isFinite(v)) || anos < 0) {
      ["j-r-investido", "j-r-juros", "j-r-montante"].forEach((id) => ($(id).textContent = "—"));
      $("j-explica").textContent = "Preencha todos os campos com números para ver o resultado.";
      tabela.innerHTML = "";
      return;
    }

    const meses = Math.round(anos * 12);
    const r = Calc.jurosCompostos({ inicial, aporte, taxaAnual: taxa, meses });

    $("j-r-investido").textContent = fmt(r.totalInvestido);
    $("j-r-juros").textContent = fmt(r.juros);
    $("j-r-montante").textContent = fmt(r.montante);

    const parteJuros = r.montante > 0 ? Math.round((r.juros / r.montante) * 100) : 0;
    $("j-explica").textContent =
      meses === 0
        ? "Com prazo de zero anos, o resultado é só o valor inicial."
        : `Em ${meses} meses você colocou ${fmt(r.totalInvestido)}. Os juros responderam por ${parteJuros}% do montante final, a taxa mensal equivalente é ${pct.format(r.taxaMensal * 100)}% ao mês.`;

    // Tabela mês a mês (limitada para não pesar em prazos muito longos)
    const linhas = r.evolucao;
    const passo = linhas.length > 240 ? 12 : 1;
    tabela.innerHTML = linhas
      .filter((l, idx) => idx % passo === 0 || idx === linhas.length - 1)
      .map(
        (l) =>
          `<tr><td>${String(l.mes).padStart(3, "0")}</td><td>${fmt(l.investido)}</td><td>${fmt(l.juros)}</td><td>${fmt(l.saldo)}</td></tr>`
      )
      .join("");
  }

  /* ---------- Correção de valores ---------- */
  function rodarCorrecao() {
    const valor = num("c-valor");
    const variacao = num("c-variacao");
    if (!Number.isFinite(valor) || !Number.isFinite(variacao)) {
      ["c-r-original", "c-r-diferenca", "c-r-corrigido"].forEach((id) => ($(id).textContent = "—"));
      $("c-explica").textContent = "Preencha os dois campos com números para ver o resultado.";
      return;
    }
    const r = Calc.corrigirValor(valor, variacao);
    $("c-r-original").textContent = fmt(r.valorOriginal);
    $("c-r-diferenca").textContent = (r.diferenca >= 0 ? "+ " : "− ") + fmt(Math.abs(r.diferenca));
    $("c-r-corrigido").textContent = fmt(r.valorCorrigido);
    $("c-explica").textContent =
      variacao >= 0
        ? `Para manter o mesmo poder de compra, ${fmt(r.valorOriginal)} precisariam virar ${fmt(r.valorCorrigido)} no período.`
        : `Houve queda de ${pct.format(Math.abs(variacao))}% no índice: o valor corrigido fica abaixo do original.`;
  }

  /* ---------- Salário líquido ---------- */
  function rodarSalario() {
    const bruto = num("s-bruto");
    const dep = num("s-dep");
    if (!Number.isFinite(bruto) || !Number.isFinite(dep) || bruto < 0) {
      ["s-r-inss", "s-r-irrf", "s-r-liquido"].forEach((id) => ($(id).textContent = "—"));
      $("s-explica").textContent = "Preencha o salário bruto com um número para ver o resultado.";
      $("s-formula").textContent = "";
      return;
    }
    const r = Calc.salarioLiquido({ bruto, dependentes: dep });
    $("s-r-inss").textContent = "− " + fmt(r.inss);
    $("s-r-irrf").textContent = "− " + fmt(r.irrf);
    $("s-r-liquido").textContent = fmt(r.liquido);

    const faixaIsenta = bruto <= Calc.CONFIG.irrf.isencaoAte;
    $("s-explica").textContent = faixaIsenta
      ? `Até ${brl.format(Calc.CONFIG.irrf.isencaoAte)} não há Imposto de Renda. Você paga só o INSS, que é ${pct.format((r.inss / bruto) * 100)}% do bruto.`
      : `Seus descontos somam ${fmt(r.descontoTotal)}, o equivalente a ${pct.format((r.descontoTotal / bruto) * 100)}% do bruto.`;

    $("s-formula").textContent = [
      `INSS (faixas progressivas)   ${fmt(r.inss)}`,
      `base do IR = bruto − INSS − dependentes × ${fmt(Calc.CONFIG.deducaoDependente)}`,
      `base do IR                   ${fmt(r.baseIRRF)}`,
      `IR pela tabela progressiva   ${fmt(r.irrfTabela)}`,
      `redução (faixa até 7.350)    ${fmt(r.reducaoIRRF)}`,
      `IR a pagar                   ${fmt(r.irrf)}`,
      `líquido = bruto − INSS − IR  ${fmt(r.liquido)}`,
    ].join("\n");
  }

  /* ---------- Ligação ---------- */
  const pares = [
    ["form-juros", rodarJuros],
    ["form-correcao", rodarCorrecao],
    ["form-salario", rodarSalario],
  ];
  pares.forEach(([formId, fn]) => {
    const form = $(formId);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      fn();
    });
    form.addEventListener("input", fn);
  });

  rodarJuros();
  rodarCorrecao();
  rodarSalario();
})();
