// Testes do módulo de trabalho e impostos. Rodar: node tests/calc-trabalho-impostos.test.js
global.window = globalThis;
const assert = require("node:assert/strict");
const C = require("../js/calc.js");
const M = require("../js/calc-trabalho-impostos.js");

let ok = 0;
function t(nome, fn) {
  fn();
  ok++;
  console.log("ok -", nome);
}
const near = (a, b, tol = 0.02) => assert.ok(Math.abs(a - b) <= tol, `esperado ${b}, veio ${a}`);

t("13º: 3000 com 12 meses", () => {
  const r = M.decimoTerceiro({ salario: 3000, meses: 12 });
  assert.equal(r.bruto, 3000);
  assert.equal(r.primeira, 1500);
  near(r.segunda, C.salarioLiquido({ bruto: 3000, dependentes: 0 }).liquido - 1500, 0.01);
});

t("13º: 6 meses trabalhados = metade do bruto", () => {
  assert.equal(M.decimoTerceiro({ salario: 3000, meses: 6 }).bruto, 1500);
});

t("férias: 3000 por 30 dias com 1/3 = 4000 bruto", () => {
  const r = M.ferias({ salario: 3000, dias: 30, abono: false });
  assert.equal(r.bruto, 4000);
  near(r.liquido, C.salarioLiquido({ bruto: 4000, dependentes: 0 }).liquido, 0.01);
});

t("férias com abono: 10 dias sem desconto", () => {
  const r = M.ferias({ salario: 3000, dias: 20, abono: true });
  near(r.abono, (3000 * 10 / 30) * 4 / 3, 0.01);
});

t("rescisão sem justa causa: aviso de 36 dias para 2 anos e multa de 40% do FGTS", () => {
  const r = M.rescisao({
    salario: 3000, diasSaldo: 15, mesesAno: 6, anos: 2, mesesTotais: 24, saldoFgts: 0,
    feriasVencidas: false, motivo: "sem_justa",
  });
  near(r.aviso, 3000 / 30 * 36, 0.01); // 3600
  near(r.saldoSalario, 1500, 0.01);
  near(r.decimo, 1500, 0.01); // 3000 ÷ 12 × 6
  near(r.feriasProp, 2000, 0.01); // 3000 ÷ 12 × 6 × 4/3
  near(r.fgts, 3000 * 0.08 * 24, 0.01); // 5760
  near(r.multa, 2304, 0.01);
  near(r.saque, 5760, 0.01);
});

t("rescisão por justa causa: sem aviso, sem multa, sem 13º proporcional", () => {
  const r = M.rescisao({
    salario: 3000, diasSaldo: 10, mesesAno: 6, anos: 2, mesesTotais: 24, saldoFgts: 0,
    feriasVencidas: false, motivo: "justa",
  });
  assert.equal(r.aviso, 0);
  assert.equal(r.multa, 0);
  assert.equal(r.decimo, 0);
  assert.equal(r.saque, 0);
});

t("rescisão por acordo: aviso 50%, multa 20% e saque 80%", () => {
  const r = M.rescisao({
    salario: 3000, diasSaldo: 30, mesesAno: 0, anos: 2, mesesTotais: 12, saldoFgts: 10000,
    feriasVencidas: false, motivo: "acordo",
  });
  near(r.aviso, 3000 / 30 * 36 * 0.5, 0.01);
  near(r.multa, 2000, 0.01);
  near(r.saque, 8000, 0.01);
});

t("FGTS: 3000 por 24 meses sem saldo inicial", () => {
  const r = M.fgts({ salario: 3000, meses: 24, saldoInicial: 0 });
  near(r.saldo, 5760, 0.01);
  near(r.multa, 2304, 0.01);
});

t("seguro-desemprego: média de 3000 cai na faixa intermediária (2.121,36)", () => {
  near(M.valorSeguroDesemprego(3000), 1656.96 + (3000 - 2071.2) * 0.5, 0.01);
});

t("seguro-desemprego: média baixa usa 80% e respeita o piso", () => {
  assert.equal(M.valorSeguroDesemprego(1000), 1621); // 80% de 1000 = 800, sobe para o piso
});

t("seguro-desemprego: média alta é limitada pelo teto", () => {
  assert.equal(M.valorSeguroDesemprego(9000), 2424.1);
});

t("hora extra: 3000 em 220 horas com 50%", () => {
  const r = M.horaExtra({ salario: 3000, horas: 220, adicionalPct: 50 });
  near(r.valorHora, 3000 / 220, 0.01);
  near(r.horaExtra, (3000 / 220) * 1.5, 0.01);
});

t("insalubridade: grau médio 20% do salário mínimo", () => {
  assert.equal(M.insalubridade({ salarioMinimo: 1621, grau: 20 }), 324.2);
});

t("periculosidade: 30% de 3000 = 900", () => {
  assert.equal(M.periculosidade({ salario: 3000 }), 900);
});

t("CLT x PJ: PJ de 7000 a 6% contra CLT de 6000", () => {
  const r = M.cltVsPj({ salarioCLT: 6000, valorPJ: 7000, simplesPct: 6 });
  const cltEsperado = C.salarioLiquido({ bruto: 6000, dependentes: 0 }).liquido * 12 + 6000 + (6000 * 4) / 3;
  near(r.cltAnual, cltEsperado, 0.01);
  near(r.pjAnual, 7000 * 12 * 0.94, 0.01);
});

t("custo CLT: encargos somam 55,24% (8,33 + 11,11 + 8 + 20 + 2 + 5,8)", () => {
  const r = M.custoClt({ salario: 3000 });
  near(r.percentual, 55.24, 0.01);
  near(r.total, 3000 * (1 + 1 / 12 + 1 / 9 + 0.358), 0.05); // soma exata dos encargos
});

t("salário anual: 3000 com 13 salários e férias = 3000×13 + 4000", () => {
  assert.equal(M.salarioAnual({ salario: 3000, numSalarios: 13, comFerias: true }), 43000);
});

t("IR anual: renda isenta até 60 mil", () => {
  assert.equal(M.irpfAnual({ renda: 60000, inssAnual: 0, dependentes: 0, outras: 0, simplificado: false }).imposto, 0);
});

t("IR anual: renda de 120 mil paga imposto positivo e menor que a tabela cheia", () => {
  const r = M.irpfAnual({ renda: 120000, inssAnual: 8000, dependentes: 0, outras: 0, simplificado: false });
  assert.ok(r.imposto > 0);
  assert.ok(r.imposto < 120000 * 0.275);
});

t("IR anual: desconto simplificado usa 25% até o teto", () => {
  const r = M.irpfAnual({ renda: 200000, inssAnual: 0, dependentes: 0, outras: 0, simplificado: true });
  near(r.deducao, 16754.34, 0.01);
});

t("IPVA: 60 mil a 3%", () => {
  assert.equal(M.ipva({ valor: 60000, aliquotaPct: 3 }), 1800);
});

t("MEI de serviço: 5% do salário mínimo + R$ 5", () => {
  near(M.meiSimples({ faturamento: 5000, tipo: "mei_servico" }).mensal, 1621 * 0.05 + 5, 0.01);
});

t("MEI de comércio: 5% do salário mínimo + R$ 1", () => {
  near(M.meiSimples({ faturamento: 5000, tipo: "mei_comercio" }).mensal, 1621 * 0.05 + 1, 0.01);
});

t("Simples: 6% do faturamento", () => {
  assert.equal(M.meiSimples({ faturamento: 5000, tipo: "simples" }).mensal, 300);
});

console.log(`\n${ok} testes passaram.`);
