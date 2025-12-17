# Prompt para Cursor - Arquivo 1: Setup do Projeto e Configurações Base

**Objetivo:** Configurar um novo projeto Next.js com TypeScript, Tailwind CSS e Shadcn/UI, preparando a estrutura inicial para o Portal do Comerciante.

**Instruções:**

1.  **Crie um novo projeto Next.js:**
    Use o comando `npx create-next-app@latest` com as seguintes opções:
    - **Nome do projeto:** `portal-comerciante`
    - **TypeScript:** Sim
    - **ESLint:** Sim
    - **Tailwind CSS:** Sim
    - **`src/` directory:** Sim
    - **App Router:** Sim
    - **Import alias (@/*):** Sim (`@/*`)

2.  **Inicialize o Shadcn/UI:**
    Dentro do diretório do projeto, execute `npx shadcn-ui@latest init` e configure da seguinte forma:
    - **Estilo:** `New York`
    - **Cor base:** `Slate`
    - **Localização do `globals.css`:** `src/styles/globals.css`
    - **Configuração do `tailwind.config.ts`:** `tailwind.config.ts`
    - **Import alias para componentes:** `@/components`
    - **Import alias para utils:** `@/lib/utils`
    - **React Server Components:** Sim

3.  **Instale as dependências adicionais:**
    ```bash
    pnpm install recharts react-hook-form zod @hookform/resolvers next-auth msw
    ```

4.  **Crie a estrutura de diretórios:**
    Com base no `00_plano_mestre.md`, crie a seguinte estrutura de pastas dentro de `src/`:

    ```
    /src
    ├── app/
    │   ├── (auth)/login/
    │   ├── (main)/dashboard/
    │   ├── (main)/antecipacao/
    │   ├── (main)/boletos/
    │   ├── (main)/extrato/
    │   ├── (main)/configuracoes/
    │   └── api/auth/[...nextauth]/
    ├── components/
    │   ├── shared/
    │   ├── icons/
    │   └── charts/
    ├── lib/
    ├── hooks/
    ├── mocks/
    └── styles/
    ```

5.  **Crie arquivos `page.tsx` básicos:**
    Para cada uma das pastas de rota em `(main)` e `(auth)`, crie um arquivo `page.tsx` com um conteúdo placeholder. Exemplo para `dashboard`:

    ```tsx
    // src/app/(main)/dashboard/page.tsx
    export default function DashboardPage() {
      return <div><h1>Dashboard</h1></div>;
    }
    ```

6.  **Configure o MSW (Mock Service Worker):**
    Execute o comando `npx msw init src/` para criar o service worker no diretório público.
    Crie os arquivos `src/mocks/handlers.ts` e `src/mocks/browser.ts` com configurações básicas (deixe-os vazios por enquanto, apenas com as importações necessárias).

**Resultado Esperado:**

Um projeto Next.js totalmente configurado com a estrutura de arquivos pronta para as próximas etapas de desenvolvimento. O projeto deve rodar sem erros com `pnpm dev`.
