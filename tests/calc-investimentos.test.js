// Testes do módulo de investimentos. Rodar: node tests/calc-investimentos.test.js
global.window = globalThis;
const assert = require("node:assert/strict");
const I = require("../js/calc-investimentos.js");

let ok = 0;
function t(nome, fn) {
  fn();
  ok++;
  console.log("ok -", nome);
}
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `esperado ${b}, veio ${a}`);

t("juros simples: 1000 a 2% ao mês por 12 meses = 1240", () => {
  const r = I.jurosSimples({ principal: 1000, taxaMensalPct: 2, meses: 12 });
  assert.equal(r.montante, 1240);
  assert.equal(r.juros, 240);
});

t("IR regressivo nas faixas de prazo", () => {
  assert.equal(I.irRegressivo(180), 0.225);
  assert.equal(I.irRegressivo(181), 0.2);
  assert.equal(I.irRegressivo(360), 0.2);
  assert.equal(I.irRegressivo(361), 0.175);
  assert.equal(I.irRegressivo(721), 0.15);
});

t("CDB: 10000 a 12% ao ano por 365 dias", () => {
  const r = I.cdbTesouro({ valor: 10000, taxaAnualPct: 12, dias: 365 });
  near(r.bruto, 1200, 0.01);
  near(r.ir, 1200 * 0.175, 0.01); // 365 dias cai na faixa de 17,5% (361 a 720 dias)
  near(r.liquido, 10000 + 1200 - 210, 0.01);
});

t("poupança com Selic acima de 8,5%: 0,5% ao mês + TR", () => {
  near(I.taxaPoupancaAnualPct(15, 0), (Math.pow(1.005, 12) - 1) * 100, 0.0001);
});

t("poupança com Selic abaixo de 8,5%: 70% da Selic", () => {
  near(I.taxaPoupancaAnualPct(5, 0), 3.5, 0.0001);
});

t("comparador: LCI sem IR e CDB com IR no mesmo prazo", () => {
  const r = I.comparadorRendaFixa({ valor: 10000, dias: 365, selicPct: 15, trPct: 0, cdbTaxaPct: 12, lciTaxaPct: 12 });
  const cdb = r.opcoes.find((o) => o.nome.startsWith("CDB"));
  const lci = r.opcoes.find((o) => o.nome.startsWith("LCI"));
  near(lci.liquido, 11200, 0.01);
  near(cdb.liquido, 10990, 0.01); // 1200 de rendimento menos 17,5% de IR (210)
  assert.equal(r.melhor, "LCI/LCA (isenta)");
});

t("viver de renda: R$ 5.000 por mês a 6% ao ano = R$ 1.000.000", () => {
  near(I.capitalParaRenda({ rendaMensal: 5000, taxaAnualPct: 6 }), 1000000, 0.01);
});

t("primeiro milhão: prazo fechado bate com o montante", () => {
  const n = I.mesesAteAlvo({ inicial: 0, aporte: 1000, taxaAnualPct: 10, alvo: 1000000 });
  const i = Math.pow(1.1, 1 / 12) - 1;
  const montante = 1000 * ((Math.pow(1 + i, n) - 1) / i);
  assert.ok(montante >= 1000000, "no prazo calculado já deve atingir o alvo");
  const antes = 1000 * ((Math.pow(1 + i, n - 1) - 1) / i);
  assert.ok(antes < 1000000, "um mês antes ainda não atinge");
});

t("primeiro milhão: sem aporte e sem valor inicial não chega", () => {
  assert.ok(Number.isNaN(I.mesesAteAlvo({ inicial: 0, aporte: 0, taxaAnualPct: 10, alvo: 1000000 })));
});

t("reserva de emergência: 3000 por 6 meses = 18000", () => {
  assert.equal(I.reservaEmergencia({ despesaMensal: 3000, meses: 6 }), 18000);
});

t("correção pela poupança: 1000 por 12 meses a 6,17% ao ano", () => {
  near(I.correcaoPoupanca({ valor: 1000, meses: 12, taxaAnualPct: 6.17 }), 1061.7, 0.01);
});

t("conversor: 100 unidades a cotação 5,5 = 550", () => {
  assert.equal(I.conversorMoeda({ valor: 100, cotacao: 5.5 }), 550);
});

t("VPL com taxa zero soma as entradas menos o investimento", () => {
  assert.equal(I.vpl({ taxaAnualPct: 0, investimento: 1000, fluxos: [600, 600] }), 200);
});

t("VPL com 10% ao ano: 600 e 600 contra 1000", () => {
  near(I.vpl({ taxaAnualPct: 10, investimento: 1000, fluxos: [600, 600] }), 41.32, 0.01);
});

console.log(`\n${ok} testes passaram.`);
