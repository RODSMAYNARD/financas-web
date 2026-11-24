// Testes do motor de cálculo. Rodar: node tests/calc.test.js
const assert = require("node:assert/strict");
const Calc = require("../js/calc.js");

let ok = 0;
function t(nome, fn) {
  fn();
  ok++;
  console.log("ok -", nome);
}

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `esperado ${b}, veio ${a}`);

t("taxa mensal equivalente a 12% ao ano", () => {
  near(Calc.taxaMensalDeAnual(12) * 100, 0.9489, 0.0001);
});

t("juros compostos: 1000 a 12% por 12 meses sem aporte", () => {
  const r = Calc.jurosCompostos({ inicial: 1000, aporte: 0, taxaAnual: 12, meses: 12 });
  near(r.montante, 1120.0, 0.05);
  near(r.juros, 120.0, 0.05);
});

t("juros compostos: aporte de 500/mês a 10% ao ano por 10 anos", () => {
  const r = Calc.jurosCompostos({ inicial: 0, aporte: 500, taxaAnual: 10, meses: 120 });
  // Valor de série postecipada: 500 * ((1+i)^120 - 1)/i com i = 1.1^(1/12)-1
  const i = Math.pow(1.1, 1 / 12) - 1;
  const esperado = 500 * ((Math.pow(1 + i, 120) - 1) / i);
  near(r.montante, esperado, 0.05);
  near(r.totalInvestido, 60000, 0.01);
  assert.equal(r.evolucao.length, 120);
  near(r.evolucao[119].saldo, r.montante, 0.05);
});

t("juros compostos com taxa zero soma os aportes", () => {
  const r = Calc.jurosCompostos({ inicial: 100, aporte: 50, taxaAnual: 0, meses: 10 });
  assert.equal(r.montante, 600);
  assert.equal(r.juros, 0);
});

t("correção: 1000 com variação acumulada de 5%", () => {
  const r = Calc.corrigirValor(1000, 5);
  assert.equal(r.valorCorrigido, 1050);
  assert.equal(r.diferenca, 50);
});

t("INSS progressivo: salário de 3000", () => {
  // 1621*7,5% + (2902,84-1621)*9% + (3000-2902,84)*12%
  const esperado = 1621 * 0.075 + 1281.84 * 0.09 + 97.16 * 0.12;
  near(Calc.calcularINSS(3000), esperado, 0.01);
});

t("INSS respeita o teto", () => {
  assert.equal(Calc.calcularINSS(20000), Calc.calcularINSS(8475.55));
  near(Calc.calcularINSS(20000), 988.09, 0.02);
});

t("salário até R$ 5.000 não tem IRRF", () => {
  const r = Calc.salarioLiquido({ bruto: 3000, dependentes: 0 });
  assert.equal(r.irrf, 0);
  near(r.liquido, 3000 - r.inss, 0.01);
});

t("salário acima de 7.350 usa a tabela progressiva cheia", () => {
  const r = Calc.salarioLiquido({ bruto: 10000, dependentes: 0 });
  assert.equal(r.reducaoIRRF, 0);
  near(r.irrf, r.irrfTabela, 0.01);
  assert.ok(r.liquido < 10000);
});

t("redução gradual de IRRF some em 7.350", () => {
  const r = Calc.salarioLiquido({ bruto: 7350, dependentes: 0 });
  near(r.reducaoIRRF, 0, 0.01);
});

t("dependentes reduzem a base do IRRF", () => {
  const sem = Calc.salarioLiquido({ bruto: 9000, dependentes: 0 });
  const com = Calc.salarioLiquido({ bruto: 9000, dependentes: 2 });
  assert.ok(com.irrf < sem.irrf);
  near(com.deducaoDependentes, 2 * Calc.CONFIG.deducaoDependente, 0.01);
});

console.log(`\n${ok} testes passaram.`);
