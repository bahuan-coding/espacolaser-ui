# Prompt para Cursor - Arquivo 6: Extrato e Relatórios

**Objetivo:** Desenvolver a página de Extrato, que oferece uma visão detalhada de todas as movimentações financeiras da conta, com funcionalidades avançadas de filtro e exportação.

**Contexto:**
O extrato é uma ferramenta essencial para a conciliação financeira do comerciante. A interface precisa ser robusta, permitindo que o usuário encontre facilmente transações específicas e exporte os dados para seus próprios sistemas de gestão.

**Instruções:**

1.  **Adicione os componentes Shadcn/UI necessários:**
    ```bash
    npx shadcn-ui@latest add table date-picker select dropdown-menu
    ```

2.  **Crie a Página de Extrato (`src/app/(main)/extrato/page.tsx`):**
    -   Este será um componente de cliente (`'use client'`) para gerenciar o estado dos filtros.
    -   No topo da página, adicione uma área de filtros contendo:
        -   Um `DatePicker` do Shadcn para selecionar o período (início e fim).
        -   Um `Select` para filtrar por tipo de transação (Venda, Antecipação, Pagamento, Estorno).
        -   Um campo de busca para filtrar por descrição.
    -   Adicione botões para "Exportar CSV" e "Exportar PDF".

3.  **Crie a Tabela de Extrato (`src/components/extrato/ExtractTable.tsx`):**
    -   Recebe a lista de transações filtradas como prop.
    -   Use o `Table` do Shadcn com as colunas: "Data", "Tipo", "Descrição", "Valor Bruto", "Taxas", "Valor Líquido".
    -   Os valores monetários devem ser formatados corretamente (R$).
    -   Valores de entrada (créditos) devem ser mostrados em uma cor (ex: verde) e valores de saída (débitos) em outra (ex: vermelho).
    -   Implemente paginação na tabela para lidar com grandes volumes de dados.

4.  **Configure a API Mock (MSW):**
    -   **`src/mocks/handlers.ts`**: Adicione um handler para a rota `/api/extract`.
        -   `http.get("/api/extract", ...)`: Deve aceitar parâmetros de query para os filtros ( `startDate`, `endDate`, `type`).
        -   O handler deve retornar uma lista paginada de transações mockadas, simulando a filtragem no backend.
        -   Exemplo de transação: `{ id: '...', date: '...', type: 'anticipation', description: 'Antecipação #ANT-8892', gross: 12500, fees: 311.25, net: 12188.75 }`

5.  **Integre a Página com a API Mock:**
    -   Na página `/extrato`, use um hook para buscar os dados da API `/api/extract`.
    -   Sempre que um filtro for alterado, a chamada à API deve ser refeita com os novos parâmetros.
    -   Implemente um estado de `loading` para dar feedback visual ao usuário enquanto os dados são carregados.
    -   Passe os dados recebidos para o componente `ExtractTable`.

**Resultado Esperado:**
- A página `/extrato` exibe uma tabela detalhada de transações.
- Os filtros de data, tipo e busca funcionam corretamente, atualizando a tabela com os dados da API mockada.
- A paginação da tabela está funcional.
- Os botões de exportação estão presentes (a funcionalidade de exportação real pode ser implementada depois).
- A interface é limpa e os dados financeiros são fáceis de ler e entender.
