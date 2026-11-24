// Testes do módulo de datas, saúde e ações. Rodar: node tests/calc-cotidiano-saude.test.js
global.window = globalThis;
const assert = require("node:assert/strict");
const M = require("../js/calc-cotidiano-saude.js");

let ok = 0;
function t(nome, fn) {
  fn();
  ok++;
  console.log("ok -", nome);
}
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `esperado ${b}, veio ${a}`);
const iso = (d) => d.toISOString().slice(0, 10);
const D = (s) => new Date(s + "T00:00:00Z");

t("Páscoa 2025 = 20 de abril", () => assert.equal(iso(M.pascoa(2025)), "2025-04-20"));
t("Páscoa 2026 = 5 de abril", () => assert.equal(iso(M.pascoa(2026)), "2026-04-05"));
t("Páscoa 2024 = 31 de março", () => assert.equal(iso(M.pascoa(2024)), "2024-03-31"));

t("Carnaval 2026 = 17 de fevereiro (terça)", () => {
  assert.equal(iso(M.feriadosMoveis(2026).carnaval), "2026-02-17");
});

t("Corpus Christi 2026 = 4 de junho", () => {
  assert.equal(iso(M.feriadosMoveis(2026).corpus), "2026-06-04");
});

t("dias úteis: segunda a sexta, 6 a 10 de janeiro de 2025 = 5", () => {
  assert.equal(M.diasUteis(D("2025-01-06"), D("2025-01-10")), 5);
});

t("dias úteis: 24 a 26 de dezembro de 2025 = 2 (25 é feriado)", () => {
  assert.equal(M.diasUteis(D("2025-12-24"), D("2025-12-26")), 2);
});

t("dias úteis: Sexta-feira Santa de 2026 (3 de abril) não conta", () => {
  // 1 a 5 de abril de 2026: quarta a domingo. Úteis: 1, 2 (sexta 3 é feriado, 4 e 5 fim de semana).
  assert.equal(M.diasUteis(D("2026-04-01"), D("2026-04-05")), 2);
});

t("dias úteis com data final antes da inicial não tem resposta", () => {
  assert.ok(Number.isNaN(M.diasUteis(D("2025-01-10"), D("2025-01-06"))));
});

t("diferença calendário: de 15/01/2020 a 20/03/2024 = 4 anos, 2 meses e 5 dias", () => {
  const r = M.diferencaCalendario(D("2020-01-15"), D("2024-03-20"));
  assert.deepEqual(r, { anos: 4, meses: 2, dias: 5 });
});

t("dia da semana: 24/11/2026 é terça-feira", () => {
  assert.equal(M.diaSemana(D("2026-11-24")), "terça-feira");
});

t("melhor dia de compra: fechamento dia 5 e vencimento dia 15 = dia 6 e 40 dias de prazo", () => {
  const r = M.melhorDiaCartao({ fechamento: 5, vencimento: 15 });
  assert.equal(r.melhor, 6);
  assert.equal(r.prazo, 40);
});

t("IMC: 70 kg e 1,70 m = 24,22", () => {
  near(M.imc({ pesoKg: 70, alturaCm: 170 }), 70 / (1.7 * 1.7), 0.001);
});

t("IMC: classificação por faixa", () => {
  assert.equal(M.classeImc(17), "abaixo do peso");
  assert.equal(M.classeImc(22), "peso normal");
  assert.equal(M.classeImc(27), "sobrepeso");
  assert.equal(M.classeImc(32), "obesidade");
});

t("peso ideal para 1,70 m: 53,5 a 72,0 kg (faixa 18,5 a 24,9)", () => {
  const r = M.pesoIdeal({ alturaCm: 170 });
  near(r.min, 18.5 * 2.89, 0.01);
  near(r.max, 24.9 * 2.89, 0.01);
});

t("calorias: homem de 30 anos, 80 kg, 180 cm, atividade moderada", () => {
  const r = M.calorias({ sexo: "masculino", idade: 30, pesoKg: 80, alturaCm: 180, atividade: "moderado" });
  assert.equal(r.tmb, 1780); // 800 + 1125 − 150 + 5
  near(r.gasto, 1780 * 1.55, 0.01);
});

t("calorias: mulher usa −161 no metabolismo basal", () => {
  const r = M.calorias({ sexo: "feminino", idade: 30, pesoKg: 60, alturaCm: 165, atividade: "sedentario" });
  assert.equal(r.tmb, 600 + 1031.25 - 150 - 161);
});

t("emagrecimento: dieta = gasto − 500 e semanas para perder 10 kg", () => {
  const r = M.emagrecimento({ pesoAtual: 85, pesoAlvo: 75, gasto: 2200 });
  assert.equal(r.dieta, 1700);
  assert.equal(r.semanas, Math.ceil(10 / ((500 * 7) / 7700)));
});

t("ganho de massa: meta = gasto + 300", () => {
  assert.equal(M.ganhoMassa({ gasto: 2200 }).meta, 2500);
});

t("Graham: LPA 5 e VPA 30 = √(22,5 × 5 × 30) = 58,09", () => {
  near(M.graham({ lpa: 5, vpa: 30 }), Math.sqrt(22.5 * 5 * 30), 0.01);
});

t("Graham: lucro negativo não tem resposta", () => {
  assert.ok(Number.isNaN(M.graham({ lpa: -1, vpa: 30 })));
});

t("Bazin: dividendos 4 com taxa de 6% = 66,67", () => {
  near(M.bazin({ dividendos: 4, taxaPct: 6 }), 66.67, 0.01);
});

t("Gordon: D0 4, k 12%, g 4% = 4 × 1,04 ÷ 0,08 = 52", () => {
  near(M.gordon({ d0: 4, k: 12, g: 4 }), 52, 0.01);
});

t("Gordon: k menor ou igual a g não tem resposta", () => {
  assert.ok(Number.isNaN(M.gordon({ d0: 4, k: 4, g: 4 })));
});

console.log(`\n${ok} testes passaram.`);
