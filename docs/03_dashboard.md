# Prompt para Cursor - Arquivo 3: Dashboard Principal

**Objetivo:** Construir a página de Dashboard, replicando o design e a funcionalidade apresentados nos slides, com widgets de saldo, um gráfico de fluxo de caixa e uma tabela de transações recentes.

**Contexto:**
Com o layout principal e a autenticação prontos, o Dashboard é a primeira tela que o usuário verá. Ele precisa ser informativo e acionável, fornecendo uma visão geral da saúde financeira do comerciante e um ponto de partida para a ação mais importante: a antecipação.

**Instruções:**

1.  **Adicione os componentes Shadcn/UI necessários:**
    ```bash
    npx shadcn-ui@latest add card table
    ```

2.  **Crie os componentes do Dashboard:**
    Divida a página do dashboard em componentes menores e reutilizáveis, que serão colocados em `src/components/dashboard/`.

    -   **`src/components/dashboard/BalanceWidget.tsx`**
        -   Use o componente `Card` do Shadcn.
        -   Exiba dois valores principais: "Saldo Disponível para Antecipação" e "Total a Receber".
        -   Adicione um botão (`Button`) com o texto "Simular e Antecipar" que, ao ser clicado, deve navegar para a página `/antecipacao`.
        -   Use dados mockados por enquanto (ex: R$ 15.450,00 e R$ 42.300,00).

    -   **`src/components/charts/CashflowChart.tsx`**
        -   Crie um componente de cliente (`'use client'`).
        -   Use `recharts` para criar um `LineChart` (gráfico de linha).
        -   O gráfico deve mostrar a evolução do saldo nos últimos 30 dias. Use dados mockados para o gráfico.
        -   Estilize o gráfico para ser minimalista, sem eixos X e Y visíveis, e com uma linha na cor azul (`#0052FF`) do nosso tema.
        -   Envolva o gráfico em um `ResponsiveContainer` para que ele se ajuste ao widget pai.

    -   **`src/components/dashboard/RecentTransactionsTable.tsx`**
        -   Use os componentes `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, e `TableCell` do Shadcn/UI.
        -   Crie uma tabela com as colunas: "Data", "Descrição", "Valor" e "Status".
        -   Popule a tabela com 3-4 transações mockadas, incluindo vendas e uma antecipação anterior.
        -   Crie um componente de "Status Badge" para a coluna de status, com cores diferentes para "Aprovado", "Creditado", etc.

3.  **Monte a Página do Dashboard (`src/app/(main)/dashboard/page.tsx`):**
    -   Use um layout de grid do Tailwind CSS para organizar os componentes na página, similar ao que foi projetado nos slides:
        -   Um grid com 2 colunas.
        -   O `BalanceWidget` e o `CashflowChart` devem ocupar a primeira linha.
        -   A `RecentTransactionsTable` deve ocupar a segunda linha, expandindo por ambas as colunas (`col-span-2`).
    -   Importe e posicione cada um dos componentes criados no passo anterior.

4.  **Configure a API Mock (MSW):**
    -   **`src/mocks/handlers.ts`**: Adicione um novo handler para a rota `/api/dashboard`.
        -   `http.get("/api/dashboard", ...)`
        -   Este handler deve retornar um JSON com os dados mockados para o dashboard: `balance`, `receivables`, `cashflowData`, e `recentTransactions`.
    -   **`src/hooks/use-api.ts`**: Crie um hook simples para buscar os dados. Por enquanto, ele pode usar `fetch` para chamar a API mockada.
    -   **Atualize os componentes:** Modifique os componentes do dashboard para usar o hook `use-api` para buscar os dados, em vez de usá-los estaticamente.

**Resultado Esperado:**
- A página `/dashboard` exibe um layout de grid com três widgets principais.
- O widget de saldo mostra os valores corretos e o botão leva para a página de antecipação.
- O gráfico de fluxo de caixa é renderizado com dados mockados.
- A tabela de transações recentes exibe os dados mockados corretamente.
- Os dados são carregados a partir da API mockada configurada com MSW, tornando os componentes dinâmicos.
