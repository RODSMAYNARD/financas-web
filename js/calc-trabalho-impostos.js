/* Módulo: Trabalho + Impostos. Funções puras (testáveis em Node) + registro no catálogo.
 * Regras de referência: conferir sempre nas fontes oficiais antes de usar em decisão real. */
(function (root) {
  "use strict";
  const CAT = root.CATALOGO;
  const C = root.Calc || (typeof require === "function" ? require("./calc.js") : null);

  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const SALARIO_MINIMO = 1621.0; // referência 2026
  const TETO_SEGURO = 2424.1; // referência
  const MIN_SEGURO = 1621.0;
  const DEDUCAO_DEP_ANUAL = 2275.08; // 189,59 × 12
  const TETO_SIMPLIFICADO = 16754.34;

  const liquido = (bruto) => C.salarioLiquido({ bruto, dependentes: 0 }).liquido;

  // 13º: 1/12 por mês trabalhado; 1ª parcela sem descontos; 2ª parcela = líquido total − 1ª.
  function decimoTerceiro({ salario, meses }) {
    const S = Math.max(0, Number(salario) || 0);
    const m = Math.min(12, Math.max(0, Math.floor(Number(meses) || 0)));
    const bruto = (S / 12) * m;
    const primeira = bruto / 2;
    const liquidoTotal = liquido(bruto);
    return { bruto: r2(bruto), primeira: r2(primeira), segunda: r2(liquidoTotal - primeira), liquidoTotal: r2(liquidoTotal) };
  }

  // Férias: dias (padrão 30) + 1/3 constitucional. Abono: 10 dias + 1/3, sem descontos.
  function ferias({ salario, dias, abono }) {
    const S = Math.max(0, Number(salario) || 0);
    const d = Math.min(30, Math.max(0, Number(dias) || 0));
    const base = (S * d) / 30;
    const terco = base / 3;
    const bruto = base + terco;
    const abonoValor = abono ? ((S * 10) / 30) * (4 / 3) : 0;
    const net = liquido(bruto);
    return {
      base: r2(base),
      terco: r2(terco),
      bruto: r2(bruto),
      descontos: r2(bruto - net),
      abono: r2(abonoValor),
      liquido: r2(net + abonoValor),
    };
  }

  // Rescisão: motivos 'sem_justa', 'pedido', 'justa', 'acordo' (art. 484-A).
  function rescisao({ salario, diasSaldo, mesesAno, anos, mesesTotais, saldoFgts, feriasVencidas, motivo }) {
    const S = Math.max(0, Number(salario) || 0);
    const dias = Math.min(30, Math.max(0, Number(diasSaldo) || 0));
    const m = Math.min(12, Math.max(0, Math.floor(Number(mesesAno) || 0)));
    const anosEmp = Math.max(0, Math.floor(Number(anos) || 0));
    const fgts = Number(saldoFgts) > 0 ? Number(saldoFgts) : (S * 0.08 * Math.max(0, Number(mesesTotais) || 0));

    const saldoSalario = (S * dias) / 30;
    const avisoDias = Math.min(90, 30 + 3 * anosEmp);
    const avisoIntegral = (S / 30) * avisoDias;
    const aviso = motivo === "sem_justa" ? avisoIntegral : motivo === "acordo" ? avisoIntegral * 0.5 : 0;
    const semDecimoFerias = motivo === "justa";
    const decimo = semDecimoFerias ? 0 : (S / 12) * m;
    const feriasProp = semDecimoFerias ? 0 : ((S / 12) * m * 4) / 3;
    const feriasVenc = feriasVencidas ? (S * 4) / 3 : 0;
    const multa = motivo === "sem_justa" ? fgts * 0.4 : motivo === "acordo" ? fgts * 0.2 : 0;
    const saque = motivo === "sem_justa" ? fgts : motivo === "acordo" ? fgts * 0.8 : 0;

    const tributavel = saldoSalario + decimo + feriasProp + feriasVenc;
    const liqTrib = liquido(tributavel);
    return {
      saldoSalario: r2(saldoSalario),
      aviso: r2(aviso),
      decimo: r2(decimo),
      feriasProp: r2(feriasProp),
      feriasVenc: r2(feriasVenc),
      multa: r2(multa),
      fgts: r2(fgts),
      saque: r2(saque),
      bruto: r2(tributavel + aviso + multa),
      descontos: r2(tributavel - liqTrib),
      liquido: r2(liqTrib + aviso + multa),
    };
  }

  // FGTS estimado: saldo inicial + 8% do salário por mês, sem correção.
  function fgts({ salario, meses, saldoInicial }) {
    const S = Math.max(0, Number(salario) || 0);
    const n = Math.max(0, Number(meses) || 0);
    const saldo = Math.max(0, Number(saldoInicial) || 0) + S * 0.08 * n;
    return { saldo: r2(saldo), multa: r2(saldo * 0.4) };
  }

  // Seguro-desemprego (regra de referência): média até 2.071,20 → 80%; até 3.451,01 → 1.656,96 + 50% do excedente; teto acima.
  function valorSeguroDesemprego(media) {
    const m = Math.max(0, Number(media) || 0);
    let parcela;
    if (m <= 2071.2) parcela = m * 0.8;
    else if (m <= 3451.01) parcela = 1656.96 + (m - 2071.2) * 0.5;
    else parcela = TETO_SEGURO;
    return r2(Math.min(TETO_SEGURO, Math.max(MIN_SEGURO, parcela)));
  }

  function horaExtra({ salario, horas, adicionalPct }) {
    const S = Math.max(0, Number(salario) || 0);
    const h = Number(horas) || 220;
    const valorHora = S / h;
    return { valorHora: r2(valorHora), horaExtra: r2(valorHora * (1 + (Number(adicionalPct) || 0) / 100)) };
  }

  function insalubridade({ salarioMinimo, grau }) {
    return r2((Number(salarioMinimo) || SALARIO_MINIMO) * (Number(grau) || 0) / 100);
  }

  function periculosidade({ salario }) {
    return r2((Number(salario) || 0) * 0.3);
  }

  // CLT x PJ: CLT = líquido × 12 + 13º + férias com 1/3 (aproximados pelo bruto). PJ = valor × 12 − imposto.
  function cltVsPj({ salarioCLT, valorPJ, simplesPct }) {
    const S = Math.max(0, Number(salarioCLT) || 0);
    const pj = Math.max(0, Number(valorPJ) || 0);
    const imposto = (Number(simplesPct) || 0) / 100;
    const cltAnual = liquido(S) * 12 + S + (S * 4) / 3;
    const pjAnual = pj * 12 * (1 - imposto);
    return { cltAnual: r2(cltAnual), pjAnual: r2(pjAnual), diferenca: r2(pjAnual - cltAnual) };
  }

  // Custo do empregador: encargos aproximados.
  const ENCARGOS = { decimo: 1 / 12, feriasTerco: ((1 / 12) * 4) / 3, fgts: 0.08, inssPatronal: 0.2, rat: 0.02, sistemaS: 0.058 };
  function custoClt({ salario }) {
    const S = Math.max(0, Number(salario) || 0);
    const encargos = Object.values(ENCARGOS).reduce((a, b) => a + b, 0);
    const extras = S * encargos;
    return { encargos: r2(extras), total: r2(S + extras), percentual: r2(encargos * 100) };
  }

  function salarioAnual({ salario, numSalarios, comFerias }) {
    const S = Math.max(0, Number(salario) || 0);
    const n = Math.max(0, Number(numSalarios) || 0);
    const ferias13 = comFerias ? (S * 4) / 3 : 0;
    return r2(S * n + ferias13);
  }

  // IR anual: rendimentos − deduções; tabela mensal ×12; isenção até R$ 60 mil/ano; redução gradual até R$ 88.200.
  function irrfMensal(base) {
    const faixa = C.CONFIG.irrf.faixas.find((f) => base <= f.ate);
    return Math.max(0, base * faixa.aliquota - faixa.deducao);
  }
  function irpfAnual({ renda, inssAnual, dependentes, outras, simplificado }) {
    const R = Math.max(0, Number(renda) || 0);
    const deducao = simplificado
      ? Math.min(0.25 * R, TETO_SIMPLIFICADO)
      : (Number(inssAnual) || 0) + (Number(dependentes) || 0) * DEDUCAO_DEP_ANUAL + (Number(outras) || 0);
    const base = Math.max(0, R - deducao);
    const tabela = 12 * irrfMensal(base / 12);
    let imposto;
    if (R <= 60000) imposto = 0;
    else if (R <= 88200) imposto = Math.max(0, tabela - (12 * 978.62 - 0.133145 * R));
    else imposto = tabela;
    return { base: r2(base), deducao: r2(deducao), imposto: r2(imposto), aliquotaEfetiva: R > 0 ? r2((imposto / R) * 100) : 0 };
  }

  function ipva({ valor, aliquotaPct }) {
    return r2((Number(valor) || 0) * ((Number(aliquotaPct) || 0) / 100));
  }

  // MEI (DAS): 5% do salário mínimo + ISS (5) ou ICMS (1). Simples: 6% (faixa inicial, aproximação).
  function meiSimples({ faturamento, tipo }) {
    const F = Math.max(0, Number(faturamento) || 0);
    if (tipo === "simples") return { mensal: r2(F * 0.06), anual: r2(F * 12 * 0.06) };
    const extra = tipo === "mei_comercio" ? 1 : 5;
    const mensal = SALARIO_MINIMO * 0.05 + extra;
    return { mensal: r2(mensal), anual: r2(mensal * 12) };
  }

  const M = {
    decimoTerceiro, ferias, rescisao, fgts, valorSeguroDesemprego, horaExtra,
    insalubridade, periculosidade, cltVsPj, custoClt, salarioAnual, irpfAnual, ipva, meiSimples,
  };

  if (CAT) {
    const f = CAT.campos;
    const brl = CAT.brl;
    const SIM_NAO = [{ v: "nao", rot: "Não" }, { v: "sim", rot: "Sim" }];
    const isSim = (x) => x === "sim";

    CAT.registrar([
      {
        id: "decimo-terceiro",
        grupo: "trabalho",
        titulo: "13º salário",
        cmd: "calc 13-salario",
        desc: "Quanto você recebe de 13º, em duas parcelas, de acordo com os meses trabalhados.",
        campos: [
          f.dinheiro("salario", "Salário mensal", 3000),
          f.inteiro("meses", "Meses trabalhados no ano", 12, "De 1 a 12"),
        ],
        calcular(v) {
          const r = decimoTerceiro({ salario: v.salario, meses: v.meses });
          return {
            itens: [
              { rot: "1ª parcela (sem descontos)", valor: r.primeira, tipo: "dinheiro" },
              { rot: "2ª parcela (líquida)", valor: r.segunda, tipo: "dinheiro", destaque: true },
              { rot: "Total bruto", valor: r.bruto, tipo: "dinheiro" },
            ],
            grafico: { tipo: "rosca", titulo: "De onde sai o 13º", dados: [{ rot: "1ª parcela (sem descontos)", valor: r.primeira }, { rot: "2ª parcela (líquida)", valor: r.segunda, destaque: true }, { rot: "Descontos (INSS e IR)", valor: r.bruto - r.liquidoTotal }], formato: "dinheiro" },
            explica: "A 1ª parcela sai sem descontos. A 2ª já desconta INSS e IR sobre o total.",
            formula: "bruto = salário ÷ 12 × meses\n1ª parcela = bruto ÷ 2",
            aviso: "Descontos aproximados. Confira no seu holerite.",
          };
        },
      },
      {
        id: "ferias",
        grupo: "trabalho",
        titulo: "Férias",
        cmd: "calc ferias",
        desc: "Quanto você recebe de férias com o adicional de 1/3, e se vale vender 10 dias.",
        campos: [
          f.dinheiro("salario", "Salário mensal", 3000),
          f.inteiro("dias", "Dias de férias", 30),
          f.opcoes("abono", "Vender 10 dias (abono)?", "nao", SIM_NAO, "O abono não tem desconto de INSS nem IR"),
        ],
        calcular(v) {
          const r = ferias({ salario: v.salario, dias: v.dias, abono: isSim(v.abono) });
          return {
            itens: [
              { rot: "Férias com 1/3", valor: r.bruto, tipo: "dinheiro" },
              { rot: "Descontos", valor: r.descontos, tipo: "dinheiro" },
              { rot: "Abono (sem descontos)", valor: r.abono, tipo: "dinheiro" },
              { rot: "Total líquido", valor: r.liquido, tipo: "dinheiro", destaque: true },
            ],
            grafico: { tipo: "rosca", titulo: "Como o pagamento se divide", dados: [{ rot: "Líquido de férias", valor: r.liquido - r.abono, destaque: true }, { rot: "Descontos (INSS e IR)", valor: r.descontos }, { rot: "Abono (venda de dias)", valor: r.abono }], formato: "dinheiro" },
            explica: "O adicional de 1/3 é garantido pela Constituição e entra no cálculo.",
            formula: "bruto = salário × dias ÷ 30 × 4/3",
            aviso: "Descontos aproximados. Confira no seu holerite.",
          };
        },
      },
      {
        id: "rescisao",
        grupo: "trabalho",
        titulo: "Rescisão trabalhista",
        cmd: "calc rescisao",
        desc: "Quanto você recebe ao sair do emprego, conforme o motivo da saída.",
        campos: [
          f.dinheiro("salario", "Último salário", 3000),
          f.inteiro("diasSaldo", "Dias trabalhados no último mês", 15, "De 1 a 30"),
          f.inteiro("mesesAno", "Meses trabalhados no ano atual", 6),
          f.inteiro("anos", "Anos de empresa", 2),
          f.inteiro("mesesTotais", "Meses de contrato", 24, "Usado para estimar o FGTS"),
          f.dinheiro("saldoFgts", "Saldo do FGTS (opcional)", 0, "Se zero, estimamos pelo salário"),
          f.opcoes("feriasVencidas", "Tem férias vencidas?", "nao", SIM_NAO),
          f.opcoes("motivo", "Motivo da saída", "sem_justa", [
            { v: "sem_justa", rot: "Demissão sem justa causa" },
            { v: "pedido", rot: "Pedido de demissão" },
            { v: "justa", rot: "Demissão por justa causa" },
            { v: "acordo", rot: "Acordo (484-A)" },
          ]),
        ],
        calcular(v) {
          const r = rescisao({
            salario: v.salario,
            diasSaldo: v.diasSaldo,
            mesesAno: v.mesesAno,
            anos: v.anos,
            mesesTotais: v.mesesTotais,
            saldoFgts: v.saldoFgts,
            feriasVencidas: isSim(v.feriasVencidas),
            motivo: v.motivo,
          });
          return {
            itens: [
              { rot: "Saldo de salário", valor: r.saldoSalario, tipo: "dinheiro" },
              { rot: "Aviso prévio indenizado", valor: r.aviso, tipo: "dinheiro" },
              { rot: "13º proporcional", valor: r.decimo, tipo: "dinheiro" },
              { rot: "Férias (proporcionais e vencidas)", valor: r.feriasProp + r.feriasVenc, tipo: "dinheiro" },
              { rot: "Multa do FGTS", valor: r.multa, tipo: "dinheiro" },
              { rot: "Total líquido recebido", valor: r.liquido, tipo: "dinheiro", destaque: true },
              { rot: "FGTS disponível para saque", valor: r.saque, tipo: "dinheiro" },
            ],
            grafico: { tipo: "barras", titulo: "Verbas antes dos descontos", dados: [{ rot: "Saldo de salário", valor: r.saldoSalario }, { rot: "Aviso prévio indenizado", valor: r.aviso }, { rot: "13º proporcional", valor: r.decimo }, { rot: "Férias", valor: r.feriasProp + r.feriasVenc }, { rot: "Multa do FGTS", valor: r.multa, destaque: true }], formato: "dinheiro" },
            explica: "Veja a lista de verbas do seu motivo. Justa causa não recebe 13º proporcional, férias proporcionais, aviso nem multa.",
            formula: "aviso = salário ÷ 30 × (30 + 3 × anos), até 90 dias\nmulta FGTS = 40% (sem justa causa) ou 20% (acordo)\nFGTS sem justa causa = saldo total; acordo = 80%",
            aviso: "Valores aproximados. Descontos de INSS e IR calculados sobre o total tributável como se fosse um mês.",
          };
        },
      },
      {
        id: "fgts",
        grupo: "trabalho",
        titulo: "FGTS",
        cmd: "calc fgts",
        desc: "Estimativa do saldo do FGTS e da multa de 40% em demissão sem justa causa.",
        campos: [
          f.dinheiro("salario", "Salário mensal", 3000),
          f.inteiro("meses", "Meses de contrato", 24),
          f.dinheiro("saldoInicial", "Saldo inicial (opcional)", 0),
        ],
        calcular(v) {
          const r = fgts({ salario: v.salario, meses: v.meses, saldoInicial: v.saldoInicial });
          return {
            itens: [
              { rot: "Saldo estimado", valor: r.saldo, tipo: "dinheiro" },
              { rot: "Multa de 40%", valor: r.multa, tipo: "dinheiro", destaque: true },
            ],
            grafico: (() => {
              const n = Math.max(1, Math.floor(v.meses));
              const rotulos = [];
              const saldo = [];
              for (let m = 0; m <= n; m++) {
                rotulos.push(String(m));
                saldo.push(Math.max(0, v.saldoInicial) + Math.max(0, v.salario) * 0.08 * m);
              }
              return { tipo: "linha", titulo: "Saldo mês a mês (sem correção)", rotulos, series: [{ rot: "Saldo do FGTS", valores: saldo }], formato: "dinheiro" };
            })(),
            explica: "Depósito de 8% do salário por mês. A conta não inclui a correção monetária dos depósitos.",
            formula: "saldo = saldo inicial + salário × 8% × meses",
            aviso: "Estimativa. Confira o saldo real no app FGTS ou no site da Caixa.",
          };
        },
      },
      {
        id: "seguro-desemprego",
        grupo: "trabalho",
        titulo: "Seguro-desemprego",
        cmd: "calc seguro-desemprego",
        desc: "Valor estimado da parcela e quantas parcelas você pode receber.",
        campos: [
          f.dinheiro("media", "Salário médio dos últimos 3 meses", 3000),
          f.inteiro("parcelas", "Número de parcelas", 4, "Depende do tempo trabalhado; conferir na Caixa"),
        ],
        calcular(v) {
          const parcela = valorSeguroDesemprego(v.media);
          const n = Math.max(0, Math.floor(v.parcelas));
          return {
            itens: [
              { rot: "Valor de cada parcela", valor: parcela, tipo: "dinheiro", destaque: true },
              { rot: "Total de parcelas", valor: parcela * n, tipo: "dinheiro" },
            ],
            grafico: (() => {
              const rotulos = [];
              const parcelas = [];
              for (let media = 0; media <= 6000; media += 250) {
                rotulos.push(String(media / 1000).replace(".", ",") + " mil");
                parcelas.push(valorSeguroDesemprego(media));
              }
              return { tipo: "linha", titulo: "Parcela conforme a média dos salários", rotulos, series: [{ rot: "Valor da parcela", valores: parcelas }], formato: "dinheiro" };
            })(),
            explica: "A parcela segue a média do salário e tem piso e teto. Quanto maior a média, a parcela cresce mais devagar.",
            formula: "média ≤ 2.071,20 → 80% da média\nmédia ≤ 3.451,01 → 1.656,96 + 50% do excedente\nacima → teto",
            aviso: "Regra de referência. Confira o valor e o número de parcelas no site da Caixa ou do Ministério do Trabalho.",
          };
        },
      },
      {
        id: "hora-extra",
        grupo: "trabalho",
        titulo: "Hora extra",
        cmd: "calc hora-extra",
        desc: "Quanto vale cada hora extra, com o adicional de 50% ou 100%.",
        campos: [
          f.dinheiro("salario", "Salário mensal", 3000),
          f.inteiro("horas", "Horas mensais de trabalho", 220),
          f.opcoes("adicional", "Adicional", "50", [{ v: "50", rot: "50% (dias úteis)" }, { v: "100", rot: "100% (domingos e feriados)" }]),
        ],
        calcular(v) {
          const r = horaExtra({ salario: v.salario, horas: v.horas, adicionalPct: Number(v.adicional) });
          return {
            itens: [
              { rot: "Valor da hora normal", valor: r.valorHora, tipo: "dinheiro" },
              { rot: "Valor da hora extra", valor: r.horaExtra, tipo: "dinheiro", destaque: true },
            ],
            grafico: { tipo: "barras", titulo: "Valor de cada hora", dados: [{ rot: "Hora normal", valor: r.valorHora }, { rot: "Hora extra", valor: r.horaExtra, destaque: true }], formato: "dinheiro" },
            formula: "hora = salário ÷ horas mensais\nhora extra = hora × (1 + adicional)",
            aviso: "Para contratos com regras próprias, confira a convenção coletiva.",
          };
        },
      },
      {
        id: "insalubridade",
        grupo: "trabalho",
        titulo: "Adicional de insalubridade",
        cmd: "calc insalubridade",
        desc: "Quanto o adicional de insalubridade acrescenta ao salário, por grau.",
        campos: [
          f.dinheiro("minimo", "Salário mínimo de referência", SALARIO_MINIMO),
          f.opcoes("grau", "Grau", "20", [{ v: "10", rot: "Mínimo (10%)" }, { v: "20", rot: "Médio (20%)" }, { v: "40", rot: "Máximo (40%)" }]),
        ],
        calcular(v) {
          const valor = insalubridade({ salarioMinimo: v.minimo, grau: Number(v.grau) });
          return {
            itens: [{ rot: "Adicional mensal", valor, tipo: "dinheiro", destaque: true }],
            grafico: { tipo: "barras", titulo: "Adicional por grau", dados: [10, 20, 40].map((g) => ({ rot: `Grau ${g}%`, valor: insalubridade({ salarioMinimo: v.minimo, grau: g }), destaque: g === Number(v.grau) })), formato: "dinheiro" },
            explica: "A base é o salário mínimo, não o seu salário, em regra. O grau é definido em laudo.",
            formula: "adicional = salário mínimo × grau",
          };
        },
      },
      {
        id: "periculosidade",
        grupo: "trabalho",
        titulo: "Adicional de periculosidade",
        cmd: "calc periculosidade",
        desc: "Quanto o adicional de periculosidade acrescenta ao salário (30%).",
        campos: [f.dinheiro("salario", "Salário-base", 3000, "Sem gratificações e prêmios")],
        calcular(v) {
          const valor = periculosidade({ salario: v.salario });
          return {
            itens: [{ rot: "Adicional mensal", valor, tipo: "dinheiro", destaque: true }],
            grafico: { tipo: "barras", titulo: "Salário com o adicional", dados: [{ rot: "Salário-base", valor: v.salario }, { rot: "Adicional (30%)", valor, destaque: true }, { rot: "Total com adicional", valor: v.salario + valor }], formato: "dinheiro" },
            explica: "O adicional é de 30% sobre o salário-base, sem gratificações.",
            formula: "adicional = salário-base × 30%",
          };
        },
      },
      {
        id: "clt-vs-pj",
        grupo: "trabalho",
        titulo: "CLT x PJ",
        cmd: "calc clt-pj",
        desc: "Compare o quanto sobra por ano como CLT ou como PJ.",
        campos: [
          f.dinheiro("salarioCLT", "Salário bruto CLT", 6000),
          f.dinheiro("valorPJ", "Valor mensal como PJ", 7000),
          f.percentual("simples", "Imposto da PJ (Simples)", 6, "% sobre o valor"),
        ],
        calcular(v) {
          const r = cltVsPj({ salarioCLT: v.salarioCLT, valorPJ: v.valorPJ, simplesPct: v.simples });
          return {
            itens: [
              { rot: "CLT: total anual", valor: r.cltAnual, tipo: "dinheiro" },
              { rot: "PJ: total anual", valor: r.pjAnual, tipo: "dinheiro" },
              { rot: "Diferença (PJ − CLT)", valor: r.diferenca, tipo: "dinheiro", destaque: true },
            ],
            grafico: { tipo: "barras", titulo: "Quanto sobra no ano", dados: [{ rot: "CLT: total anual", valor: r.cltAnual, destaque: r.cltAnual >= r.pjAnual }, { rot: "PJ: total anual", valor: r.pjAnual, destaque: r.pjAnual > r.cltAnual }], formato: "dinheiro" },
            explica: "A PJ não tem férias, 13º, FGTS, seguro-desemprego nem INSS. Na conta, esses benefícios entram como CLT.",
            formula: "CLT = líquido × 12 + 13º + férias com 1/3\nPJ = valor × 12 × (1 − imposto)",
            aviso: "Comparação aproximada. Não inclui plano de saúde, VR ou outros benefícios.",
          };
        },
      },
      {
        id: "custo-clt",
        grupo: "trabalho",
        titulo: "Custo do funcionário CLT",
        cmd: "calc custo-clt",
        desc: "Quanto custa para a empresa manter um funcionário CLT, com os encargos.",
        campos: [f.dinheiro("salario", "Salário bruto", 3000)],
        calcular(v) {
          const r = custoClt({ salario: v.salario });
          return {
            itens: [
              { rot: "Encargos e benefícios", valor: r.encargos, tipo: "dinheiro" },
              { rot: "Custo total para a empresa", valor: r.total, tipo: "dinheiro", destaque: true },
            ],
            grafico: { tipo: "barras", titulo: "Encargos sobre o salário", dados: [["decimo", "13º"], ["feriasTerco", "Férias + 1/3"], ["fgts", "FGTS"], ["inssPatronal", "INSS patronal"], ["rat", "RAT"], ["sistemaS", "Sistema S"]].map(([k, nome]) => ({ rot: nome, valor: v.salario * ENCARGOS[k] })), formato: "dinheiro" },
            explica: `Os encargos somam cerca de ${r.percentual.toFixed(1).replace(".", ",")}% do salário.`,
            formula: "13º 8,33% + férias com 1/3 11,11% + FGTS 8% + INSS patronal 20% + RAT 2% + sistema S 5,8%",
            aviso: "Aproximação. RAT e sistema S variam por setor e por empresa.",
          };
        },
      },
      {
        id: "salario-anual",
        grupo: "trabalho",
        titulo: "Salário anual",
        cmd: "calc salario-anual",
        desc: "Quanto você recebe no ano somando 13º e férias.",
        campos: [
          f.dinheiro("salario", "Salário mensal", 3000),
          f.inteiro("numSalarios", "Salários no ano", 13, "12 meses + 13º"),
          f.opcoes("ferias", "Incluir férias com 1/3?", "sim", SIM_NAO),
        ],
        calcular(v) {
          const total = salarioAnual({ salario: v.salario, numSalarios: v.numSalarios, comFerias: isSim(v.ferias) });
          return {
            itens: [{ rot: "Total no ano (bruto)", valor: total, tipo: "dinheiro", destaque: true }],
            grafico: { tipo: "barras", titulo: "Como o total se forma", dados: [{ rot: "Salários do ano", valor: v.salario * v.numSalarios }, { rot: "Férias com 1/3", valor: isSim(v.ferias) ? (v.salario * 4) / 3 : 0 }, { rot: "Total no ano", valor: total, destaque: true }], formato: "dinheiro" },
            explica: "Valor bruto, antes dos descontos de INSS e IR.",
            formula: "total = salário × número de salários (+ férias com 1/3)",
          };
        },
      },
      {
        id: "irpf-anual",
        grupo: "impostos",
        titulo: "Imposto de renda anual",
        cmd: "calc irpf",
        desc: "Estimativa do IR a pagar na declaração, com deduções e desconto simplificado.",
        campos: [
          f.dinheiro("renda", "Rendimentos tributáveis do ano", 90000, "Soma dos salários do ano"),
          f.dinheiro("inss", "INSS pago no ano", 8000),
          f.inteiro("dependentes", "Dependentes", 0),
          f.dinheiro("outras", "Educação e saúde (opcional)", 0),
          f.opcoes("simplificado", "Usar desconto simplificado?", "nao", SIM_NAO, "Desconto de 25% da renda, até R$ 16.754,34"),
        ],
        calcular(v) {
          const r = irpfAnual({
            renda: v.renda,
            inssAnual: v.inss,
            dependentes: v.dependentes,
            outras: v.outras,
            simplificado: isSim(v.simplificado),
          });
          return {
            itens: [
              { rot: "Deduções", valor: r.deducao, tipo: "dinheiro" },
              { rot: "Base de cálculo", valor: r.base, tipo: "dinheiro" },
              { rot: "Imposto estimado", valor: r.imposto, tipo: "dinheiro", destaque: true },
              { rot: "Alíquota efetiva", valor: r.aliquotaEfetiva, tipo: "percentual" },
            ],
            grafico: { tipo: "rosca", titulo: "Do total de rendimentos", dados: [{ rot: "Imposto estimado", valor: r.imposto, destaque: true }, { rot: "Fica com você", valor: v.renda - r.imposto }], formato: "dinheiro" },
            explica: "Isento até R$ 60 mil por ano em rendimentos de salário. Rendimentos de aluguel, dividendos e ganhos de capital têm regras próprias e não entram aqui.",
            formula: "base = renda − deduções\nimposto = tabela mensal × 12, com a redução da faixa até R$ 88.200",
            aviso: "Estimativa. Não inclui imposto mínimo de altas rendas nem rendimentos isentos ou tributados na fonte fora dos salários.",
          };
        },
      },
      {
        id: "ipva",
        grupo: "impostos",
        titulo: "IPVA",
        cmd: "calc ipva",
        desc: "Quanto custa o IPVA do ano, com a alíquota do seu estado.",
        campos: [
          f.dinheiro("valor", "Valor venal do veículo", 60000, "Use a tabela do seu estado"),
          f.percentual("aliquota", "Alíquota do estado", 3, "% ao ano"),
        ],
        calcular(v) {
          const valor = ipva({ valor: v.valor, aliquotaPct: v.aliquota });
          return {
            itens: [{ rot: "IPVA do ano", valor, tipo: "dinheiro", destaque: true }],
            grafico: { tipo: "colunas", titulo: "IPVA por alíquota", dados: [1, 2, 3, 4].map((a) => ({ rot: `${a}%`, valor: ipva({ valor: v.valor, aliquotaPct: a }), destaque: a === Number(v.aliquota) })), formato: "dinheiro" },
            explica: `A alíquota varia por estado e tipo de veículo. Com ${v.aliquota}%, o imposto anual é ${brl(valor)}.`,
            formula: "IPVA = valor venal × alíquota",
            aviso: "Confira a alíquota e o valor venal no site da sua Secretaria da Fazenda.",
          };
        },
      },
      {
        id: "mei-simples",
        grupo: "impostos",
        titulo: "MEI e Simples Nacional",
        cmd: "calc mei",
        desc: "Quanto você paga de imposto por mês como MEI ou no Simples Nacional.",
        campos: [
          f.dinheiro("faturamento", "Faturamento mensal", 5000),
          f.opcoes("tipo", "Tipo de empresa", "mei_servico", [
            { v: "mei_servico", rot: "MEI de serviço" },
            { v: "mei_comercio", rot: "MEI de comércio" },
            { v: "simples", rot: "Simples Nacional (faixa inicial)" },
          ]),
        ],
        calcular(v) {
          const r = meiSimples({ faturamento: v.faturamento, tipo: v.tipo });
          return {
            itens: [
              { rot: "Imposto por mês", valor: r.mensal, tipo: "dinheiro", destaque: true },
              { rot: "Imposto por ano", valor: r.anual, tipo: "dinheiro" },
            ],
            grafico: { tipo: "barras", titulo: "Imposto por mês, pelo seu faturamento", dados: [{ rot: "MEI de serviço", valor: meiSimples({ faturamento: v.faturamento, tipo: "mei_servico" }).mensal, destaque: v.tipo === "mei_servico" }, { rot: "MEI de comércio", valor: meiSimples({ faturamento: v.faturamento, tipo: "mei_comercio" }).mensal, destaque: v.tipo === "mei_comercio" }, { rot: "Simples Nacional", valor: meiSimples({ faturamento: v.faturamento, tipo: "simples" }).mensal, destaque: v.tipo === "simples" }], formato: "dinheiro" },
            explica: v.tipo === "simples" ? "No Simples, a alíquota sobe com o faturamento. Aqui usamos a faixa inicial." : "O MEI paga um valor fixo mensal (DAS), que sobe com o salário mínimo.",
            formula: "MEI: 5% do salário mínimo + R$ 5 (serviço) ou R$ 1 (comércio)\nSimples: 6% do faturamento (faixa inicial)",
            aviso: "Valores de referência. Consulte o DAS no Portal do Simples Nacional.",
          };
        },
      },
    ]);
  }

  if (typeof module === "object" && module.exports) module.exports = M;
})(typeof window !== "undefined" ? window : globalThis);
