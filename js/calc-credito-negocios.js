/* Módulo: Crédito e dívidas + Negócios. Funções puras (testáveis em Node) + registro no catálogo. */
(function (root) {
  "use strict";
  const CAT = root.CATALOGO;

  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // Price: parcela fixa. parcela = P·i ÷ (1 − (1+i)^−n)
  function financiamentoPrice({ valor, taxaMensalPct, meses }) {
    const P = Math.max(0, Number(valor) || 0);
    const i = (Number(taxaMensalPct) || 0) / 100;
    const n = Math.max(1, Math.floor(Number(meses) || 0));
    const parcela = i === 0 ? P / n : (P * i) / (1 - Math.pow(1 + i, -n));
    const total = parcela * n;
    return { parcela: r2(parcela), total: r2(total), juros: r2(total - P) };
  }

  // SAC: amortização fixa; parcelas decrescem. Total = P + i·P·(n+1)/2.
  function financiamentoSAC({ valor, taxaMensalPct, meses }) {
    const P = Math.max(0, Number(valor) || 0);
    const i = (Number(taxaMensalPct) || 0) / 100;
    const n = Math.max(1, Math.floor(Number(meses) || 0));
    const amort = P / n;
    const primeira = amort + P * i;
    const ultima = amort + (P - amort * (n - 1)) * i;
    const total = P + (i * P * (n + 1)) / 2;
    return { primeira: r2(primeira), ultima: r2(ultima), total: r2(total), juros: r2(total - P) };
  }

  // Taxa embutida: acha i tal que vista = parcela × (1 − (1+i)^−n) ÷ i (bisseção).
  function taxaParcelamento({ vista, parcela, n }) {
    const V = Number(vista);
    const p = Number(parcela);
    const k = Math.floor(Number(n));
    if (!(V > 0) || !(p > 0) || !(k > 0)) return NaN;
    if (p * k < V) return NaN; // sem juros, o total já seria menor que o à vista: não há taxa positiva
    const presente = (i) => (i === 0 ? p * k : (p * (1 - Math.pow(1 + i, -k))) / i);
    let lo = 0;
    let hi = 1;
    for (let it = 0; it < 200; it++) {
      const mid = (lo + hi) / 2;
      if (presente(mid) > V) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2; // taxa mensal, em decimal
  }

  // Rotativo: saldo cresce com juros compostos mensais sem pagamento.
  function rotativo({ divida, taxaMensalPct, meses }) {
    const D = Math.max(0, Number(divida) || 0);
    const i = (Number(taxaMensalPct) || 0) / 100;
    const n = Math.max(0, Math.floor(Number(meses) || 0));
    const saldo = D * Math.pow(1 + i, n);
    return {
      saldo: r2(saldo),
      juros: r2(saldo - D),
      taxaAnualPct: (Math.pow(1 + i, 12) - 1) * 100,
    };
  }

  // Alugar ou financiar: custo financiando (entrada + parcelas + oportunidade da entrada) vs custo do aluguel com reajuste.
  function alugarOuFinanciar({ valorImovel, entrada, taxaMensalPct, anos, aluguel, reajustePct, rendimentoPct }) {
    const V = Math.max(0, Number(valorImovel) || 0);
    const E = Math.min(V, Math.max(0, Number(entrada) || 0));
    const financiado = V - E;
    const n = Math.max(1, Math.floor((Number(anos) || 0) * 12));
    const price = financiamentoPrice({ valor: financiado, taxaMensalPct, meses: n });
    const r = (Number(rendimentoPct) || 0) / 100;
    const oportunidade = E * (Math.pow(1 + r, (Number(anos) || 0)) - 1);
    const custoFinanciar = E + price.total + oportunidade;

    const reajuste = (Number(reajustePct) || 0) / 100;
    let custoAluguel = 0;
    const A = Math.max(0, Number(aluguel) || 0);
    for (let ano = 0; ano < Math.floor(Number(anos) || 0); ano++) {
      custoAluguel += A * 12 * Math.pow(1 + reajuste, ano);
    }
    return {
      parcela: price.parcela,
      custoFinanciar: r2(custoFinanciar),
      custoAluguel: r2(custoAluguel),
      diferenca: r2(custoFinanciar - custoAluguel),
    };
  }

  // Preço de venda: preço = custo ÷ (1 − (impostos + comissão + lucro)/100)
  function precoVenda({ custo, impostosPct, comissaoPct, lucroPct }) {
    const c = Math.max(0, Number(custo) || 0);
    const taxas = ((Number(impostosPct) || 0) + (Number(comissaoPct) || 0) + (Number(lucroPct) || 0)) / 100;
    if (taxas >= 1) return NaN;
    const preco = c / (1 - taxas);
    return { preco: r2(preco), lucro: r2(preco * ((Number(lucroPct) || 0) / 100)), descontos: r2(preco * (taxas - (Number(lucroPct) || 0) / 100)) };
  }

  function margem({ custo, preco }) {
    const c = Number(custo) || 0;
    const p = Number(preco) || 0;
    if (p <= 0) return { margemVenda: NaN, markup: NaN };
    return {
      margemVenda: ((p - c) / p) * 100,
      markup: c > 0 ? ((p - c) / c) * 100 : NaN,
    };
  }

  function pontoEquilibrio({ fixos, preco, variavel }) {
    const F = Math.max(0, Number(fixos) || 0);
    const p = Number(preco) || 0;
    const v = Number(variavel) || 0;
    if (p <= v) return { quantidade: NaN, receita: NaN };
    const q = Math.ceil(F / (p - v));
    return { quantidade: q, receita: r2(q * p) };
  }

  function vendasCartao({ valor, taxaPct }) {
    const V = Math.max(0, Number(valor) || 0);
    const taxa = Math.max(0, Number(taxaPct) || 0);
    return { taxa: r2((V * taxa) / 100), liquido: r2(V * (1 - taxa / 100)) };
  }

  function porcentagem({ base, pct }) {
    const B = Number(base) || 0;
    const p = Number(pct) || 0;
    const parte = (B * p) / 100;
    return { parte: r2(parte), mais: r2(B + parte), menos: r2(B - parte) };
  }

  function combustivel({ km, consumo, preco }) {
    const d = Math.max(0, Number(km) || 0);
    const c = Number(consumo) || 0;
    const p = Number(preco) || 0;
    if (c <= 0) return { litros: NaN, custo: NaN, porKm: NaN };
    const litros = d / c;
    const custo = litros * p;
    return { litros: r2(litros), custo: r2(custo), porKm: d > 0 ? r2(custo / d) : 0 };
  }

  const M = {
    financiamentoPrice,
    financiamentoSAC,
    taxaParcelamento,
    rotativo,
    alugarOuFinanciar,
    precoVenda,
    margem,
    pontoEquilibrio,
    vendasCartao,
    porcentagem,
    combustivel,
  };

  if (CAT) {
    const f = CAT.campos;
    const brl = CAT.brl;

    CAT.registrar([
      {
        id: "financiamento",
        grupo: "credito",
        titulo: "Financiamento SAC e Price",
        cmd: "calc financiamento",
        desc: "Compare as duas formas de pagar um financiamento: parcela fixa (Price) ou decrescente (SAC).",
        campos: [
          f.dinheiro("valor", "Valor financiado", 100000),
          f.percentual("taxa", "Taxa mensal", 1, "% ao mês"),
          f.inteiro("meses", "Prazo em meses", 120),
        ],
        calcular(v) {
          const p = financiamentoPrice({ valor: v.valor, taxaMensalPct: v.taxa, meses: v.meses });
          const s = financiamentoSAC({ valor: v.valor, taxaMensalPct: v.taxa, meses: v.meses });
          const maisBarato = s.total < p.total ? "SAC" : "Price";
          return {
            itens: [
              { rot: "Price: parcela fixa", valor: p.parcela, tipo: "dinheiro" },
              { rot: "Price: total pago", valor: p.total, tipo: "dinheiro" },
              { rot: "SAC: primeira parcela", valor: s.primeira, tipo: "dinheiro" },
              { rot: "SAC: última parcela", valor: s.ultima, tipo: "dinheiro" },
              { rot: "SAC: total pago", valor: s.total, tipo: "dinheiro", destaque: true },
            ],
            grafico: (() => {
              const n = Math.max(1, Math.floor(v.meses));
              const i = v.taxa / 100;
              const P = v.valor;
              const rotulos = [];
              const sac = [];
              const price = [];
              for (let k = 0; k <= n; k++) {
                rotulos.push(String(k));
                sac.push(P * (1 - k / n));
                price.push(i === 0 ? P * (1 - k / n) : (P * (Math.pow(1 + i, n) - Math.pow(1 + i, k))) / (Math.pow(1 + i, n) - 1));
              }
              return { tipo: "linha", titulo: "Quanto ainda falta pagar (mês a mês)", rotulos, series: [{ rot: "SAC", valores: sac }, { rot: "Price", valores: price, cor: "#ff9f0a" }], formato: "dinheiro" };
            })(),
          explica: `O SAC costuma pagar menos juros no total. Com estes números, o mais barato é ${maisBarato}. A diferença de juros entre os dois é ${brl(Math.abs(p.total - s.total))}.`,
            formula: "Price: P·i ÷ (1 − (1+i)^−n)\nSAC: amortização = P ÷ n; parcela_k = amortização + (saldo devedor)·i",
            aviso: "Não inclui seguros, tarifas nem TR. Confira o CET no contrato.",
          };
        },
      },
      {
        id: "consignado",
        grupo: "credito",
        titulo: "Empréstimo consignado",
        cmd: "calc consignado",
        desc: "Parcela e total de um empréstimo descontado direto do salário ou aposentadoria.",
        campos: [
          f.dinheiro("valor", "Valor emprestado", 10000),
          f.percentual("taxa", "Taxa mensal", 1.8, "% ao mês"),
          f.inteiro("meses", "Número de parcelas", 36),
        ],
        calcular(v) {
          const p = financiamentoPrice({ valor: v.valor, taxaMensalPct: v.taxa, meses: v.meses });
          return {
            itens: [
              { rot: "Parcela mensal", valor: p.parcela, tipo: "dinheiro", destaque: true },
              { rot: "Total pago", valor: p.total, tipo: "dinheiro" },
              { rot: "Juros", valor: p.juros, tipo: "dinheiro" },
            ],
            grafico: { tipo: "rosca", titulo: "Quanto sai no total", dados: [{ rot: "Valor emprestado", valor: v.valor }, { rot: "Juros", valor: p.juros, destaque: true }], formato: "dinheiro" },
            explica: `Você paga ${brl(p.parcela)} por mês durante ${v.meses} meses, e os juros somam ${brl(p.juros)}.`,
            formula: "parcela = P·i ÷ (1 − (1+i)^−n)  (Tabela Price)",
            aviso: "Consignado tem limite de comprometimento da renda. Confira a taxa no contrato.",
          };
        },
      },
      {
        id: "taxa-parcelamento",
        grupo: "credito",
        titulo: "Taxa do parcelamento",
        cmd: "calc taxa-parcelamento",
        desc: "Descubra quanto de juros está escondido numa oferta de parcelado sem juros aparentes.",
        campos: [
          f.dinheiro("vista", "Preço à vista", 1000),
          f.dinheiro("parcela", "Valor de cada parcela", 550),
          f.inteiro("n", "Número de parcelas", 2),
        ],
        calcular(v) {
          const i = taxaParcelamento({ vista: v.vista, parcela: v.parcela, n: v.n });
          if (!Number.isFinite(i)) {
            return { itens: [], explica: "Não há taxa positiva: o total das parcelas é igual ou menor que o preço à vista." };
          }
          const anual = (Math.pow(1 + i, 12) - 1) * 100;
          return {
            itens: [
              { rot: "Taxa mensal embutida", valor: i * 100, tipo: "percentual", destaque: true },
              { rot: "Taxa anual equivalente", valor: anual, tipo: "percentual" },
              { rot: "Total no parcelado", valor: v.parcela * v.n, tipo: "dinheiro" },
            ],
            grafico: { tipo: "barras", titulo: "Preço à vista e total parcelado", dados: [{ rot: "Preço à vista", valor: v.vista }, { rot: `Total em ${v.n} parcelas`, valor: v.parcela * v.n, destaque: true }], formato: "dinheiro" },
            explica: `Pagar em ${v.n} parcelas de ${brl(v.parcela)} equivale a pagar juros de ${(i * 100).toFixed(2).replace(".", ",")}% ao mês.`,
            formula: "vista = parcela × (1 − (1+i)^−n) ÷ i   (1ª parcela daqui a 1 mês; i resolvido por bisseção)",
          };
        },
      },
      {
        id: "rotativo",
        grupo: "credito",
        titulo: "Rotativo do cartão",
        cmd: "calc rotativo",
        desc: "Quanto cresce uma dívida no rotativo do cartão quando só o mínimo é pago.",
        campos: [
          f.dinheiro("divida", "Valor da dívida", 1000),
          f.percentual("taxa", "Taxa mensal do rotativo", 14, "% ao mês, confira na fatura"),
          f.inteiro("meses", "Meses sem pagar o total", 6),
        ],
        calcular(v) {
          const r = rotativo({ divida: v.divida, taxaMensalPct: v.taxa, meses: v.meses });
          return {
            itens: [
              { rot: "Saldo após o período", valor: r.saldo, tipo: "dinheiro", destaque: true },
              { rot: "Juros cobrados", valor: r.juros, tipo: "dinheiro" },
              { rot: "Taxa anual equivalente", valor: r.taxaAnualPct, tipo: "percentual" },
            ],
            grafico: (() => {
              const n = Math.max(1, Math.floor(v.meses));
              const i = v.taxa / 100;
              const rotulos = [];
              const saldo = [];
              const divida = [];
              for (let m = 0; m <= n; m++) {
                rotulos.push(String(m));
                saldo.push(v.divida * Math.pow(1 + i, m));
                divida.push(v.divida);
              }
              return { tipo: "linha", titulo: "Saldo mês a mês, sem pagar", rotulos, series: [{ rot: "Saldo da dívida", valores: saldo }, { rot: "Dívida inicial", valores: divida, cor: "var(--texto-3)" }], formato: "dinheiro" };
            })(),
            explica: `Com ${v.meses} meses no rotativo, a dívida de ${brl(v.divida)} vira ${brl(r.saldo)}.`,
            formula: "saldo = dívida × (1 + i)^meses",
            aviso: "Simulação sem pagamentos intermediários. Para o parcelamento da fatura, a conta muda.",
          };
        },
      },
      {
        id: "alugar-ou-financiar",
        grupo: "credito",
        titulo: "Alugar ou financiar",
        cmd: "calc alugar-ou-financiar",
        desc: "Compare o custo de financiar um imóvel com o custo de pagar aluguel pelo mesmo período.",
        campos: [
          f.dinheiro("valor", "Valor do imóvel", 400000),
          f.dinheiro("entrada", "Entrada", 80000),
          f.percentual("taxa", "Taxa mensal do financiamento", 0.9, "% ao mês"),
          f.inteiro("anos", "Prazo em anos", 30),
          f.dinheiro("aluguel", "Aluguel mensal", 2000),
          f.percentual("reajuste", "Reajuste anual do aluguel", 6, "% ao ano"),
          f.percentual("rendimento", "Rendimento anual da entrada", 10, "% ao ano, se ficasse investida"),
        ],
        calcular(v) {
          const r = alugarOuFinanciar({
            valorImovel: v.valor,
            entrada: v.entrada,
            taxaMensalPct: v.taxa,
            anos: v.anos,
            aluguel: v.aluguel,
            reajustePct: v.reajuste,
            rendimentoPct: v.rendimento,
          });
          const melhor = r.diferenca > 0 ? "alugar" : "financiar";
          return {
            itens: [
              { rot: "Parcela inicial do financiamento", valor: r.parcela, tipo: "dinheiro" },
              { rot: "Custo total financiando", valor: r.custoFinanciar, tipo: "dinheiro" },
              { rot: "Custo total alugando", valor: r.custoAluguel, tipo: "dinheiro" },
              { rot: "Diferença", valor: Math.abs(r.diferenca), tipo: "dinheiro", destaque: true },
            ],
            grafico: { tipo: "barras", titulo: "Custo total no período", dados: [{ rot: "Financiando", valor: r.custoFinanciar, destaque: melhor === "financiar" }, { rot: "Alugando", valor: r.custoAluguel, destaque: melhor === "alugar" }], formato: "dinheiro" },
            explica: `Pelos números informados, ${melhor} custa menos. A conta não considera a valorização do imóvel, IPTU, condomínio nem manutenção.`,
            formula: "financiando = entrada + total pago + entrada × ((1+r)^anos − 1)\nalugando = soma do aluguel anual com reajuste",
            aviso: "Comparação simplificada. Use como ponto de partida, não como decisão final.",
          };
        },
      },
      {
        id: "preco-venda",
        grupo: "negocios",
        titulo: "Preço de venda",
        cmd: "calc preco-venda",
        desc: "Quanto cobrar por um produto para cobrir impostos, comissão e ainda ter lucro.",
        campos: [
          f.dinheiro("custo", "Custo do produto", 50),
          f.percentual("impostos", "Impostos sobre a venda", 6, "% do preço"),
          f.percentual("comissao", "Comissão ou taxa", 3, "% do preço"),
          f.percentual("lucro", "Lucro desejado", 20, "% do preço"),
        ],
        calcular(v) {
          const r = precoVenda({ custo: v.custo, impostosPct: v.impostos, comissaoPct: v.comissao, lucroPct: v.lucro });
          if (!Number.isFinite(r.preco)) return { itens: [], explica: "A soma de impostos, comissão e lucro não pode chegar a 100%." };
          return {
            itens: [
              { rot: "Preço de venda", valor: r.preco, tipo: "dinheiro", destaque: true },
              { rot: "Lucro em reais", valor: r.lucro, tipo: "dinheiro" },
              { rot: "Descontos (impostos e taxas)", valor: r.descontos, tipo: "dinheiro" },
            ],
            grafico: { tipo: "rosca", titulo: "Para onde vai cada real do preço", dados: [{ rot: "Custo do produto", valor: v.custo }, { rot: "Impostos", valor: (r.preco * v.impostos) / 100 }, { rot: "Comissão ou taxa", valor: (r.preco * v.comissao) / 100 }, { rot: "Seu lucro", valor: r.lucro, destaque: true }], formato: "dinheiro" },
            explica: `Vendendo por ${brl(r.preco)}, sobram ${brl(r.lucro)} de lucro depois de impostos e taxas.`,
            formula: "preço = custo ÷ (1 − (impostos + comissão + lucro)/100)",
          };
        },
      },
      {
        id: "margem-lucro",
        grupo: "negocios",
        titulo: "Margem de lucro",
        cmd: "calc margem",
        desc: "Mostra a margem sobre a venda e o markup sobre o custo de um produto.",
        campos: [
          f.dinheiro("custo", "Custo do produto", 50),
          f.dinheiro("preco", "Preço de venda", 100),
        ],
        calcular(v) {
          const r = margem({ custo: v.custo, preco: v.preco });
          return {
            itens: [
              { rot: "Margem sobre a venda", valor: r.margemVenda, tipo: "percentual", destaque: true },
              { rot: "Markup sobre o custo", valor: r.markup, tipo: "percentual" },
            ],
            grafico: { tipo: "barras", titulo: "Custo, preço e lucro", dados: [{ rot: "Custo", valor: v.custo }, { rot: "Preço de venda", valor: v.preco, destaque: true }, { rot: "Lucro (preço − custo)", valor: v.preco - v.custo }], formato: "dinheiro" },
            explica: "Margem é a parte do preço que sobra como lucro. Markup é quanto o preço cresce sobre o custo. Os dois números são diferentes.",
            formula: "margem = (preço − custo) ÷ preço\nmarkup = (preço − custo) ÷ custo",
          };
        },
      },
      {
        id: "ponto-equilibrio",
        grupo: "negocios",
        titulo: "Ponto de equilíbrio",
        cmd: "calc ponto-equilibrio",
        desc: "Quantas vendas você precisa fazer para cobrir todos os custos.",
        campos: [
          f.dinheiro("fixos", "Custos fixos mensais", 5000, "Aluguel, salários, contas"),
          f.dinheiro("preco", "Preço de venda unitário", 100),
          f.dinheiro("variavel", "Custo variável unitário", 40, "Matéria-prima e embalagem por unidade"),
        ],
        calcular(v) {
          const r = pontoEquilibrio({ fixos: v.fixos, preco: v.preco, variavel: v.variavel });
          if (!Number.isFinite(r.quantidade)) {
            return { itens: [], explica: "O preço precisa ser maior que o custo variável para existir ponto de equilíbrio." };
          }
          return {
            itens: [
              { rot: "Vendas necessárias por mês", valor: r.quantidade, tipo: "inteiro", destaque: true },
              { rot: "Receita de equilíbrio", valor: r.receita, tipo: "dinheiro" },
            ],
            grafico: (() => {
              const xmax = Math.max(10, Math.ceil(r.quantidade * 1.5));
              const passo = Math.ceil(xmax / 40);
              const rotulos = [];
              const receita = [];
              const custo = [];
              for (let x = 0; x <= xmax; x += passo) {
                rotulos.push(String(x));
                receita.push(x * v.preco);
                custo.push(v.fixos + x * v.variavel);
              }
              return { tipo: "linha", titulo: "Receita e custos por unidade vendida", rotulos, series: [{ rot: "Receita", valores: receita }, { rot: "Custo total", valores: custo, cor: "#ff9f0a" }], formato: "dinheiro" };
            })(),
            explica: `Você precisa vender ${r.quantidade} unidades por mês para cobrir os custos. Cada venda contribui com ${brl(v.preco - v.variavel)}.`,
            formula: "quantidade = custos fixos ÷ (preço − custo variável)",
          };
        },
      },
      {
        id: "vendas-cartao",
        grupo: "negocios",
        titulo: "Vendas no cartão",
        cmd: "calc vendas-cartao",
        desc: "Quanto entra na sua conta depois da taxa da maquininha.",
        campos: [
          f.dinheiro("valor", "Valor da venda", 200),
          f.percentual("taxa", "Taxa da maquininha", 2.5, "% sobre a venda"),
        ],
        calcular(v) {
          const r = vendasCartao({ valor: v.valor, taxaPct: v.taxa });
          return {
            itens: [
              { rot: "Taxa cobrada", valor: r.taxa, tipo: "dinheiro" },
              { rot: "Valor que entra", valor: r.liquido, tipo: "dinheiro", destaque: true },
            ],
            grafico: { tipo: "rosca", titulo: "De cada venda", dados: [{ rot: "Valor que entra", valor: r.liquido, destaque: true }, { rot: "Taxa da maquininha", valor: r.taxa }], formato: "dinheiro" },
            explica: `De uma venda de ${brl(v.valor)}, a maquininha fica com ${brl(r.taxa)}.`,
            formula: "líquido = venda × (1 − taxa)",
            aviso: "Taxas variam por bandeira, tipo de cartão e número de parcelas.",
          };
        },
      },
      {
        id: "porcentagem",
        grupo: "negocios",
        titulo: "Porcentagem",
        cmd: "calc porcentagem",
        desc: "Calcule um percentual de um valor, e o valor com acréscimo ou desconto.",
        campos: [
          f.dinheiro("base", "Valor", 200),
          f.percentual("pct", "Percentual", 15, "%"),
        ],
        calcular(v) {
          const r = porcentagem({ base: v.base, pct: v.pct });
          return {
            itens: [
              { rot: `${v.pct}% do valor`, valor: r.parte, tipo: "dinheiro" },
              { rot: "Valor mais o percentual", valor: r.mais, tipo: "dinheiro", destaque: true },
              { rot: "Valor menos o percentual", valor: r.menos, tipo: "dinheiro" },
            ],
            grafico: { tipo: "barras", titulo: "Valor antes e depois do percentual", dados: [{ rot: `Valor menos ${v.pct}%`, valor: r.menos }, { rot: "Valor original", valor: v.base }, { rot: `Valor mais ${v.pct}%`, valor: r.mais, destaque: true }], formato: "dinheiro" },
            formula: "parte = valor × percentual ÷ 100",
          };
        },
      },
      {
        id: "combustivel",
        grupo: "cotidiano",
        titulo: "Custo de combustível",
        cmd: "calc combustivel",
        desc: "Quanto custa uma viagem de carro, e quanto custa cada quilômetro.",
        campos: [
          f.inteiro("km", "Distância em km", 300),
          f.numero("consumo", "Consumo", 12, "km por litro"),
          f.dinheiro("preco", "Preço do litro", 6, "Gasolina, etanol ou diesel"),
        ],
        calcular(v) {
          const r = combustivel({ km: v.km, consumo: v.consumo, preco: v.preco });
          if (!Number.isFinite(r.custo)) return { itens: [], explica: "Informe um consumo maior que zero." };
          return {
            itens: [
              { rot: "Litros necessários", valor: r.litros, tipo: "numero" },
              { rot: "Custo da viagem", valor: r.custo, tipo: "dinheiro", destaque: true },
              { rot: "Custo por km", valor: r.porKm, tipo: "dinheiro" },
            ],
            grafico: (() => {
              const km = Math.max(0, v.km);
              const passo = Math.max(1, Math.ceil(km / 20));
              const rotulos = [];
              const custo = [];
              for (let d = 0; d <= km; d += passo) {
                rotulos.push(String(d));
                custo.push((d / v.consumo) * v.preco);
              }
              if (rotulos[rotulos.length - 1] !== String(km)) {
                rotulos.push(String(km));
                custo.push((km / v.consumo) * v.preco);
              }
              return { tipo: "linha", titulo: "Custo conforme a distância (km)", rotulos, series: [{ rot: "Custo da viagem", valores: custo }], formato: "dinheiro" };
            })(),
            explica: `A viagem de ${v.km} km custa ${brl(r.custo)} em combustível.`,
            formula: "litros = km ÷ consumo\ncusto = litros × preço do litro",
          };
        },
      },
    ]);
  }

  if (typeof module === "object" && module.exports) module.exports = M;
})(typeof window !== "undefined" ? window : globalThis);
