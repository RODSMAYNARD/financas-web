// Testes do módulo de crédito e negócios. Rodar: node tests/calc-credito-negocios.test.js
global.window = globalThis;
const assert = require("node:assert/strict");
const M = require("../js/calc-credito-negocios.js");

let ok = 0;
function t(nome, fn) {
  fn();
  ok++;
  console.log("ok -", nome);
}
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `esperado ${b}, veio ${a}`);

t("Price: 100 mil a 1% ao mês em 120 meses bate com a fórmula fechada", () => {
  const i = 0.01;
  const esperado = (100000 * i) / (1 - Math.pow(1 + i, -120));
  const r = M.financiamentoPrice({ valor: 100000, taxaMensalPct: 1, meses: 120 });
  near(r.parcela, esperado, 0.01);
  near(r.total, esperado * 120, 0.05);
});

t("SAC: primeira parcela = amortização + juros do primeiro mês", () => {
  const r = M.financiamentoSAC({ valor: 12000, taxaMensalPct: 2, meses: 12 });
  near(r.primeira, 1000 + 12000 * 0.02, 0.01); // 1240
  near(r.ultima, 1000 + 1000 * 0.02, 0.01); // 1020
  near(r.total, 12000 + 0.02 * 12000 * 13 / 2, 0.01); // 12000 + 1560
});

t("SAC costuma pagar menos juros que Price com a mesma taxa e prazo", () => {
  const p = M.financiamentoPrice({ valor: 50000, taxaMensalPct: 1, meses: 60 });
  const s = M.financiamentoSAC({ valor: 50000, taxaMensalPct: 1, meses: 60 });
  assert.ok(s.total < p.total);
});

t("taxa do parcelamento: 1000 à vista = 2 parcelas de 550, a primeira daqui a 1 mês", () => {
  // 550/(1+i) + 550/(1+i)² = 1000. Com x = 1/(1+i): 550x + 550x² = 1000.
  const x = (-1 + Math.sqrt(1 + (4 * 1000) / 550)) / 2;
  const i = M.taxaParcelamento({ vista: 1000, parcela: 550, n: 2 });
  near(i, 1 / x - 1, 1e-9);
});

t("taxa do parcelamento sem juros reais: 2 parcelas de 500 para 1000 = 0%", () => {
  const i = M.taxaParcelamento({ vista: 1000, parcela: 500, n: 2 });
  near(i, 0, 1e-9);
});

t("taxa do parcelamento: total menor que à vista não tem taxa positiva", () => {
  assert.ok(Number.isNaN(M.taxaParcelamento({ vista: 1000, parcela: 400, n: 2 })));
});

t("rotativo: 1000 a 14% ao mês por 6 meses", () => {
  const r = M.rotativo({ divida: 1000, taxaMensalPct: 14, meses: 6 });
  near(r.saldo, 1000 * Math.pow(1.14, 6), 0.01);
  near(r.juros, r.saldo - 1000, 0.01);
});

t("alugar ou financiar: sem entrada e sem reajuste, compara totais", () => {
  const r = M.alugarOuFinanciar({
    valorImovel: 100000,
    entrada: 0,
    taxaMensalPct: 1,
    anos: 1,
    aluguel: 1000,
    reajustePct: 0,
    rendimentoPct: 0,
  });
  const price = M.financiamentoPrice({ valor: 100000, taxaMensalPct: 1, meses: 12 });
  near(r.custoFinanciar, price.total, 0.01);
  near(r.custoAluguel, 12000, 0.01);
  near(r.diferenca, price.total - 12000, 0.01);
});

t("alugar ou financiar: reajuste de aluguel soma ano a ano", () => {
  const r = M.alugarOuFinanciar({
    valorImovel: 0,
    entrada: 0,
    taxaMensalPct: 0,
    anos: 2,
    aluguel: 1000,
    reajustePct: 10,
    rendimentoPct: 0,
  });
  near(r.custoAluguel, 12000 + 12000 * 1.1, 0.01);
});

t("preço de venda: custo 50, impostos 6%, comissão 3% e lucro 20%", () => {
  const r = M.precoVenda({ custo: 50, impostosPct: 6, comissaoPct: 3, lucroPct: 20 });
  near(r.preco, 50 / 0.71, 0.01);
  near(r.lucro, (50 / 0.71) * 0.2, 0.01);
});

t("preço de venda: soma de 100% ou mais não tem solução", () => {
  assert.ok(Number.isNaN(M.precoVenda({ custo: 50, impostosPct: 60, comissaoPct: 20, lucroPct: 20 })));
});

t("margem e markup: custo 50 e preço 100", () => {
  const r = M.margem({ custo: 50, preco: 100 });
  near(r.margemVenda, 50, 1e-9);
  near(r.markup, 100, 1e-9);
});

t("ponto de equilíbrio: 5000 fixos, venda 100, variável 40 = 84 unidades", () => {
  const r = M.pontoEquilibrio({ fixos: 5000, preco: 100, variavel: 40 });
  assert.equal(r.quantidade, 84); // 5000 / 60 = 83,33 → arredonda para cima
  near(r.receita, 8400, 0.01);
});

t("ponto de equilíbrio: preço não cobre custo variável", () => {
  assert.ok(Number.isNaN(M.pontoEquilibrio({ fixos: 100, preco: 30, variavel: 40 }).quantidade));
});

t("vendas no cartão: 200 com taxa de 2,5%", () => {
  const r = M.vendasCartao({ valor: 200, taxaPct: 2.5 });
  near(r.taxa, 5, 0.01);
  near(r.liquido, 195, 0.01);
});

t("porcentagem: 15% de 200", () => {
  const r = M.porcentagem({ base: 200, pct: 15 });
  near(r.parte, 30, 0.01);
  near(r.mais, 230, 0.01);
  near(r.menos, 170, 0.01);
});

t("combustível: 300 km, 12 km/l, litro a R$ 6", () => {
  const r = M.combustivel({ km: 300, consumo: 12, preco: 6 });
  near(r.litros, 25, 0.01);
  near(r.custo, 150, 0.01);
  near(r.porKm, 0.5, 0.01);
});

console.log(`\n${ok} testes passaram.`);
