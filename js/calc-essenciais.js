/* Calculadoras essenciais: juros compostos, correção de valores e salário líquido. */
(function (root) {
  "use strict";
  const C = root.Calc || (typeof require === "function" ? require("./calc.js") : null);
  const CAT = root.CATALOGO;
  if (!CAT || !C) return;
  const { campos: f, brl } = CAT;

  CAT.registrar([
    {
      id: "juros",
      grupo: "investimentos",
      titulo: "Juros compostos",
      cmd: "calc juros",
      desc: "Seu dinheiro rende sobre o que já rendeu. Veja quanto cresce com aportes mensais.",
      campos: [
        f.dinheiro("inicial", "Valor inicial", 1000),
        f.dinheiro("aporte", "Aporte mensal", 500, "Quanto entra todo mês"),
        f.percentual("taxa", "Taxa anual", 10, "% ao ano"),
        f.inteiro("anos", "Prazo em anos", 10),
      ],
      calcular(v) {
        const meses = Math.round(v.anos * 12);
        const r = C.jurosCompostos({ inicial: v.inicial, aporte: v.aporte, taxaAnual: v.taxa, meses });
        const parte = r.montante > 0 ? Math.round((r.juros / r.montante) * 100) : 0;
        return {
          itens: [
            { rot: "Total investido", valor: r.totalInvestido, tipo: "dinheiro" },
            { rot: "Juros acumulados", valor: r.juros, tipo: "dinheiro" },
            { rot: "Montante final", valor: r.montante, tipo: "dinheiro", destaque: true },
          ],
          explica: `Em ${meses} meses você colocou ${brl(r.totalInvestido)}. Os juros são ${parte}% do montante final.`,
          formula: "M = P·(1+i)^n + A·((1+i)^n − 1) / i\ni = (1 + taxa anual)^(1/12) − 1",
        };
      },
    },
    {
      id: "correcao",
      grupo: "investimentos",
      titulo: "Correção de valores",
      cmd: "calc correcao",
      desc: "Quanto vale hoje um valor de uma data passada, pela inflação do período.",
      campos: [
        f.dinheiro("valor", "Valor original", 1000),
        f.percentual("variacao", "Variação acumulada do índice", 25.5, "Use o IPCA ou IGP-M do período, no site do Banco Central"),
      ],
      calcular(v) {
        const r = C.corrigirValor(v.valor, v.variacao);
        return {
          itens: [
            { rot: "Valor original", valor: r.valorOriginal, tipo: "dinheiro" },
            { rot: "Diferença", valor: r.diferenca, tipo: "dinheiro" },
            { rot: "Valor corrigido", valor: r.valorCorrigido, tipo: "dinheiro", destaque: true },
          ],
          explica: `Para manter o mesmo poder de compra, o valor precisa virar ${brl(r.valorCorrigido)} no período.`,
          formula: "valor corrigido = valor original × (1 + variação)",
        };
      },
    },
    {
      id: "salario",
      grupo: "trabalho",
      titulo: "Salário líquido",
      cmd: "calc salario",
      desc: "Quanto sobra do salário depois do INSS e do Imposto de Renda.",
      campos: [
        f.dinheiro("bruto", "Salário bruto", 6000, "Antes dos descontos"),
        f.inteiro("dep", "Dependentes para o IR", 0),
      ],
      calcular(v) {
        const r = C.salarioLiquido({ bruto: v.bruto, dependentes: v.dep });
        return {
          itens: [
            { rot: "INSS", valor: r.inss, tipo: "dinheiro" },
            { rot: "Imposto de Renda", valor: r.irrf, tipo: "dinheiro" },
            { rot: "Salário líquido", valor: r.liquido, tipo: "dinheiro", destaque: true },
          ],
          explica: `Os descontos somam ${brl(r.descontoTotal)}.`,
          formula: `INSS (faixas progressivas)  ${r.inss.toFixed(2)}\nbase do IR = bruto − INSS − dependentes × ${C.CONFIG.deducaoDependente}\nIR pela tabela               ${r.irrfTabela.toFixed(2)}\nredução (faixa até 7.350)    ${r.reducaoIRRF.toFixed(2)}\nIR a pagar                   ${r.irrf.toFixed(2)}`,
          aviso: "Tabelas de referência. Confira INSS e IRRF nas fontes oficiais.",
        };
      },
    },
  ]);
})(typeof window !== "undefined" ? window : globalThis);
