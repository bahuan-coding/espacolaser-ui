# Prompt para Cursor - Arquivo 4: Fluxo de Simulação de Antecipação

**Objetivo:** Implementar a funcionalidade de simulação e solicitação de antecipação como um fluxo multi-etapas, permitindo ao usuário selecionar recebíveis, revisar custos e confirmar a operação.

**Contexto:**
Este é o fluxo mais crítico do portal. Ele precisa ser claro, transparente e intuitivo. Vamos construí-lo como um componente que gerencia o estado da etapa atual (Seleção, Revisão, Confirmação) e renderiza a UI apropriada para cada uma.

**Instruções:**

1.  **Adicione os componentes Shadcn/UI necessários:**
    ```bash
    npx shadcn-ui@latest add table checkbox progress
    ```

2.  **Crie o Componente Principal do Fluxo (`src/app/(main)/antecipacao/page.tsx`):**
    -   Este será um componente de cliente (`'use client'`) que gerenciará o estado do fluxo.
    -   Use o hook `useState` para controlar a etapa atual (ex: `const [step, setStep] = useState('selection')`).
    -   Use outro `useState` para armazenar os recebíveis selecionados.
    -   Renderize condicionalmente os componentes de cada etapa com base no estado `step`.

3.  **Etapa 1: Seleção de Recebíveis (`src/components/antecipacao/SelectionStep.tsx`):**
    -   Crie um componente que recebe `onNextStep` e `onSelectionChange` como props.
    -   Use o componente `Table` do Shadcn para listar os recebíveis disponíveis (mockados por enquanto).
    -   A primeira coluna da tabela deve conter um `Checkbox` para seleção.
    -   Adicione um `Checkbox` no header da tabela para selecionar/desmarcar todos os itens.
    -   À direita da tabela, crie um painel de resumo que mostra:
        -   Número de itens selecionados.
        -   Valor bruto total selecionado.
        -   Valor líquido estimado.
    -   Inclua um botão "Continuar para Revisão" que chama `onNextStep`.

4.  **Etapa 2: Revisão de Custos (`src/components/antecipacao/ReviewStep.tsx`):**
    -   Crie um componente que recebe os `selectedReceivables` e uma função `onConfirm` e `onBack`.
    -   Exiba um resumo claro dos custos:
        -   Valor Bruto Total
        -   Taxa de Antecipação (ex: 1.99%)
        -   IOF (ex: 0.38%)
        -   **Valor Líquido a Receber** (destacado)
    -   Use o `Recharts` para mostrar um gráfico de barras simples comparando o "Valor Bruto" vs. "Valor Líquido".
    -   Adicione um botão "Confirmar e Solicitar" que chama `onConfirm` e um botão "Voltar" que chama `onBack`.

5.  **Etapa 3: Confirmação/Sucesso (`src/components/antecipacao/SuccessStep.tsx`):**
    -   Crie um componente que é exibido após a confirmação.
    -   Mostre uma mensagem de sucesso como "Solicitação Recebida com Sucesso!"
    -   Exiba o ID da solicitação (mockado) e o valor líquido solicitado.
    -   Use o componente `Progress` do Shadcn para mostrar o status do processamento (ex: "Em Análise").
    -   Adicione um botão "Ir para o Dashboard" para finalizar o fluxo.

6.  **Configure a API Mock (MSW):**
    -   **`src/mocks/handlers.ts`**: Adicione os seguintes handlers:
        -   `http.get("/api/receivables", ...)`: Deve retornar uma lista de recebíveis mockados (data, bandeira, valor bruto, valor líquido).
        -   `http.post("/api/anticipation/simulate", ...)`: Recebe uma lista de IDs de recebíveis e retorna o cálculo dos custos (taxas, IOF, valor líquido).
        -   `http.post("/api/anticipation/request", ...)`: Recebe a simulação confirmada e retorna uma resposta de sucesso com um ID de solicitação.

7.  **Integre os Componentes com a API Mock:**
    -   Na `SelectionStep`, use um hook para buscar os dados de `/api/receivables`.
    -   Ao clicar em "Continuar para Revisão", chame a API de simulação (`/api/anticipation/simulate`) com os IDs selecionados e passe o resultado para a `ReviewStep`.
    -   Na `ReviewStep`, ao clicar em "Confirmar e Solicitar", chame a API de solicitação (`/api/anticipation/request`) e, em caso de sucesso, avance para a `SuccessStep`.

**Resultado Esperado:**
- A página `/antecipacao` exibe um fluxo funcional de 3 etapas.
- O usuário pode selecionar recebíveis, ver o resumo da seleção e avançar.
- A tela de revisão mostra um detalhamento transparente dos custos e um gráfico comparativo.
- Após a confirmação, uma tela de sucesso é exibida com o status da solicitação.
- Todo o fluxo é alimentado por dados de uma API mockada, simulando uma interação real com o backend.
