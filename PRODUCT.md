# Produto

Site de finanças pessoais com calculadoras simples para pessoas leigas, em português do Brasil.

## Público
Pessoas comuns que querem entender dinheiro: quanto rende uma poupança, quanto vai pagar num empréstimo, quanto o salário vira depois dos descontos. Não são especialistas e não querem jargão.

## Calculadoras da primeira versão
1. Juros compostos (investimento com aportes mensais).
2. Correção de valores pela inflação (quanto vale hoje um valor de uma data passada).
3. Salário líquido (INSS e IRRF).

Taxas (Selic, IPCA, CDI) são digitadas pelo usuário, com valores padrão editáveis. Não há conexão obrigatória com APIs.

## Tom
Claro, direto, sem promessa de ganho. Cada resultado explica a conta em linguagem simples e deixa visível a fórmula usada.

## Marca e assinatura visual
Estilo Apple: espaçamento generoso, tipografia forte, superfícies limpas. Com um ar de tecnologia: linhas de terminal, números em destaque, comandos tipo `$ calc --juros`. Modo escuro.

## Restrições
- Site estático (HTML, CSS, JS puro), sem build.
- Funciona offline depois de carregado.
- Sem dados pessoais salvos ou enviados.
- Aviso honesto: resultados são estimativas; tabelas de imposto devem ser conferidas nas fontes oficiais.
