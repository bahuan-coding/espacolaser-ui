# Prompt para Cursor - Arquivo 5: Central de Boletos e Gestão

**Objetivo:** Criar a página da Central de Boletos, onde o comerciante pode visualizar, filtrar e obter detalhes dos boletos gerados para pagamento das antecipações.

**Contexto:**
O pagamento da antecipação é feito via boleto. Esta tela centraliza a gestão desses boletos, permitindo que o usuário veja o que está em aberto, o que já foi pago e o que está vencido. A interface deve ser clara e funcional, permitindo ações rápidas como copiar o código de barras ou baixar o PDF.

**Instruções:**

1.  **Adicione os componentes Shadcn/UI necessários:**
    ```bash
    npx shadcn-ui@latest add table tabs dialog
    ```

2.  **Crie a Página de Boletos (`src/app/(main)/boletos/page.tsx`):**
    -   Este será um componente de cliente (`'use client'`) para gerenciar o estado dos filtros e da seleção.
    -   Use o componente `Tabs` do Shadcn para criar filtros de status: "Todos", "Abertos", "Pagos", "Vencidos". O estado ativo da aba deve filtrar a lista de boletos exibida.

3.  **Crie a Tabela de Boletos (`src/components/boletos/BoletosTable.tsx`):**
    -   Recebe uma lista de boletos como prop.
    -   Use o componente `Table` do Shadcn para exibir os boletos com as colunas: "Número", "Vencimento", "Valor" e "Status".
    -   Implemente um `StatusBadge` (similar ao do dashboard) para a coluna de status.
    -   Ao clicar em uma linha da tabela, um painel de detalhes deve ser exibido ou um modal deve ser aberto.

4.  **Crie o Painel/Modal de Detalhes do Boleto:**
    -   Use o componente `Dialog` do Shadcn para criar um modal que abre ao clicar em uma linha da tabela.
    -   Dentro do modal, exiba todas as informações do boleto selecionado:
        -   Valor e Vencimento em destaque.
        -   Uma representação visual do código de barras (pode ser um div com um background listrado para simular).
        -   O código de barras numérico completo.
        -   Um botão "Copiar Código" que copia o número para a área de transferência (use `navigator.clipboard.writeText`).
        -   Um botão "Baixar PDF".

5.  **Configure a API Mock (MSW):**
    -   **`src/mocks/handlers.ts`**: Adicione um handler para a rota `/api/boletos`.
        -   `http.get("/api/boletos", ...)`: Deve retornar uma lista de boletos mockados com diferentes status (`open`, `paid`, `overdue`).
        -   Cada boleto deve ter um `id`, `number`, `dueDate`, `amount`, `status`, e `barcode`.

6.  **Integre a Página com a API Mock:**
    -   Na página `/boletos`, use um hook para buscar a lista de boletos da API mockada.
    -   Implemente a lógica de filtro com base na aba de status selecionada.
    -   Passe os dados filtrados para o componente `BoletosTable`.
    -   Conecte a ação de clique na linha da tabela para abrir o `Dialog` com os detalhes do boleto correspondente.

**Resultado Esperado:**
- A página `/boletos` exibe uma lista de boletos que pode ser filtrada por status.
- Clicar em um boleto abre um modal com todos os seus detalhes.
- As ações de "Copiar Código" e "Baixar PDF" (simulada) estão funcionais.
- Os dados são carregados dinamicamente a partir da API mockada, e a filtragem funciona corretamente no frontend.
