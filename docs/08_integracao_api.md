# Prompt para Cursor - Arquivo 8: Integração com Backend e APIs

**Objetivo:** Substituir as chamadas à API mockada (MSW) por chamadas a um backend real. Estruturar o código de acesso à API de forma robusta, com tratamento de erros, estado de loading e tipagem.

**Contexto:**
Até agora, o frontend foi desenvolvido de forma isolada usando o MSW. Esta etapa finaliza a implementação do frontend conectando-o a um backend real. Assumiremos que o backend já existe e expõe os endpoints necessários. O foco aqui é na refatoração do código do frontend para consumir essa API de verdade.

**Instruções:**

1.  **Crie um Cliente de API Centralizado:**
    -   Crie um arquivo `src/lib/api-client.ts`.
    -   Use uma biblioteca como `axios` ou o `fetch` nativo para criar uma instância de cliente de API pré-configurada.
    -   Configure a `baseURL` para apontar para o endereço do seu backend (ex: `process.env.NEXT_PUBLIC_API_URL`).
    -   Configure o cliente para incluir automaticamente o token de autenticação (obtido da sessão do NextAuth) em todas as requisições.

2.  **Refatore os Hooks de Acesso a Dados:**
    -   Modifique o hook `src/hooks/use-api.ts` (ou crie hooks específicos como `useDashboardData`, `useReceivables`, etc.).
    -   Substitua as chamadas `fetch` diretas para as rotas mockadas pelas chamadas feitas através do cliente de API centralizado.
    -   Use bibliotecas de data-fetching como `SWR` ou `React Query` (TanStack Query) para gerenciar o estado da API (caching, revalidação, etc.). Isso é altamente recomendado para uma aplicação robusta.
        -   **Exemplo com SWR:**
            ```typescript
            import useSWR from 'swr';
            import apiClient from '@/lib/api-client';

            const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

            export function useDashboardData() {
              const { data, error, isLoading } = useSWR('/dashboard', fetcher);
              return { data, error, isLoading };
            }
            ```

3.  **Atualize os Componentes:**
    -   Percorra todos os componentes que atualmente usam dados mockados ou chamam diretamente a API mockada.
    -   Substitua a lógica de fetching de dados para usar os novos hooks baseados em SWR ou React Query.
    -   Implemente o tratamento de estados de `isLoading` e `error` em cada componente:
        -   Enquanto `isLoading` for `true`, exiba um componente de esqueleto (spinner ou layout de placeholder). Você pode usar o `Skeleton` do Shadcn/UI para isso.
        -   Se `error` existir, exiba uma mensagem de erro amigável (ex: "Não foi possível carregar os dados. Tente novamente mais tarde.").

4.  **Tipagem de Dados da API:**
    -   Crie um arquivo `src/lib/api-types.ts`.
    -   Defina as interfaces TypeScript para todos os objetos de dados retornados pela sua API (ex: `User`, `Receivable`, `Boleto`, `Transaction`).
    -   Use esses tipos nos seus hooks de SWR/React Query e nos componentes para garantir a segurança de tipos em toda a aplicação.

5.  **Desabilite o MSW em Produção:**
    -   Crie um arquivo `src/app/msw-provider.tsx`.
    -   Neste arquivo, configure o MSW para ser ativado apenas em ambiente de desenvolvimento.
        ```typescript
        'use client';
        import { useEffect } from 'react';

        export const MSWProvider = ({ children }: { children: React.ReactNode }) => {
          useEffect(() => {
            if (process.env.NODE_ENV === 'development') {
              require('@/mocks/browser');
            }
          }, []);

          return <>{children}</>;
        };
        ```
    -   Envolva o `<body>` no `src/app/layout.tsx` com este `MSWProvider`.

**Resultado Esperado:**
- Todas as partes da aplicação que antes usavam dados mockados agora buscam dados de um backend real.
- O código de acesso à API está centralizado, reutilizável e robusto.
- A aplicação exibe estados de loading (esqueletos) enquanto os dados estão sendo buscados.
- Erros de API são tratados de forma elegante, mostrando mensagens amigáveis ao usuário.
- O MSW é desativado automaticamente em builds de produção, garantindo que a aplicação use a API real.
