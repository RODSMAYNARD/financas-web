// Testes do módulo de investimentos. Rodar: node tests/calc-investimentos.test.js
global.window = globalThis;
const assert = require("node:assert/strict");
require("../js/catalogo.js"); // o módulo só registra as calculadoras se o catálogo existir
const I = require("../js/calc-investimentos.js");
const CAT = globalThis.CATALOGO;

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

// --- Correções e casos de borda (valores conferidos à mão) ---

t("poupança com Selic até 8,5%: 70% da Selic e sem TR somada", () => {
  near(I.taxaPoupancaAnualPct(5, 2), 3.5, 0.0001); // 0,7 × 5 = 3,5, TR ignorada
});

t("poupança com Selic acima de 8,5%: 0,5% ao mês composto mais TR de 1%", () => {
  // 1,005^12 = 1,0616778; × 1,01 = 1,0722946 → 7,2295% ao ano
  near(I.taxaPoupancaAnualPct(15, 1), 7.2295, 0.0005);
});

t("primeiro milhão: 1.000 por mês a 10% ao ano chega em 277 meses (23 anos e 1 mês)", () => {
  // x = (1.000.000 × i + 1.000) ÷ 1.000 = 8,97413, com i = 1,1^(1/12) − 1
  // n = ln(8,97413) ÷ ln(1,1)×(1/12) = 276,2 → 277
  assert.equal(I.mesesAteAlvo({ inicial: 0, aporte: 1000, taxaAnualPct: 10, alvo: 1000000 }), 277);
});

t("primeiro milhão: sem rendimento, 1.000 por mês chega exatamente em 1.000 meses", () => {
  assert.equal(I.mesesAteAlvo({ inicial: 0, aporte: 1000, taxaAnualPct: 0, alvo: 1000000 }), 1000);
});

t("viver de renda: taxa zero não gera capital (NaN)", () => {
  assert.ok(Number.isNaN(I.capitalParaRenda({ rendaMensal: 5000, taxaAnualPct: 0 })));
});

// --- Registro no catálogo: cada calcular() com valores à mão ---

const IDS = ["juros-simples", "renda-fixa", "cdb-tesouro", "viver-de-renda", "primeiro-milhao", "reserva-emergencia", "correcao-poupanca", "conversor-moeda", "vpl"];
const porId = (id) => CAT.itens.find((x) => x.id === id);
const item = (r, rot) => r.itens.find((x) => x.rot === rot);

t("as nove calculadoras estão no grupo investimentos, com campos e calcular", () => {
  assert.deepEqual(CAT.itens.map((x) => x.id).sort(), [...IDS].sort());
  for (const c of CAT.itens) {
    assert.equal(c.grupo, "investimentos", c.id);
    assert.ok(c.campos.length > 0, `${c.id} sem campos`);
    assert.equal(typeof c.calcular, "function", c.id);
  }
});

t("juros simples pelo catálogo: 1000 a 2% ao mês por 12 meses", () => {
  const r = porId("juros-simples").calcular({ principal: 1000, taxa: 2, meses: 12 });
  assert.equal(item(r, "Montante final").valor, 1240);
  assert.equal(item(r, "Juros").valor, 240);
});

t("renda fixa pelo catálogo: LCI 10% vence CDB 12% com IR e poupança com Selic 15%", () => {
  const r = porId("renda-fixa").calcular({ valor: 10000, dias: 365, selic: 15, tr: 0, cdb: 12, lci: 10 });
  near(item(r, "LCI/LCA (isenta)").valor, 11000, 0.01); // 10% de 10.000
  near(item(r, "CDB (com IR)").valor, 10990, 0.01); // 1.200 − 17,5% de IR (210)
  near(item(r, "Poupança").valor, 10616.78, 0.01); // 1,005^12 = 1,0616778
  assert.equal(r.itens.find((x) => x.destaque).rot, "LCI/LCA (isenta)");
  assert.ok(r.aviso.includes("IOF"));
});

t("CDB e Tesouro pelo catálogo: 10.000 a 12% por 365 dias", () => {
  const r = porId("cdb-tesouro").calcular({ valor: 10000, taxa: 12, dias: 365 });
  near(item(r, "Rendimento bruto").valor, 1200, 0.01);
  near(item(r, "Total líquido").valor, 10990, 0.01);
  assert.ok(r.aviso.includes("IOF"));
});

t("viver de renda pelo catálogo: 5.000 por mês a 6% ao ano", () => {
  const r = porId("viver-de-renda").calcular({ renda: 5000, taxa: 6 });
  near(item(r, "Capital necessário").valor, 1000000, 0.01);
  const sem = porId("viver-de-renda").calcular({ renda: 5000, taxa: 0 });
  assert.equal(sem.itens.length, 0);
});

t("primeiro milhão pelo catálogo: texto de anos e meses", () => {
  const r = porId("primeiro-milhao").calcular({ inicial: 0, aporte: 1000, taxa: 10 });
  assert.equal(item(r, "Tempo até R$ 1 milhão").valor, "23 anos e 1 mês");
  const nunca = porId("primeiro-milhao").calcular({ inicial: 0, aporte: 0, taxa: 10 });
  assert.equal(nunca.itens.length, 0);
  assert.ok(nunca.explica.includes("nunca"));
});

t("reserva de emergência pelo catálogo: 3.000 por 6 meses = 18.000", () => {
  const r = porId("reserva-emergencia").calcular({ despesa: 3000, meses: 6 });
  assert.equal(item(r, "Reserva recomendada").valor, 18000);
});

t("correção pela poupança pelo catálogo: 1.000 por 12 meses a 6,17%", () => {
  const r = porId("correcao-poupanca").calcular({ valor: 1000, meses: 12, taxa: 6.17 });
  near(item(r, "Valor corrigido").valor, 1061.7, 0.01);
});

t("conversor pelo catálogo: 100 unidades a 5,5 = 550", () => {
  const r = porId("conversor-moeda").calcular({ valor: 100, cotacao: 5.5 });
  assert.equal(item(r, "Em reais").valor, 550);
});

t("VPL pelo catálogo: 700 investidos, 10% ao ano, entradas 300;300;300 → VPL 46,06", () => {
  // 300/1,1 + 300/1,21 + 300/1,331 = 746,06; − 700 = 46,06 (positivo: compensa)
  const r = porId("vpl").calcular({ investimento: 700, taxa: 10, fluxos: "300; 300; 300" });
  near(item(r, "Valor presente líquido").valor, 46.06, 0.01);
  assert.ok(r.explica.includes("positivo"));
  assert.equal(porId("vpl").calcular({ investimento: 700, taxa: 10, fluxos: "" }).itens.length, 0);
});

console.log(`\n${ok} testes passaram.`);
