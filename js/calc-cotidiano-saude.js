/* Módulo: Datas e cotidiano + Saúde + Ações. Funções puras (testáveis em Node) + registro no catálogo.
 * Métodos de ações são simplificados e não são recomendação de compra. */
(function (root) {
  "use strict";
  const CAT = root.CATALOGO;
  const DIA_MS = 86400000;

  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const parseData = (s) => {
    if (s instanceof Date) return s;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
  };

  // Páscoa (algoritmo anônimo gregoriano), em UTC.
  function pascoa(ano) {
    const a = ano % 19;
    const b = Math.floor(ano / 100);
    const c = ano % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(ano, mes - 1, dia));
  }

  const addDias = (data, n) => new Date(data.getTime() + n * DIA_MS);

  function feriadosMoveis(ano) {
    const p = pascoa(ano);
    return {
      carnaval: addDias(p, -47),
      cinzas: addDias(p, -46),
      sextaSanta: addDias(p, -2),
      pascoa: p,
      corpus: addDias(p, 60),
    };
  }

  const FIXOS = ["1-1", "21-4", "1-5", "7-9", "12-10", "2-11", "15-11", "25-12"];
  function ehFeriado(data) {
    const chave = `${data.getUTCDate()}-${data.getUTCMonth() + 1}`;
    if (FIXOS.includes(chave)) return true;
    const mov = feriadosMoveis(data.getUTCFullYear());
    return [mov.sextaSanta, mov.corpus].some((f) => f.getTime() === data.getTime());
  }

  function diasUteis(inicio, fim) {
    if (!inicio || !fim || fim < inicio) return NaN;
    let n = 0;
    for (let t = inicio.getTime(); t <= fim.getTime(); t += DIA_MS) {
      const d = new Date(t);
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6 && !ehFeriado(d)) n++;
    }
    return n;
  }

  // Diferença calendário: anos, meses e dias entre duas datas.
  function diferencaCalendario(inicio, fim) {
    let a = inicio.getUTCFullYear();
    let m = inicio.getUTCMonth();
    let d = inicio.getUTCDate();
    let A = fim.getUTCFullYear();
    let M = fim.getUTCMonth();
    let D = fim.getUTCDate();
    let dias = D - d;
    if (dias < 0) {
      M -= 1;
      dias += new Date(Date.UTC(A, M + 1, 0)).getUTCDate();
    }
    let meses = M - m;
    if (meses < 0) {
      A -= 1;
      meses += 12;
    }
    return { anos: A - a, meses, dias };
  }

  function diaSemana(data) {
    return ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"][data.getUTCDay()];
  }

  // Melhor dia de compra: dia seguinte ao fechamento. Prazo ≈ 30 dias até o próximo fechamento + dias até o vencimento.
  function melhorDiaCartao({ fechamento, vencimento }) {
    const f = Math.min(31, Math.max(1, Math.floor(fechamento)));
    const v = Math.min(31, Math.max(1, Math.floor(vencimento)));
    const melhor = Math.min(31, f + 1);
    const prazo = 30 + ((v - f + 30) % 30);
    return { melhor, prazo };
  }

  function imc({ pesoKg, alturaCm }) {
    const h = (Number(alturaCm) || 0) / 100;
    if (h <= 0) return NaN;
    return (Number(pesoKg) || 0) / (h * h);
  }
  function classeImc(v) {
    if (v < 18.5) return "abaixo do peso";
    if (v < 25) return "peso normal";
    if (v < 30) return "sobrepeso";
    return "obesidade";
  }

  function pesoIdeal({ alturaCm }) {
    const h = (Number(alturaCm) || 0) / 100;
    return { min: r2(18.5 * h * h), max: r2(24.9 * h * h) };
  }

  const FATORES = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725 };
  function calorias({ sexo, idade, pesoKg, alturaCm, atividade }) {
    const base = 10 * (Number(pesoKg) || 0) + 6.25 * (Number(alturaCm) || 0) - 5 * (Number(idade) || 0);
    const tmb = sexo === "masculino" ? base + 5 : base - 161;
    const gasto = tmb * (FATORES[atividade] || 1.2);
    return { tmb: r2(tmb), gasto: r2(gasto) };
  }

  // 1 kg de gordura ≈ 7.700 kcal. Déficit de 500 kcal/dia → 3.500 kcal/semana → ~0,4545 kg/semana.
  const KG_POR_SEMANA_DEFICIT = (500 * 7) / 7700;
  function emagrecimento({ pesoAtual, pesoAlvo, gasto }) {
    const perda = Math.max(0, (Number(pesoAtual) || 0) - (Number(pesoAlvo) || 0));
    return {
      dieta: r2((Number(gasto) || 0) - 500),
      semanas: Math.ceil(perda / KG_POR_SEMANA_DEFICIT),
    };
  }

  function ganhoMassa({ gasto }) {
    return { meta: r2((Number(gasto) || 0) + 300), ganhoMes: 0.25 };
  }

  // Ações (métodos simplificados).
  function graham({ lpa, vpa }) {
    const L = Number(lpa);
    const V = Number(vpa);
    if (!(L > 0) || !(V > 0)) return NaN;
    return r2(Math.sqrt(22.5 * L * V));
  }
  function bazin({ dividendos, taxaPct }) {
    const d = Number(dividendos) || 0;
    const t = (Number(taxaPct) || 0) / 100;
    if (!(t > 0)) return NaN;
    return r2(d / t);
  }
  function gordon({ d0, k, g }) {
    const D0 = Number(d0) || 0;
    const kk = (Number(k) || 0) / 100;
    const gg = (Number(g) || 0) / 100;
    if (kk <= gg) return NaN;
    return r2((D0 * (1 + gg)) / (kk - gg));
  }

  const M = {
    pascoa, feriadosMoveis, diasUteis, diferencaCalendario, diaSemana, melhorDiaCartao,
    imc, classeImc, pesoIdeal, calorias, emagrecimento, ganhoMassa, graham, bazin, gordon,
  };

  if (CAT) {
    const f = CAT.campos;
    const brl = CAT.brl;
    const dataBR = (d) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    const hoje = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);

    CAT.registrar([
      {
        id: "dias-uteis",
        grupo: "cotidiano",
        titulo: "Dias úteis",
        cmd: "calc dias-uteis",
        desc: "Quantos dias úteis existem entre duas datas, sem fins de semana nem feriados.",
        campos: [f.data("inicio", "Data inicial", "2026-01-05"), f.data("fim", "Data final", "2026-01-30")],
        calcular(v) {
          const a = parseData(v.inicio);
          const b = parseData(v.fim);
          const n = diasUteis(a, b);
          if (!Number.isFinite(n)) return { itens: [], explica: "Confira as datas: a final precisa ser depois da inicial." };
          return {
            itens: [{ rot: "Dias úteis", valor: n, tipo: "inteiro", destaque: true }],
            grafico: { tipo: "rosca", titulo: "Dias do período", dados: [{ rot: "Dias úteis", valor: n, destaque: true }, { rot: "Fins de semana e feriados", valor: Math.round((b - a) / DIA_MS) + 1 - n }], formato: "inteiro" },
            explica: "Conta de segunda a sexta, incluindo as duas datas, sem os feriados nacionais.",
            aviso: "Não inclui feriados estaduais e municipais nem pontos facultativos.",
          };
        },
      },
      {
        id: "diferenca-datas",
        grupo: "cotidiano",
        titulo: "Diferença entre datas",
        cmd: "calc diferenca-datas",
        desc: "Quantos dias, semanas, meses e anos existem entre duas datas.",
        campos: [f.data("inicio", "Data inicial", "2020-01-01"), f.data("fim", "Data final", iso(hoje))],
        calcular(v) {
          const a = parseData(v.inicio);
          const b = parseData(v.fim);
          if (!a || !b || b < a) return { itens: [], explica: "A data final precisa ser depois da inicial." };
          const dias = Math.round((b - a) / DIA_MS);
          const cal = diferencaCalendario(a, b);
          return {
            itens: [
              { rot: "Dias corridos", valor: dias, tipo: "inteiro", destaque: true },
              { rot: "Semanas", valor: Math.floor(dias / 7), tipo: "inteiro" },
              { rot: "Anos, meses e dias", valor: `${cal.anos} anos, ${cal.meses} meses e ${cal.dias} dias`, tipo: "texto" },
            ],
            grafico: { tipo: "trilha", titulo: "Início e fim no calendário", min: a.getTime(), max: b.getTime(), marcas: [{ pos: a.getTime(), curto: "Início", rot: dataBR(a) }, { pos: b.getTime(), curto: "Fim", rot: dataBR(b), texto: `${dias} dias`, destaque: true }] },
            explica: `Entre ${dataBR(a)} e ${dataBR(b)} passaram ${dias} dias.`,
          };
        },
      },
      {
        id: "somar-datas",
        grupo: "cotidiano",
        titulo: "Somar e subtrair dias",
        cmd: "calc somar-datas",
        desc: "Descubra que dia cai depois de somar ou subtrair uma quantidade de dias.",
        campos: [f.data("inicio", "Data inicial", "2026-01-01"), f.inteiro("dias", "Quantidade de dias", 30, "Use número negativo para subtrair")],
        calcular(v) {
          const a = parseData(v.inicio);
          if (!a) return { itens: [], explica: "Informe a data inicial." };
          const r = addDias(a, Number(v.dias) || 0);
          return {
            itens: [{ rot: "Data resultante", valor: r, tipo: "data", destaque: true }],
            grafico: { tipo: "trilha", titulo: "Caminho pelo calendário", min: Math.min(a.getTime(), r.getTime()), max: Math.max(a.getTime(), r.getTime()), marcas: [{ pos: a.getTime(), curto: "Início", rot: dataBR(a) }, { pos: r.getTime(), curto: "Resultado", rot: dataBR(r), texto: `${v.dias} dias`, destaque: true }] },
            explica: `${dataBR(a)} mais ${v.dias} dias é ${dataBR(r)}, uma ${diaSemana(r)}.`,
          };
        },
      },
      {
        id: "dia-semana",
        grupo: "cotidiano",
        titulo: "Dia da semana",
        cmd: "calc dia-semana",
        desc: "Descubra em que dia da semana cai uma data.",
        campos: [f.data("data", "Data", "2026-11-24")],
        calcular(v) {
          const d = parseData(v.data);
          if (!d) return { itens: [], explica: "Informe uma data." };
          return {
            itens: [{ rot: "Dia da semana", valor: diaSemana(d), tipo: "texto", destaque: true }],
            grafico: { tipo: "colunas", titulo: "Semana", dados: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((nome, k) => ({ rot: nome, valor: 1, destaque: k === d.getUTCDay() })), formato: "nenhum" },
            explica: `${dataBR(d)} cai numa ${diaSemana(d)}.`,
          };
        },
      },
      {
        id: "feriados-moveis",
        grupo: "cotidiano",
        titulo: "Feriados móveis",
        cmd: "calc feriados",
        desc: "Carnaval, Sexta-feira Santa, Páscoa e Corpus Christi do ano que você escolher.",
        campos: [f.inteiro("ano", "Ano", 2026)],
        calcular(v) {
          const ano = Math.floor(v.ano);
          if (!Number.isFinite(ano) || ano < 1583) return { itens: [], explica: "Informe um ano válido." };
          const m = feriadosMoveis(ano);
          return {
            itens: [
              { rot: "Carnaval (terça)", valor: m.carnaval, tipo: "data" },
              { rot: "Quarta-feira de Cinzas", valor: m.cinzas, tipo: "data" },
              { rot: "Sexta-feira Santa", valor: m.sextaSanta, tipo: "data" },
              { rot: "Páscoa", valor: m.pascoa, tipo: "data", destaque: true },
              { rot: "Corpus Christi", valor: m.corpus, tipo: "data" },
            ],
            grafico: { tipo: "trilha", titulo: "Feriados móveis no ano", min: m.carnaval.getTime() - 10 * DIA_MS, max: m.corpus.getTime() + 10 * DIA_MS, marcas: [{ pos: m.carnaval.getTime(), curto: "Carnaval", rot: "Carnaval (terça)", texto: dataBR(m.carnaval) }, { pos: m.cinzas.getTime(), curto: "Cinzas", rot: "Quarta-feira de Cinzas", texto: dataBR(m.cinzas) }, { pos: m.sextaSanta.getTime(), curto: "Sexta", rot: "Sexta-feira Santa", texto: dataBR(m.sextaSanta) }, { pos: m.pascoa.getTime(), curto: "Páscoa", rot: "Páscoa", texto: dataBR(m.pascoa), destaque: true }, { pos: m.corpus.getTime(), curto: "Corpus", rot: "Corpus Christi", texto: dataBR(m.corpus) }] },
            explica: `Em ${ano}, a Páscoa cai em ${dataBR(m.pascoa)}. As outras datas acompanham essa.`,
            formula: "Carnaval = Páscoa − 47 dias\nSexta-feira Santa = Páscoa − 2\nCorpus Christi = Páscoa + 60",
          };
        },
      },
      {
        id: "melhor-dia-cartao",
        grupo: "cotidiano",
        titulo: "Melhor dia de compra no cartão",
        cmd: "calc melhor-dia",
        desc: "Descubra o melhor dia para comprar no cartão e quantos dias você ganha para pagar.",
        campos: [f.inteiro("fechamento", "Dia de fechamento da fatura", 5), f.inteiro("vencimento", "Dia de vencimento", 15)],
        calcular(v) {
          const r = melhorDiaCartao({ fechamento: v.fechamento, vencimento: v.vencimento });
          return {
            itens: [
              { rot: "Melhor dia para comprar", valor: r.melhor, tipo: "inteiro", destaque: true },
              { rot: "Prazo até o pagamento", valor: r.prazo, tipo: "inteiro" },
            ],
            grafico: { tipo: "trilha", titulo: "Dias do mês", min: 1, max: 31, marcas: [{ pos: v.fechamento, curto: "Fecha", rot: `Fechamento da fatura (dia ${v.fechamento})` }, { pos: r.melhor, curto: "Compre", rot: `Melhor dia para comprar (dia ${r.melhor})`, destaque: true }, { pos: v.vencimento, curto: "Vence", rot: `Vencimento (dia ${v.vencimento})`, texto: `${r.prazo} dias de prazo` }] },
            explica: `Comprando a partir do dia ${r.melhor}, a compra cai na fatura seguinte e você tem cerca de ${r.prazo} dias para pagar.`,
            aviso: "Aproximado: meses com 28 ou 31 dias podem mudar o prazo em até um dia.",
          };
        },
      },
      {
        id: "imc",
        grupo: "saude",
        titulo: "IMC",
        cmd: "calc imc",
        desc: "Índice de massa corporal, com a classificação de peso.",
        campos: [f.numero("peso", "Peso", 70, "Em kg"), f.inteiro("altura", "Altura", 170, "Em cm")],
        calcular(v) {
          const i = imc({ pesoKg: v.peso, alturaCm: v.altura });
          if (!Number.isFinite(i)) return { itens: [], explica: "Informe a altura em centímetros." };
          return {
            itens: [
              { rot: "IMC", valor: i, tipo: "numero", destaque: true },
              { rot: "Classificação", valor: classeImc(i), tipo: "texto" },
            ],
            grafico: { tipo: "faixa", titulo: "Em qual faixa você está", valor: i, min: 15, max: 40, zonas: [{ ate: 18.5, rot: "Abaixo do peso (até 18,5)", cor: "#64d2ff" }, { ate: 25, rot: "Peso normal (18,5 a 24,9)", cor: "var(--verde)" }, { ate: 30, rot: "Sobrepeso (25 a 29,9)", cor: "#ff9f0a" }, { ate: 40, rot: "Obesidade (30 ou mais)", cor: "var(--erro)" }], formato: "numero" },
            explica: "O IMC não diferencia massa muscular de gordura. Use como um sinal, não como diagnóstico.",
            formula: "IMC = peso ÷ altura²",
            aviso: "Não substitui avaliação médica.",
          };
        },
      },
      {
        id: "peso-ideal",
        grupo: "saude",
        titulo: "Peso ideal",
        cmd: "calc peso-ideal",
        desc: "Faixa de peso considerada saudável para a sua altura.",
        campos: [f.inteiro("altura", "Altura", 170, "Em cm")],
        calcular(v) {
          const r = pesoIdeal({ alturaCm: v.altura });
          if (!(r.max > 0)) return { itens: [], explica: "Informe a altura em centímetros." };
          return {
            itens: [{ rot: "Faixa ideal (IMC 18,5 a 24,9)", valor: `${r.min.toFixed(1).replace(".", ",")} kg a ${r.max.toFixed(1).replace(".", ",")} kg`, tipo: "texto", destaque: true }],
            grafico: { tipo: "barras", titulo: "Faixa de peso em kg", dados: [{ rot: "Peso mínimo (IMC 18,5)", valor: r.min }, { rot: "Peso máximo (IMC 24,9)", valor: r.max, destaque: true }], formato: "numero" },
            formula: "peso = IMC × altura²",
            aviso: "Faixa de referência. Não substitui avaliação médica.",
          };
        },
      },
      {
        id: "calorias",
        grupo: "saude",
        titulo: "Calorias diárias",
        cmd: "calc calorias",
        desc: "Quantas calorias você gasta por dia, conforme sexo, idade, peso e atividade.",
        campos: [
          f.opcoes("sexo", "Sexo", "masculino", [{ v: "masculino", rot: "Masculino" }, { v: "feminino", rot: "Feminino" }]),
          f.inteiro("idade", "Idade", 30),
          f.numero("peso", "Peso", 70, "Em kg"),
          f.inteiro("altura", "Altura", 170, "Em cm"),
          f.opcoes("atividade", "Nível de atividade", "moderado", [
            { v: "sedentario", rot: "Sedentário" },
            { v: "leve", rot: "Leve (1 a 3 dias por semana)" },
            { v: "moderado", rot: "Moderado (3 a 5 dias)" },
            { v: "intenso", rot: "Intenso (6 a 7 dias)" },
          ]),
        ],
        calcular(v) {
          const r = calorias({ sexo: v.sexo, idade: v.idade, pesoKg: v.peso, alturaCm: v.altura, atividade: v.atividade });
          return {
            itens: [
              { rot: "Gasto diário", valor: r.gasto, tipo: "inteiro", destaque: true },
              { rot: "Metabolismo basal", valor: r.tmb, tipo: "inteiro" },
            ],
            grafico: { tipo: "barras", titulo: "Calorias por dia (kcal)", dados: [{ rot: "Metabolismo basal (repouso)", valor: r.tmb }, { rot: "Gasto com a rotina", valor: r.gasto, destaque: true }, { rot: "Para emagrecer (−500)", valor: r.gasto - 500 }, { rot: "Para ganhar massa (+300)", valor: r.gasto + 300 }], formato: "inteiro" },
            explica: "Gasto diário = metabolismo basal × fator de atividade. É o que você queima com a rotina informada.",
            formula: "TMB = 10·peso + 6,25·altura − 5·idade + (5 homem | −161 mulher)\ngasto = TMB × fator",
            aviso: "Estimativa pela fórmula de Mifflin-St Jeor.",
          };
        },
      },
      {
        id: "emagrecimento",
        grupo: "saude",
        titulo: "Emagrecimento",
        cmd: "calc emagrecimento",
        desc: "Quanto comer por dia e em quanto tempo chegar ao peso desejado.",
        campos: [
          f.numero("pesoAtual", "Peso atual", 85, "Em kg"),
          f.numero("pesoAlvo", "Peso desejado", 75, "Em kg"),
          f.inteiro("gasto", "Gasto diário", 2200, "Em kcal, use o resultado de Calorias diárias"),
        ],
        calcular(v) {
          const r = emagrecimento({ pesoAtual: v.pesoAtual, pesoAlvo: v.pesoAlvo, gasto: v.gasto });
          return {
            itens: [
              { rot: "Calorias por dia", valor: r.dieta, tipo: "inteiro", destaque: true },
              { rot: "Prazo estimado (semanas)", valor: r.semanas, tipo: "inteiro" },
            ],
            grafico: (() => {
              const alvo = Number(v.pesoAlvo);
              const semanas = Math.min(104, r.semanas);
              const rotulos = [];
              const peso = [];
              const meta = [];
              for (let s = 0; s <= semanas; s++) {
                rotulos.push(String(s));
                peso.push(Math.max(alvo, v.pesoAtual - s * KG_POR_SEMANA_DEFICIT));
                meta.push(alvo);
              }
              return { tipo: "linha", titulo: "Peso semana a semana (kg)", rotulos, series: [{ rot: "Peso estimado", valores: peso }, { rot: "Peso desejado", valores: meta, cor: "var(--texto-3)" }], formato: "numero" };
            })(),
            explica: "Com 500 kcal a menos por dia, a perda fica perto de meio quilo por semana. Ritmo maior exige acompanhamento.",
            formula: "dieta = gasto − 500 kcal\nsemanas = perda ÷ 0,45 kg",
            aviso: "Estimativa. Procure orientação de nutricionista ou médico.",
          };
        },
      },
      {
        id: "ganho-massa",
        grupo: "saude",
        titulo: "Ganho de massa magra",
        cmd: "calc massa-magra",
        desc: "Quantas calorias comer por dia para ganhar massa magra e quanto esperar por mês.",
        campos: [
          f.numero("pesoAtual", "Peso atual", 70, "Em kg"),
          f.inteiro("gasto", "Gasto diário", 2200, "Em kcal, use o resultado de Calorias diárias"),
        ],
        calcular(v) {
          const r = ganhoMassa({ gasto: v.gasto });
          return {
            itens: [
              { rot: "Calorias por dia", valor: r.meta, tipo: "inteiro", destaque: true },
              { rot: "Ganho estimado por mês", valor: r.ganhoMes, tipo: "numero" },
            ],
            grafico: { tipo: "barras", titulo: "Calorias por dia (kcal)", dados: [{ rot: "Gasto atual", valor: v.gasto }, { rot: "Meta para ganhar massa", valor: r.meta, destaque: true }], formato: "inteiro" },
            explica: "Um superávit pequeno de 300 kcal por dia, com treino de força e proteína suficiente. O ganho real depende do treino.",
            formula: "meta = gasto + 300 kcal",
            aviso: "Estimativa para iniciantes em treino de força. Procure orientação profissional.",
          };
        },
      },
      {
        id: "graham",
        grupo: "acoes",
        titulo: "Preço justo de Graham",
        cmd: "calc graham",
        desc: "Estimativa de preço justo de uma ação a partir do lucro e do patrimônio por ação.",
        campos: [
          f.numero("lpa", "Lucro por ação (LPA)", 5, "Em reais"),
          f.numero("vpa", "Valor patrimonial por ação (VPA)", 30, "Em reais"),
        ],
        calcular(v) {
          const p = graham({ lpa: v.lpa, vpa: v.vpa });
          if (!Number.isFinite(p)) return { itens: [], explica: "O método só se aplica quando o lucro e o patrimônio por ação são positivos." };
          return {
            itens: [{ rot: "Preço justo", valor: p, tipo: "dinheiro", destaque: true }],
            grafico: { tipo: "barras", titulo: "Preço justo se o lucro por ação mudar", dados: [0.5, 1, 1.5, 2].map((fator) => ({ rot: `Lucro × ${String(fator).replace(".", ",")}`, valor: graham({ lpa: v.lpa * fator, vpa: v.vpa }), destaque: fator === 1 })), formato: "dinheiro" },
            explica: "Método simplificado de Benjamin Graham. Não é recomendação de compra.",
            formula: "preço justo = √(22,5 × LPA × VPA)",
            aviso: "Não é recomendação de investimento. Pesquise a empresa antes de decidir.",
          };
        },
      },
      {
        id: "bazin",
        grupo: "acoes",
        titulo: "Preço-teto de Bazin",
        cmd: "calc bazin",
        desc: "Preço máximo para comprar uma ação que paga dividendos, pela taxa mínima que você quer.",
        campos: [
          f.numero("dividendos", "Dividendos por ação nos últimos 12 meses", 4, "Em reais"),
          f.percentual("taxa", "Taxa mínima desejada", 6, "% ao ano"),
        ],
        calcular(v) {
          const p = bazin({ dividendos: v.dividendos, taxaPct: v.taxa });
          if (!Number.isFinite(p)) return { itens: [], explica: "Informe uma taxa maior que zero." };
          return {
            itens: [{ rot: "Preço-teto", valor: p, tipo: "dinheiro", destaque: true }],
            grafico: { tipo: "barras", titulo: "Preço-teto para taxas diferentes", dados: [4, 6, 8, 10, 12].map((t) => ({ rot: `Taxa de ${t}% ao ano`, valor: bazin({ dividendos: v.dividendos, taxaPct: t }), destaque: t === v.taxa })), formato: "dinheiro" },
            explica: "Acima desse preço, o dividendo rende menos que a taxa que você quer. Não é recomendação de compra.",
            formula: "preço-teto = dividendos ÷ taxa mínima",
            aviso: "Depende de dividendos se repetirem. Não é recomendação de investimento.",
          };
        },
      },
      {
        id: "gordon",
        grupo: "acoes",
        titulo: "Preço justo de Gordon",
        cmd: "calc gordon",
        desc: "Preço justo pelo modelo de dividendos com crescimento constante.",
        campos: [
          f.numero("d0", "Dividendo do último ano (D0)", 4, "Em reais por ação"),
          f.percentual("k", "Retorno exigido (k)", 12, "% ao ano"),
          f.percentual("g", "Crescimento dos dividendos (g)", 4, "% ao ano"),
        ],
        calcular(v) {
          const p = gordon({ d0: v.d0, k: v.k, g: v.g });
          if (!Number.isFinite(p)) return { itens: [], explica: "O modelo só se aplica quando o retorno exigido é maior que o crescimento." };
          return {
            itens: [{ rot: "Preço justo", valor: p, tipo: "dinheiro", destaque: true }],
            grafico: { tipo: "barras", titulo: "Preço justo para crescimentos diferentes", dados: [2, 4, 6, 8].map((g) => ({ rot: `Crescimento de ${g}% ao ano`, valor: gordon({ d0: v.d0, k: v.k, g }), destaque: g === v.g })), formato: "dinheiro" },
            explica: "Modelo de Gordon: supõe que os dividendos crescem sempre na mesma taxa. Não é recomendação de compra.",
            formula: "preço = D0 × (1 + g) ÷ (k − g)",
            aviso: "Não é recomendação de investimento.",
          };
        },
      },
    ]);
  }

  if (typeof module === "object" && module.exports) module.exports = M;
})(typeof window !== "undefined" ? window : globalThis);
