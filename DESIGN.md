# DESIGN.md — Finanças

Sistema visual do site de calculadoras. Escrito a partir do que foi construído (`styles.css`).

## Ideia
Um terminal que fala português simples. Cada conta vira uma linha de comando, e a saída limpa aparece ao lado.

## Cor
- Fundo `--fundo #0b0c0e`, superfície `--fundo-2 #111316`, vidro `rgba(255,255,255,0.04)`.
- Texto `--texto #f5f5f7`, secundário `#a1a1a6`, terciário `#6e6e73` (contraste ≥ 4,5:1 sobre o fundo).
- Um acento só: `--verde #30d158`, reservado a resultado, ação e prompt. Fundo de destaque `--verde-suave` (14%).
- Vermelho `--erro` existe como token, sem uso ativo.

## Tipografia
- Interface: pilha de sistema (`-apple-system`, `SF Pro Text`, `Segoe UI`).
- Números, comandos e tabelas: JetBrains Mono (Google Fonts), com `tabular-nums`.
- Títulos com tracking negativo (`-0,035em` no H1, `-0,028em` no H2). Corpo perto de 0.

## Forma
- Raio grande (20px) em painéis, 12px em campos, pílula em botões e tags.
- Bordas de 1px com baixa opacidade. Sombra só no terminal do hero.
- Vidro (`backdrop-filter`) só na barra superior e nos painéis, com fallback para `prefers-reduced-transparency`.

## Movimento
- Entrada única dos painéis de resultado (0,5s, ease-out exponencial). Cursor do terminal pisca em passo.
- Hover e foco com transição curta. `prefers-reduced-motion` desliga tudo.

## Componentes
- Campo: rótulo + caixa escura; a caixa ganha borda verde e halo ao focar.
- Painel de resultado: cabeçalho `resultado / estimativa`, lista de três linhas com a última destacada.
- Detalhes ("Ver a conta", "Ver mês a mês") como `<details>` estilizado com `+/−`.

## Regras
- Resultado sempre mostra a fórmula ou a conta explicada.
- Nada é salvo nem enviado. Aviso de estimativa visível no rodapé.
- Modo escuro único: o site não tem versão clara.

## Verificado
Desktop (1024 px) e celular (375 px) no navegador local, sem rolagem horizontal na página. Resultados conferidos à mão nos três cálculos.
