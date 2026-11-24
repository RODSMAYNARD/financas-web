/* Módulo: Investimentos. Funções puras (testáveis em Node) + registro no catálogo. */
(function (root) {
  "use strict";
  const CAT = root.CATALOGO;
  const C = root.Calc || (typeof require === "function" ? require("./calc.js") : null);

  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const SELIC_LIMITE_POUPANCA = 8.5;

  // Juros simples: M = P·(1 + i·n)
  function jurosSimples({ principal, taxaMensalPct, meses }) {
    const P = Math.max(0, Number(principal) || 0);
    const i = (Number(taxaMensalPct) || 0) / 100;
    const n = Math.max(0, Math.floor(Number(meses) || 0));
    const montante = P * (1 + i * n);
    return { montante: r2(montante), juros: r2(montante - P) };
  }

  // IR regressivo sobre rendimento de CDB e Tesouro (alíquota pelo prazo em dias).
  function irRegressivo(dias) {
    if (dias <= 180) return 0.225;
    if (dias <= 360) return 0.2;
    if (dias <= 720) return 0.175;
    return 0.15;
  }

  // Rendimento composto por prazo em dias (ano comercial de 365 dias).
  function rendimentoBruto(valor, taxaAnualPct, dias) {
    const a = (Number(taxaAnualPct) || 0) / 100;
    return valor * (Math.pow(1 + a, dias / 365) - 1);
  }

  function cdbTesouro({ valor, taxaAnualPct, dias }) {
    const V = Math.max(0, Number(valor) || 0);
    const d = Math.max(0, Math.floor(Number(dias) || 0));
    const bruto = rendimentoBruto(V, taxaAnualPct, d);
    const aliquota = irRegressivo(d);
    const ir = bruto * aliquota;
    return {
      valor: r2(V),
      bruto: r2(bruto),
      aliquota,
      ir: r2(ir),
      liquido: r2(V + bruto - ir),
      rendimentoLiquido: r2(bruto - ir),
    };
  }

  // Poupança: acima de 8,5% de Selic, 0,5% ao mês + TR; abaixo, 70% da Selic ao ano + TR.
  function taxaPoupancaAnualPct(selicPct, trPct) {
    const selic = Number(selicPct) || 0;
    const base = selic > SELIC_LIMITE_POUPANCA ? (Math.pow(1.005, 12) - 1) * 100 : 0.7 * selic;
    const tr = Number(trPct) || 0;
    return ((1 + base / 100) * (1 + tr / 100) - 1) * 100;
  }

  // Comparador de renda fixa para o mesmo valor e prazo. Isentos: poupança, LCI/LCA.
  function comparadorRendaFixa({ valor, dias, selicPct, trPct, cdbTaxaPct, lciTaxaPct }) {
    const V = Math.max(0, Number(valor) || 0);
    const d = Math.max(0, Math.floor(Number(dias) || 0));
    const poupAnual = taxaPoupancaAnualPct(selicPct, trPct);
    const poupBruto = rendimentoBruto(V, poupAnual, d);
    const cdb = cdbTesouro({ valor: V, taxaAnualPct: cdbTaxaPct, dias: d });
    const lciBruto = rendimentoBruto(V, lciTaxaPct, d);
    const opcoes = [
      { nome: "Poupança", liquido: V + poupBruto, taxaAnualPct: poupAnual },
      { nome: "CDB (com IR)", liquido: cdb.liquido, taxaAnualPct: cdbTaxaPct },
      { nome: "LCI/LCA (isenta)", liquido: V + lciBruto, taxaAnualPct: lciTaxaPct },
    ].map((o) => ({ ...o, liquido: r2(o.liquido) }));
    const melhor = opcoes.reduce((a, b) => (b.liquido > a.liquido ? b : a));
    return { opcoes, melhor: melhor.nome, poupancaAnualPct: poupAnual };
  }

  // Viver de renda: capital = renda anual ÷ taxa anual.
  function capitalParaRenda({ rendaMensal, taxaAnualPct }) {
    const renda = Math.max(0, Number(rendaMensal) || 0);
    const taxa = (Number(taxaAnualPct) || 0) / 100;
    if (taxa <= 0) return NaN;
    return r2((renda * 12) / taxa);
  }

  // Meses até atingir um alvo com saldo inicial e aporte mensal (solução fechada por logaritmo).
  function mesesAteAlvo({ inicial, aporte, taxaAnualPct, alvo }) {
    const P = Math.max(0, Number(inicial) || 0);
    const A = Math.max(0, Number(aporte) || 0);
    const F = Number(alvo);
    const i = Math.pow(1 + (Number(taxaAnualPct) || 0) / 100, 1 / 12) - 1;
    if (P >= F) return 0;
    if (i === 0) return A > 0 ? Math.ceil((F - P) / A) : NaN;
    const denom = P * i + A;
    if (denom <= 0) return NaN;
    const ratio = (F * i + A) / denom;
    if (ratio <= 1) return 0;
    return Math.ceil(Math.log(ratio) / Math.log(1 + i));
  }

  function reservaEmergencia({ despesaMensal, meses }) {
    return r2(Math.max(0, Number(despesaMensal) || 0) * Math.max(0, Number(meses) || 0));
  }

  function correcaoPoupanca({ valor, meses, taxaAnualPct }) {
    const V = Math.max(0, Number(valor) || 0);
    const n = Math.max(0, Number(meses) || 0);
    const a = (Number(taxaAnualPct) || 0) / 100;
    return r2(V * Math.pow(1 + a, n / 12));
  }

  function conversorMoeda({ valor, cotacao }) {
    return r2((Number(valor) || 0) * (Number(cotacao) || 0));
  }

  // VPL: −investimento + soma(fluxo_t ÷ (1+i)^t), fluxos anuais a partir do ano 1.
  function vpl({ taxaAnualPct, investimento, fluxos }) {
    const i = (Number(taxaAnualPct) || 0) / 100;
    const soma = fluxos.reduce((acc, f, idx) => acc + f / Math.pow(1 + i, idx + 1), 0);
    return r2(soma - (Number(investimento) || 0));
  }

  const M = {
    jurosSimples,
    irRegressivo,
    cdbTesouro,
    taxaPoupancaAnualPct,
    comparadorRendaFixa,
    capitalParaRenda,
    mesesAteAlvo,
    reservaEmergencia,
    correcaoPoupanca,
    conversorMoeda,
    vpl,
  };

  if (CAT) {
    const f = CAT.campos;
    const brl = CAT.brl;
    const parseLista = (s) =>
      String(s || "")
        .split(";")
        .map((x) => CAT.parseNum(x))
        .filter((x) => Number.isFinite(x));

    CAT.registrar([
      {
        id: "juros-simples",
        grupo: "investimentos",
        titulo: "Juros simples",
        cmd: "calc juros-simples",
        desc: "Juros que incidem só sobre o valor inicial, sem render juros sobre juros.",
        campos: [
          f.dinheiro("principal", "Valor inicial", 1000),
          f.percentual("taxa", "Taxa mensal", 2, "% ao mês"),
          f.inteiro("meses", "Prazo em meses", 12),
        ],
        calcular(v) {
          const r = jurosSimples({ principal: v.principal, taxaMensalPct: v.taxa, meses: v.meses });
          return {
            itens: [
              { rot: "Juros", valor: r.juros, tipo: "dinheiro" },
              { rot: "Montante final", valor: r.montante, tipo: "dinheiro", destaque: true },
            ],
            explica: `Os juros são sempre calculados sobre ${brl(v.principal)}, por isso crescem em linha reta.`,
            formula: "M = P × (1 + i × n)",
          };
        },
      },
      {
        id: "renda-fixa",
        grupo: "investimentos",
        titulo: "Comparador de renda fixa",
        cmd: "calc renda-fixa",
        desc: "Compare poupança, CDB e LCI/LCA para o mesmo valor e prazo, já com IR.",
        campos: [
          f.dinheiro("valor", "Valor aplicado", 10000),
          f.inteiro("dias", "Prazo em dias", 365),
          f.percentual("selic", "Selic anual", 15, "% ao ano"),
          f.percentual("tr", "TR anual", 0, "% ao ano, 0 se não souber"),
          f.percentual("cdb", "CDB: taxa anual", 110, "% do CDI ou taxa fixa, ao ano"),
          f.percentual("lci", "LCI/LCA: taxa anual", 90, "% ao ano"),
        ],
        calcular(v) {
          const r = comparadorRendaFixa({
            valor: v.valor,
            dias: v.dias,
            selicPct: v.selic,
            trPct: v.tr,
            cdbTaxaPct: v.cdb,
            lciTaxaPct: v.lci,
          });
          const itens = r.opcoes.map((o) => ({ rot: o.nome, valor: o.liquido, tipo: "dinheiro", destaque: o.nome === r.melhor }));
          return {
            itens,
            explica: `Com estes números, a melhor opção líquida é ${r.melhor}. A poupança rende cerca de ${r.poupancaAnualPct.toFixed(2).replace(".", ",")}% ao ano com a Selic informada.`,
            formula: "rendimento = valor × ((1 + taxa anual)^(dias/365) − 1)\nIR regressivo no CDB: 22,5% até 180 dias; 20% até 360; 17,5% até 720; 15% acima",
            aviso: "Não inclui IOF nem taxas de corretora. Taxas de CDB e LCI variam por banco.",
          };
        },
      },
      {
        id: "cdb-tesouro",
        grupo: "investimentos",
        titulo: "CDB e Tesouro",
        cmd: "calc cdb",
        desc: "Quanto rende um CDB ou título do Tesouro, já com o IR que desce conforme o prazo.",
        campos: [
          f.dinheiro("valor", "Valor aplicado", 10000),
          f.percentual("taxa", "Taxa anual", 12, "% ao ano"),
          f.inteiro("dias", "Prazo em dias", 365),
        ],
        calcular(v) {
          const r = cdbTesouro({ valor: v.valor, taxaAnualPct: v.taxa, dias: v.dias });
          return {
            itens: [
              { rot: "Rendimento bruto", valor: r.bruto, tipo: "dinheiro" },
              { rot: `IR (${(r.aliquota * 100).toFixed(1).replace(".", ",")}%)`, valor: r.ir, tipo: "dinheiro" },
              { rot: "Total líquido", valor: r.liquido, tipo: "dinheiro", destaque: true },
            ],
            explica: `Rendimento líquido de ${brl(r.rendimentoLiquido)} depois do IR.`,
            formula: "IR = rendimento bruto × alíquota regressiva pelo prazo",
            aviso: "Não inclui IOF (só para resgates em até 30 dias) nem taxas de custódia.",
          };
        },
      },
      {
        id: "viver-de-renda",
        grupo: "investimentos",
        titulo: "Viver de renda",
        cmd: "calc viver-de-renda",
        desc: "Quanto você precisa investir para tirar uma renda mensal sem mexer no principal.",
        campos: [
          f.dinheiro("renda", "Renda mensal desejada", 5000),
          f.percentual("taxa", "Rendimento anual da carteira", 6, "% ao ano"),
        ],
        calcular(v) {
          const cap = capitalParaRenda({ rendaMensal: v.renda, taxaAnualPct: v.taxa });
          return {
            itens: [
              { rot: "Capital necessário", valor: cap, tipo: "dinheiro", destaque: true },
              { rot: "Renda mensal", valor: v.renda, tipo: "dinheiro" },
            ],
            explica: `Com rendimento de ${v.taxa}% ao ano, o capital que paga ${brl(v.renda)} por mês é ${brl(cap)}.`,
            formula: "capital = renda mensal × 12 ÷ taxa anual",
            aviso: "Renda passiva de carteira: o rendimento varia, então isto é uma estimativa.",
          };
        },
      },
      {
        id: "primeiro-milhao",
        grupo: "investimentos",
        titulo: "Primeiro milhão",
        cmd: "calc primeiro-milhao",
        desc: "Em quantos anos você chega a R$ 1.000.000 com aportes mensais.",
        campos: [
          f.dinheiro("inicial", "Valor inicial", 0),
          f.dinheiro("aporte", "Aporte mensal", 1000),
          f.percentual("taxa", "Rendimento anual", 10, "% ao ano"),
        ],
        calcular(v) {
          const n = mesesAteAlvo({ inicial: v.inicial, aporte: v.aporte, taxaAnualPct: v.taxa, alvo: 1000000 });
          if (!Number.isFinite(n)) {
            return { itens: [], explica: "Com aporte zero e sem valor inicial, o milhão não é alcançado." };
          }
          const anos = Math.floor(n / 12);
          const meses = n % 12;
          return {
            itens: [
              { rot: "Tempo até R$ 1 milhão", valor: `${anos} anos e ${meses} meses`, tipo: "texto", destaque: true },
              { rot: "Meses", valor: n, tipo: "inteiro" },
            ],
            explica: `Aportando ${brl(v.aporte)} por mês, a ${v.taxa}% ao ano, você chega a R$ 1.000.000 em ${anos} anos e ${meses} meses.`,
            formula: "(1+i)^n = (F·i + A) ÷ (P·i + A)",
          };
        },
      },
      {
        id: "reserva-emergencia",
        grupo: "investimentos",
        titulo: "Reserva de emergência",
        cmd: "calc reserva",
        desc: "Quanto guardar para cobrir as despesas em caso de imprevisto.",
        campos: [
          f.dinheiro("despesa", "Despesa mensal essencial", 3000, "Aluguel, contas, comida e transporte"),
          f.inteiro("meses", "Meses de cobertura", 6),
        ],
        calcular(v) {
          const valor = reservaEmergencia({ despesaMensal: v.despesa, meses: v.meses });
          return {
            itens: [{ rot: "Reserva recomendada", valor, tipo: "dinheiro", destaque: true }],
            explica: `Guardar ${v.meses} meses de despesas essenciais dá ${brl(valor)}. Muitos especialistas recomendam de 3 a 6 meses.`,
            formula: "reserva = despesa mensal × meses",
          };
        },
      },
      {
        id: "correcao-poupanca",
        grupo: "investimentos",
        titulo: "Correção pela poupança",
        cmd: "calc correcao-poupanca",
        desc: "Quanto um valor renderia se tivesse ficado na poupança.",
        campos: [
          f.dinheiro("valor", "Valor", 1000),
          f.inteiro("meses", "Prazo em meses", 12),
          f.percentual("taxa", "Rendimento anual da poupança", 6.17, "% ao ano"),
        ],
        calcular(v) {
          const corrigido = correcaoPoupanca({ valor: v.valor, meses: v.meses, taxaAnualPct: v.taxa });
          return {
            itens: [
              { rot: "Valor original", valor: v.valor, tipo: "dinheiro" },
              { rot: "Valor corrigido", valor: corrigido, tipo: "dinheiro", destaque: true },
            ],
            explica: `Pela poupança, ${brl(v.valor)} viram ${brl(corrigido)} em ${v.meses} meses.`,
            formula: "valor × (1 + taxa anual)^(meses/12)",
            aviso: "Usa a taxa anual que você informar. A poupança real segue Selic e TR.",
          };
        },
      },
      {
        id: "conversor-moeda",
        grupo: "investimentos",
        titulo: "Conversor de moeda",
        cmd: "calc conversor",
        desc: "Converta um valor estrangeiro para reais com a cotação que você informar.",
        campos: [
          f.numero("valor", "Valor na moeda estrangeira", 100),
          f.numero("cotacao", "Cotação", 5.5, "Quantos reais vale 1 unidade da moeda"),
        ],
        calcular(v) {
          const reais = conversorMoeda({ valor: v.valor, cotacao: v.cotacao });
          return {
            itens: [{ rot: "Em reais", valor: reais, tipo: "dinheiro", destaque: true }],
            explica: "Use a cotação do dia da compra, que varia; a da sua corretora ou banco pode ter taxa extra.",
            formula: "reais = valor × cotação",
          };
        },
      },
      {
        id: "vpl",
        grupo: "investimentos",
        titulo: "Valor presente líquido (VPL)",
        cmd: "calc vpl",
        desc: "Diz se um investimento vale a pena, trazendo as entradas futuras para hoje.",
        campos: [
          f.dinheiro("investimento", "Investimento inicial", 1000),
          f.percentual("taxa", "Taxa de desconto anual", 10, "% ao ano"),
          f.lista("fluxos", "Entradas por ano", "600;600", "Separe por ponto e vírgula. Ex.: 300;300;300"),
        ],
        calcular(v) {
          const fluxos = parseLista(v.fluxos);
          if (fluxos.length === 0) return { itens: [], explica: "Informe pelo menos uma entrada por ano." };
          const npv = vpl({ taxaAnualPct: v.taxa, investimento: v.investimento, fluxos });
          return {
            itens: [
              { rot: "Valor presente líquido", valor: npv, tipo: "dinheiro", destaque: true },
              { rot: "Entradas informadas", valor: fluxos.length, tipo: "inteiro" },
            ],
            explica: npv > 0 ? "VPL positivo: o investimento rende mais que a taxa de desconto." : "VPL negativo ou zero: a taxa de desconto não é coberta.",
            formula: "VPL = −investimento + soma(entrada_t ÷ (1 + i)^t)",
          };
        },
      },
    ]);
  }

  if (typeof module === "object" && module.exports) module.exports = M;
})(typeof window !== "undefined" ? window : globalThis);
