# Prompt para Cursor - Arquivo 7: Configurações e Segurança

**Objetivo:** Implementar a página de Configurações, permitindo que o usuário gerencie seus dados cadastrais, configurações de segurança (como MFA) e preferências de notificação.

**Contexto:**
A página de Configurações é crucial para a autonomia e segurança do usuário. A interface deve ser dividida em seções claras, usando um layout de navegação interna (abas ou menu lateral) para organizar as diferentes áreas de configuração.

**Instruções:**

1.  **Adicione os componentes Shadcn/UI necessários:**
    ```bash
    npx shadcn-ui@latest add card input button switch form
    ```

2.  **Crie a Página de Configurações (`src/app/(main)/configuracoes/page.tsx`):**
    -   Crie um layout de duas colunas. À esquerda, um menu de navegação para as seções: "Perfil", "Segurança", "Dados Bancários", "Notificações".
    -   À direita, renderize o conteúdo da seção ativa.
    -   Use o estado para controlar qual seção está sendo exibida.

3.  **Crie a Seção de Perfil:**
    -   Exiba os dados cadastrais do comerciante (Nome da Loja, CNPJ, Endereço) em campos de formulário desabilitados (`disabled`).
    -   Adicione um botão "Editar" que poderia (no futuro) levar a um fluxo de alteração de dados.

4.  **Crie a Seção de Segurança:**
    -   Use o `react-hook-form` para criar formulários para alterar a senha.
    -   Adicione um componente `Switch` do Shadcn para habilitar/desabilitar a Autenticação de Dois Fatores (MFA).
    -   Liste as sessões ativas (dispositivos logados), com informações como "Chrome - Windows 10" e um botão para "Desconectar" a sessão.

5.  **Crie a Seção de Notificações:**
    -   Use componentes `Switch` para permitir que o usuário ative ou desative notificações por e-mail e SMS para diferentes eventos (ex: "Nova antecipação solicitada", "Boleto prestes a vencer").

6.  **Configure a API Mock (MSW):**
    -   **`src/mocks/handlers.ts`**: Adicione os seguintes handlers:
        -   `http.get("/api/settings/profile", ...)`: Retorna os dados do perfil do usuário.
        -   `http.get("/api/settings/security", ...)`: Retorna as configurações de segurança (MFA ativado, sessões ativas).
        -   `http.post("/api/settings/security", ...)`: Simula a atualização das configurações de segurança (ex: ativar MFA).
        -   `http.get("/api/settings/notifications", ...)`: Retorna as preferências de notificação.
        -   `http.post("/api/settings/notifications", ...)`: Simula a atualização das preferências.

7.  **Integre as Seções com a API Mock:**
    -   Cada seção da página de configurações deve buscar seus dados da API mockada correspondente ao ser exibida.
    -   As ações de formulário (como alterar senha ou ativar MFA) devem chamar as rotas `POST` da API mockada e exibir um `toast` de sucesso ou erro.

**Resultado Esperado:**
- A página `/configuracoes` exibe um layout com navegação interna funcional.
- Cada seção (Perfil, Segurança, Notificações) carrega e exibe dados mockados corretamente.
- As interações, como usar os `Switch` de notificações ou o formulário de alteração de senha, estão conectadas à API mockada e fornecem feedback visual ao usuário.
- A interface é limpa, organizada e segue o padrão de design estabelecido pelo Shadcn/UI.
