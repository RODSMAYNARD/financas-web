/*
 * Catálogo de calculadoras.
 * Cada módulo (js/calc-*.js) registra as suas calculadoras com CATALOGO.registrar([...]).
 *
 * Formato de uma calculadora:
 * {
 *   id: "rescisao",                 // também vira o hash da URL (#rescisao)
 *   grupo: "trabalho",              // um dos ids de GRUPOS abaixo
 *   titulo: "Rescisão trabalhista",
 *   cmd: "calc rescisao",           // linha de comando mostrada no topo
 *   desc: "Quanto você recebe ao sair do emprego.",
 *   campos: [ CATALOGO.campos.dinheiro("salario", "Salário", 3000, "ajuda opcional"), ... ],
 *   calcular(v) {                   // v: valores já convertidos (números ou texto)
 *     return {
 *       itens: [ { rot: "Líquido", valor: 1234.5, tipo: "dinheiro", destaque: true } ],
 *       explica: "Texto simples explicando o resultado.",
 *       formula: "conta em texto",  // opcional
 *       aviso: "estimativa..."      // opcional
 *     };
 *   }
 * }
 *
 * Tipos de campo: dinheiro, percentual, numero, inteiro, data (YYYY-MM-DD), opcoes, lista.
 * Tipos de resultado: dinheiro, percentual, numero, inteiro, data (Date ou YYYY-MM-DD), texto.
 */
(function (root) {
  "use strict";

  const GRUPOS = [
    { id: "investimentos", titulo: "Investimentos", curto: "investimentos" },
    { id: "credito", titulo: "Crédito e dívidas", curto: "crédito" },
    { id: "negocios", titulo: "Negócios", curto: "negócios" },
    { id: "trabalho", titulo: "Trabalho", curto: "trabalho" },
    { id: "impostos", titulo: "Impostos", curto: "impostos" },
    { id: "cotidiano", titulo: "Datas e cotidiano", curto: "datas" },
    { id: "saude", titulo: "Saúde", curto: "saúde" },
    { id: "acoes", titulo: "Ações", curto: "ações" },
  ];

  const ITENS = [];

  // Aceita "1.234,56", "1234,56" e "1234.56".
  function parseNum(v) {
    if (v === null || v === undefined) return NaN;
    let s = String(v).trim();
    if (s === "") return NaN;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    return Number(s);
  }

  // "YYYY-MM-DD" -> Date em UTC (sem problema de fuso).
  function parseData(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return null;
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  const campos = {
    dinheiro: (id, rot, valor, ajuda) => ({ id, rot, tipo: "dinheiro", valor, ajuda }),
    percentual: (id, rot, valor, ajuda) => ({ id, rot, tipo: "percentual", valor, ajuda }),
    numero: (id, rot, valor, ajuda) => ({ id, rot, tipo: "numero", valor, ajuda }),
    inteiro: (id, rot, valor, ajuda) => ({ id, rot, tipo: "inteiro", valor, ajuda }),
    data: (id, rot, valor, ajuda) => ({ id, rot, tipo: "data", valor, ajuda }),
    opcoes: (id, rot, valor, opcoes, ajuda) => ({ id, rot, tipo: "opcoes", valor, opcoes, ajuda }),
    lista: (id, rot, valor, ajuda) => ({ id, rot, tipo: "lista", valor, ajuda }),
  };

  const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const brl = (n) => (Number.isFinite(n) ? fmtBRL.format(n) : "—");

  root.CATALOGO = {
    grupos: GRUPOS,
    itens: ITENS,
    campos,
    parseNum,
    parseData,
    brl,
    registrar(lista) {
      lista.forEach((item) => ITENS.push(item));
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
