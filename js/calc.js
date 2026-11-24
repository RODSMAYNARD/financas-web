/*
 * Motor de cálculo — funções puras, sem DOM.
 * Todas as taxas e tabelas vêm de CONFIG para facilitar a atualização.
 * Os valores de INSS e IRRF são de referência e devem ser conferidos
 * nas fontes oficiais (Previdência Social e Receita Federal) antes de uso real.
 */
(function (root) {
  "use strict";

  const CONFIG = {
    // Faixas do INSS (empregado) — contribuição calculada faixa a faixa (progressiva).
    inss: {
      teto: 8475.55,
      faixas: [
        { ate: 1621.0, aliquota: 0.075 },
        { ate: 2902.84, aliquota: 0.09 },
        { ate: 4354.27, aliquota: 0.12 },
        { ate: 8475.55, aliquota: 0.14 },
      ],
    },
    // Dedução por dependente no IRRF (valor de referência).
    deducaoDependente: 189.59,
    // Tabela progressiva mensal do IRRF (base da tabela).
    irrf: {
      faixas: [
        { ate: 2259.2, aliquota: 0, deducao: 0 },
        { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
        { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
        { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
        { ate: Infinity, aliquota: 0.275, deducao: 896.0 },
      ],
      // Regra da isenção ampliada (Lei 15.270/2025): até R$ 5.000 não há IRRF;
      // entre R$ 5.000 e R$ 7.350 há redução gradual: 978,62 − 0,133145 × rendimento.
      isencaoAte: 5000,
      reducaoAteRendimento: 7350,
      reducaoBase: 978.62,
      reducaoFator: 0.133145,
    },
  };

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  /* ---------- Juros compostos com aportes mensais ---------- */

  // Converte taxa anual efetiva em taxa mensal equivalente.
  function taxaMensalDeAnual(taxaAnualPct) {
    return Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1;
  }

  /**
   * @param {object} p
   * @param {number} p.inicial      valor inicial (R$)
   * @param {number} p.aporte       aporte mensal (R$), ao fim de cada mês
   * @param {number} p.taxaAnual    taxa anual (%)
   * @param {number} p.meses        prazo em meses
   */
  function jurosCompostos({ inicial, aporte, taxaAnual, meses }) {
    const P = Math.max(0, Number(inicial) || 0);
    const PMT = Math.max(0, Number(aporte) || 0);
    const n = Math.max(0, Math.floor(Number(meses) || 0));
    const i = taxaMensalDeAnual(Number(taxaAnual) || 0);

    const fator = Math.pow(1 + i, n);
    const montante =
      i === 0
        ? P + PMT * n
        : P * fator + PMT * ((fator - 1) / i);

    const totalInvestido = P + PMT * n;
    const juros = montante - totalInvestido;

    // Evolução mês a mês (para o gráfico e a tabela).
    const evolucao = [];
    let saldo = P;
    let investidoAcum = P;
    for (let m = 1; m <= n; m++) {
      saldo = saldo * (1 + i) + PMT;
      investidoAcum += PMT;
      evolucao.push({
        mes: m,
        saldo: round2(saldo),
        investido: round2(investidoAcum),
        juros: round2(saldo - investidoAcum),
      });
    }

    return {
      montante: round2(montante),
      totalInvestido: round2(totalInvestido),
      juros: round2(juros),
      taxaMensal: i,
      evolucao,
    };
  }

  /* ---------- Correção de valores pela inflação ---------- */

  /**
   * Corrige um valor pela variação acumulada de um índice no período.
   * @param {number} valor            valor original (R$)
   * @param {number} variacaoPct      variação acumulada do índice no período (%)
   */
  function corrigirValor(valor, variacaoPct) {
    const v = Math.max(0, Number(valor) || 0);
    const fator = 1 + (Number(variacaoPct) || 0) / 100;
    const corrigido = v * fator;
    return {
      valorOriginal: round2(v),
      valorCorrigido: round2(corrigido),
      diferenca: round2(corrigido - v),
      fator: fator,
    };
  }

  /* ---------- Salário líquido (INSS e IRRF) ---------- */

  // INSS progressivo: soma da contribuição de cada faixa.
  function calcularINSS(salarioBruto) {
    const bruto = Math.max(0, Number(salarioBruto) || 0);
    const base = Math.min(bruto, CONFIG.inss.teto);
    let total = 0;
    let anterior = 0;
    for (const faixa of CONFIG.inss.faixas) {
      if (base <= anterior) break;
      const limite = Math.min(base, faixa.ate);
      total += (limite - anterior) * faixa.aliquota;
      anterior = faixa.ate;
    }
    return round2(total);
  }

  function irrfTabela(base) {
    const faixa = CONFIG.irrf.faixas.find((f) => base <= f.ate);
    const imposto = base * faixa.aliquota - faixa.deducao;
    return Math.max(0, imposto);
  }

  /**
   * @param {object} p
   * @param {number} p.bruto        salário bruto mensal (R$)
   * @param {number} p.dependentes  quantidade de dependentes
   */
  function salarioLiquido({ bruto, dependentes }) {
    const B = Math.max(0, Number(bruto) || 0);
    const deps = Math.max(0, Math.floor(Number(dependentes) || 0));

    const inss = calcularINSS(B);
    const deducaoDeps = deps * CONFIG.deducaoDependente;
    const baseIRRF = Math.max(0, B - inss - deducaoDeps);

    let irrfBruto = irrfTabela(baseIRRF);
    const r = CONFIG.irrf;
    let reducao = 0;
    let irrf;
    if (B <= r.isencaoAte) {
      irrf = 0;
    } else if (B <= r.reducaoAteRendimento) {
      reducao = r.reducaoBase - r.reducaoFator * B;
      irrf = Math.max(0, irrfBruto - reducao);
    } else {
      irrf = irrfBruto;
    }

    const liquido = B - inss - irrf;
    return {
      bruto: round2(B),
      inss: round2(inss),
      dependentes: deps,
      deducaoDependentes: round2(deducaoDeps),
      baseIRRF: round2(baseIRRF),
      irrfTabela: round2(irrfBruto),
      reducaoIRRF: round2(reducao),
      irrf: round2(irrf),
      liquido: round2(liquido),
      descontoTotal: round2(B - liquido),
    };
  }

  const api = {
    CONFIG,
    taxaMensalDeAnual,
    jurosCompostos,
    corrigirValor,
    calcularINSS,
    salarioLiquido,
    round2,
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.Calc = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
