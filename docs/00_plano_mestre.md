# Plano Mestre de Execução - Portal do Comerciante

Este documento descreve a arquitetura e a estrutura de arquivos para a implementação do Portal do Comerciante usando Next.js, TypeScript e Tailwind CSS.

## 1. Arquitetura e Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Componentes UI:** Shadcn/UI
- **Gráficos:** Recharts
- **Formulários:** React Hook Form + Zod
- **Autenticação:** NextAuth.js
- **Mock API:** MSW (Mock Service Worker) para desenvolvimento frontend desacoplado.

## 2. Estrutura de Diretórios Principal

```
/src
├── app/
│   ├── (auth)/                # Rotas de autenticação (layout sem sidebar/header)
│   │   └── login/
│   │       └── page.tsx
│   ├── (main)/                # Rotas principais da aplicação (com layout principal)
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── antecipacao/
│   │   │   └── page.tsx
│   │   ├── boletos/
│   │   │   └── page.tsx
│   │   ├── extrato/
│   │   │   └── page.tsx
│   │   └── configuracoes/
│   │       └── page.tsx
│   ├── api/
│   │   └── auth/[...nextauth]/
│   │       └── route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                    # Componentes do Shadcn/UI (gerados automaticamente)
│   ├── shared/                # Componentes reutilizáveis (Header, Sidebar, etc)
│   ├── icons/                 # Ícones customizados
│   └── charts/                # Componentes de gráficos (Recharts)
├── lib/
│   ├── auth.ts                # Configurações do NextAuth.js
│   ├── utils.ts               # Funções utilitárias (ex: cn do Shadcn)
│   └── zod-schemas.ts         # Schemas de validação do Zod
├── hooks/
│   └── use-api.ts             # Hook customizado para chamadas de API
├── mocks/
│   ├── handlers.ts            # Handlers para as rotas da API mockada
│   └── browser.ts             # Configuração do MSW para o browser
└── styles/
    └── globals.css            # Estilos globais do Tailwind
```

## 3. Sequência de Implementação

1.  **Setup do Projeto (Arquivo 01):** Instalação do Next.js, Tailwind, Shadcn, e outras dependências. Configuração inicial.
2.  **Autenticação e Layout (Arquivo 02):** Criação das telas de login, layout principal (com sidebar e header) e rotas protegidas.
3.  **Dashboard (Arquivo 03):** Implementação dos widgets de saldo, gráficos de fluxo de caixa e tabela de transações recentes.
4.  **Fluxo de Antecipação (Arquivo 04):** Criação do fluxo multi-etapas para simulação e solicitação de antecipação.
5.  **Boletos (Arquivo 05):** Tela para listar, visualizar e baixar boletos.
6.  **Extrato (Arquivo 06):** Tabela detalhada de extrato com filtros avançados.
7.  **Configurações (Arquivo 07):** Página para o usuário gerenciar dados, segurança e notificações.
8.  **Integração API (Arquivo 08):** Substituição dos mocks do MSW por chamadas reais à API, gerenciamento de estado e tratamento de erros.
