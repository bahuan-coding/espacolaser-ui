# Prompt para Cursor - Arquivo 2: Autenticação e Layout Principal

**Objetivo:** Implementar o fluxo de autenticação com NextAuth.js, criar o layout principal da aplicação (Sidebar e Header) e proteger as rotas.

**Contexto:**
Após o setup inicial, o próximo passo é proteger a aplicação e dar a ela uma estrutura de navegação. Usaremos um layout para as rotas de autenticação (fundo limpo, conteúdo centralizado) e outro para as rotas principais (com sidebar e header). A autenticação será feita com NextAuth.js, usando um provedor de credenciais simples por enquanto.

**Instruções:**

1.  **Adicione os componentes Shadcn/UI necessários:**
    ```bash
    npx shadcn-ui@latest add card input button label form toast
    ```

2.  **Instale `lucide-react` para ícones:**
    ```bash
    pnpm install lucide-react
    ```

3.  **Crie a Página de Login (`src/app/(auth)/login/page.tsx`):**
    - Crie um componente de cliente (`'use client'`).
    - Use `react-hook-form` e `zod` para criar um schema e um formulário com os campos `email` e `password`.
    - Estruture a UI com os componentes `Card` do Shadcn/UI, centralizado na tela.
    - Ao submeter o formulário, chame a função `signIn('credentials', ...)` do `next-auth/react`.
    - Se o `signIn` retornar um erro, use o `toast` do Shadcn/UI para exibir a mensagem "Credenciais inválidas".
    - Após o login bem-sucedido, redirecione para `/dashboard`.

4.  **Configure o NextAuth.js:**
    - **`src/lib/auth.ts`**: Crie este arquivo para as opções do NextAuth.
        - Use o `CredentialsProvider`.
        - Na função `authorize`, simule a lógica: se `email` for `comerciante@exemplo.com` e `password` for `123456`, retorne um objeto de usuário `{ id: '1', name: 'Loja Exemplo', email: 'comerciante@exemplo.com' }`. Caso contrário, retorne `null`.
        - Defina `session: { strategy: 'jwt' }` e `pages: { signIn: '/login' }`.
    - **`src/app/api/auth/[...nextauth]/route.ts`**: Crie a API route do NextAuth importando as opções acima.

5.  **Crie o Layout Principal:**
    - **`src/components/shared/Sidebar.tsx`**: Crie um componente de sidebar fixo à esquerda.
        - Adicione links (usando o componente `Link` do `next/link`) para as rotas: `/dashboard`, `/antecipacao`, `/boletos`, `/extrato`, `/configuracoes`.
        - Use ícones do `lucide-react` ao lado de cada link (ex: `LayoutGrid`, `DollarSign`, `Barcode`, `Book`, `Settings`).
        - Use o hook `usePathname` para destacar o link ativo.
    - **`src/components/shared/Header.tsx`**: Crie um header no topo da área de conteúdo.
        - À direita, mostre o nome do usuário logado e um `DropdownMenu` (componente do Shadcn) com a opção "Sair".
        - A opção "Sair" deve chamar a função `signOut()` do `next-auth/react`.

6.  **Configure os Layouts de Rota:**
    - **`src/app/(auth)/layout.tsx`**: Deve ser um layout simples que apenas renderiza `{children}` em um fundo neutro, ideal para centralizar o formulário de login.
    - **`src/app/(main)/layout.tsx`**: Este será o layout principal.
        - Ele deve renderizar a `<Sidebar />`.
        - O conteúdo principal (`{children}`) deve ser renderizado à direita da sidebar, dentro de um container que inclua o `<Header />` no topo.
        - **Proteção:** Este layout deve ser um Server Component que verifica a sessão. Se não houver sessão, ele deve redirecionar o usuário para `/login` usando a função `redirect` do `next/navigation`.

7.  **Crie o Provedor de Sessão:**
    - Crie um arquivo `src/components/shared/SessionProvider.tsx` que exporta um provider (`'use client'`) envolvendo `{children}` com o `SessionProvider` do `next-auth/react`.
    - No `src/app/layout.tsx` (root layout), importe este novo provider e envolva o `<body>` com ele para que toda a aplicação tenha acesso ao contexto da sessão.

**Resultado Esperado:**
- Uma tela de login funcional em `/login`.
- Ao logar com as credenciais corretas, o usuário é redirecionado para `/dashboard`.
- O dashboard e outras páginas principais exibem um layout com sidebar e header.
- Tentar acessar `/dashboard` sem estar logado redireciona automaticamente para `/login`.
- O botão "Sair" no header desloga o usuário e o redireciona para a página de login.
