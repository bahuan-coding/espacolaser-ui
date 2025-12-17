# Modelo de Dados - Private Label FIDC

## Visão Geral

Este documento descreve o modelo de dados completo para o fluxo de **Private Label (PL)** com **FIDC** e **Escrow**. O sistema gerencia:

- Contratos de serviço entre lojistas e clientes finais
- Emissão de cartões Private Label pela BIZ
- Tokenização de cartões para cobrança fallback
- Desembolso do FIDC com split 70% loja / 30% escrow
- Conciliação de pagamentos via arquivos BIZ
- Drawdowns de escrow para cobertura de inadimplência

---

## ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    merchants ||--o{ merchant_users : has
    merchants ||--o{ escrow_accounts : has
    merchants ||--o{ service_contracts : has
    merchants ||--o{ gateway_transactions : processes
    
    funds ||--o{ escrow_accounts : manages
    funds ||--o{ fund_disbursements : provides
    funds ||--o{ fund_repayments : receives
    funds ||--o{ fund_quota_contributions : collects_sub
    
    end_customers ||--o{ service_contracts : signs
    end_customers ||--o{ private_label_cards : owns
    end_customers ||--o{ tokenized_cards : has_fallback
    
    service_contracts ||--o{ contract_installments : contains
    service_contracts ||--|| private_label_cards : uses_pl
    service_contracts ||--o| tokenized_cards : uses_fallback
    service_contracts ||--o{ fund_disbursements : receives
    service_contracts ||--o{ gateway_transactions : linked
    
    contract_installments ||--o{ fund_quota_contributions : contributes_sub
    contract_installments ||--o{ fund_repayments : generates
    contract_installments ||--o{ reconciliation_items : reconciled
    contract_installments ||--o{ tokenized_card_charges : fallback_attempts
    
    fund_disbursements ||--o{ disbursement_splits : splits
    
    escrow_accounts ||--o{ escrow_ledger_entries : tracks
    escrow_accounts ||--o{ escrow_drawdowns : debits
    
    tokenized_cards ||--o{ tokenized_card_charges : charge_attempts
    
    reconciliation_files ||--o{ reconciliation_items : contains
```

---

## Fluxo da Operação

### A) Antecipação ao Lojista

```
1. Cliente assina contrato de serviço com a Loja
2. 1ª parcela paga via adquirente (fora do PL) → compõe Cota Sub do FIDC
3. Gateway confirma transação e tokeniza cartão do cliente (fallback)
4. BIZ emite cartão Private Label para o cliente
5. Cliente paga 2ª parcela (1ª fatura PL):
   - Em dia → elegível para antecipação
   - Até 60 dias atraso → ainda elegível (valor vai para Cota Sub)
   - Não pagou → bloqueado, tenta cobrança no cartão tokenizado
6. FIDC desembolsa com split: 70% loja / 30% escrow
```

### B) Pagamento do Fundo (pós-antecipação)

```
1. BIZ monitora pagamentos das parcelas
2. Se pago → repasse normal ao fundo
3. Se não pago → A55 executa drawdown da escrow para pagar o fundo
4. A55 recebe arquivos da BIZ e faz conciliação
```

---

## Dicionário de Dados

### Enums

| Enum | Valores | Descrição |
|------|---------|-----------|
| `InstallmentStatus` | scheduled, paid, late, defaulted, cancelled | Status da parcela |
| `InstallmentOrigin` | private_label, external_capture | Origem: PL ou adquirente |
| `ContractEligibilityStatus` | pending_first_installment, pending_second_installment, eligible, eligible_late, ineligible, disbursed | Elegibilidade para FIDC |
| `DisbursementStatus` | pending, posted, reversed | Status do desembolso |
| `TokenizationStatus` | pending, success, failed, expired | Status da tokenização |
| `PlCardIssuanceStatus` | pending, issued, failed, cancelled, blocked | Status emissão PL |
| `CardChargeStatus` | pending, processing, success, failed, cancelled | Status da cobrança fallback |
| `ReconciliationStatus` | pending, matched, mismatched, ignored | Status da conciliação |
| `LedgerEntryType` | credit, debit | Tipo de lançamento |
| `DrawdownReason` | late_payment, default_coverage, fee_charge, manual_adjustment | Motivo do drawdown |

---

### Tabelas

#### A. Identidade & Acesso

##### `merchants`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| name | string | Nome da loja |
| document | string | CNPJ (unique) |
| email | string | E-mail de contato |
| phone | string? | Telefone |
| address, city, state, zipCode | string? | Endereço |
| isActive | boolean | Ativo |
| createdAt, updatedAt | datetime | Timestamps |

##### `merchant_users`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| merchantId | string | FK → merchants |
| email | string | E-mail (unique) |
| name | string | Nome |
| role | string | admin, viewer, operator |
| isActive | boolean | Ativo |

---

#### B. Fundos & Escrow

##### `funds`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| name | string | Nome do FIDC |
| document | string | CNPJ (unique) |
| adminName | string? | Administrador (ex: Omni) |
| managerName | string? | Gestor (ex: A55) |
| bankCode, bankAgency, bankAccount, bankAccountDigit | string? | Dados bancários |

##### `escrow_accounts`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| merchantId | string | FK → merchants |
| fundId | string | FK → funds |
| balanceCents | bigint | Saldo em centavos |
| currency | string | Moeda (BRL) |
| Unique | (merchantId, fundId) | Uma conta por merchant+fund |

##### `escrow_ledger_entries`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| escrowAccountId | string | FK → escrow_accounts |
| entryType | enum | credit ou debit |
| amountCents | bigint | Valor em centavos |
| balanceAfterCents | bigint | Saldo após lançamento |
| referenceType | string? | disbursement_split, drawdown, manual |
| referenceId | string? | ID da referência |

---

#### C. Clientes & Contratos

##### `end_customers`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| name | string | Nome completo |
| document | string | CPF (unique) |
| email | string? | E-mail |
| phone | string? | Telefone |
| birthDate | datetime? | Data de nascimento |

##### `tokenized_cards`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| endCustomerId | string | FK → end_customers |
| cardToken | string | Token do cartão (unique) |
| lastFourDigits | string | Últimos 4 dígitos |
| brand | string | visa, mastercard, elo |
| expirationMonth, expirationYear | int | Validade |
| tokenizationStatus | enum | pending, success, failed, expired |
| tokenizedAt | datetime? | Data da tokenização |
| failureReason | string? | Motivo da falha |

##### `private_label_cards`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| endCustomerId | string | FK → end_customers |
| contractId | string? | FK → service_contracts (unique) |
| bizCardId | string? | ID externo da BIZ (unique) |
| cardToken | string | Token PL (unique) |
| lastFourDigits | string | Últimos 4 dígitos |
| creditLimitCents | bigint? | Limite = valor restante contrato |
| issuanceStatus | enum | pending, issued, failed, cancelled, blocked |
| issuedAt | datetime? | Data de emissão |
| failureReason | string? | Motivo da falha |

##### `service_contracts`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| merchantId | string | FK → merchants |
| endCustomerId | string | FK → end_customers |
| contractNumber | string | Número do contrato (unique) |
| description | string? | Descrição do serviço |
| totalAmountCents | bigint | Valor total em centavos |
| numberOfInstallments | int | Número de parcelas |
| startDate, endDate | datetime | Período do contrato |
| **eligibilityStatus** | enum | Status de elegibilidade para FIDC |
| **firstInstallmentPaidAt** | datetime? | Data pagamento 1ª parcela |
| **secondInstallmentPaidAt** | datetime? | Data pagamento 2ª parcela |
| tokenizedCardId | string? | FK → tokenized_cards (fallback) |

##### `contract_installments`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| contractId | string | FK → service_contracts |
| installmentNumber | int | Número da parcela |
| amountCents | bigint | Valor em centavos |
| dueDate | datetime | Data de vencimento |
| paidAt | datetime? | Data de pagamento |
| paidAmountCents | bigint? | Valor pago |
| daysOverdue | int | Dias em atraso |
| status | enum | scheduled, paid, late, defaulted, cancelled |
| origin | enum | private_label ou external_capture |
| **contributesToSubQuota** | boolean | Contribui para Cota Sub do FIDC |
| Unique | (contractId, installmentNumber) | |

---

#### D. Gateway & Conciliação

##### `gateway_transactions`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| merchantId | string | FK → merchants |
| contractId | string? | FK → service_contracts |
| gatewayTransactionId | string | ID externo (unique) |
| amountCents | bigint | Valor |
| status | string | authorized, captured, settled, refunded, failed |
| authorizationCode | string? | Código de autorização |
| paymentLink | string? | Link de pagamento gerado |

##### `reconciliation_files`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| fileName | string | Nome do arquivo |
| fileHash | string? | Hash SHA256 |
| source | string | biz, gateway, manual |
| periodStart, periodEnd | datetime | Período |
| totalRecords | int | Total de registros |
| matchedCount, mismatchedCount | int | Contadores |
| status | enum | pending, matched, mismatched, ignored |

##### `reconciliation_items`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| fileId | string | FK → reconciliation_files |
| installmentId | string? | FK → contract_installments |
| externalReference | string | Referência do arquivo BIZ |
| expectedAmountCents | bigint | Valor esperado |
| actualAmountCents | bigint? | Valor recebido |
| status | enum | Status da conciliação |
| mismatchReason | string? | Motivo da divergência |

---

#### E. Desembolsos, Repasses & Escrow

##### `fund_disbursements`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| fundId | string | FK → funds |
| contractId | string | FK → service_contracts |
| totalAmountCents | bigint | Valor total desembolsado |
| **merchantAmountCents** | bigint | 70% para a loja |
| **escrowAmountCents** | bigint | 30% para escrow |
| status | enum | pending, posted, reversed |
| disbursedAt | datetime? | Data do desembolso |
| Unique | (fundId, contractId) | |

##### `disbursement_splits`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| disbursementId | string | FK → fund_disbursements |
| recipientType | string | merchant ou escrow |
| amountCents | bigint | Valor |
| percentage | decimal(5,2) | Percentual (70.00 ou 30.00) |

##### `fund_repayments`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| fundId | string | FK → funds |
| installmentId | string | FK → contract_installments |
| amountCents | bigint | Valor repassado |
| repaidAt | datetime | Data do repasse |
| source | string | installment_payment ou escrow_drawdown |

##### `escrow_drawdowns`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| escrowAccountId | string | FK → escrow_accounts |
| amountCents | bigint | Valor debitado |
| reason | enum | late_payment, default_coverage, fee_charge, manual_adjustment |
| referenceType | string? | installment, contract |
| referenceId | string? | ID da referência |
| executedAt | datetime | Data de execução |

##### `fund_quota_contributions`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| fundId | string | FK → funds |
| installmentId | string | FK → contract_installments |
| amountCents | bigint | Valor |
| quotaType | string | sub ou senior |
| reason | string | first_installment ou late_second_installment |
| contributedAt | datetime | Data da contribuição |

##### `tokenized_card_charges`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| tokenizedCardId | string | FK → tokenized_cards |
| installmentId | string | FK → contract_installments |
| amountCents | bigint | Valor da cobrança |
| status | enum | pending, processing, success, failed, cancelled |
| attemptNumber | int | Número da tentativa |
| gatewayReference | string? | Referência do gateway |
| failureReason | string? | Motivo da falha |

---

#### F. Auditoria & Eventos

##### `audit_logs`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| action | string | create, update, delete, disbursement, drawdown, etc. |
| actorType | string | system, user, webhook, biz, gateway |
| actorId | string? | ID do ator |
| entityType | string | merchant, contract, installment, etc. |
| entityId | string | ID da entidade |
| payload | json? | Dados adicionais |

##### `domain_events`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| eventType | string | Tipo do evento (ver lista abaixo) |
| source | string | a55, biz, gateway, fidc |
| target | string? | Destino do evento |
| payload | json | Dados do evento |
| status | string | pending, delivered, failed |
| deliveredAt | datetime? | Data de entrega |

**Tipos de eventos:**
- `gateway.transaction.authorized/captured`
- `gateway.card.tokenized/tokenization_failed`
- `biz.pl_card.issued/issuance_failed`
- `biz.installment.paid/late/defaulted`
- `biz.disbursement.eligible`
- `a55.disbursement.requested/posted`
- `a55.escrow.drawdown`
- `a55.fallback_charge.attempted/success/failed`
- `fidc.payment.received`
- `fidc.quota.contribution`

---

## Casos de Teste no Seed

| Caso | Quantidade | Descrição |
|------|------------|-----------|
| Happy Path | 36 | Pagamento em dia, desembolso completo |
| Late <=60d | 12 | 2ª parcela paga com atraso, ainda elegível |
| Defaulted | 6 | 2ª parcela não paga, tentativas de cobrança fallback |
| Escrow Drawdown | 4 | Contrato antecipado com inadimplência posterior |
| Tokenization Failed | 2 | Falha na tokenização, bloqueio do contrato |

---

## Como Executar

### Pré-requisitos

1. Crie um projeto no [Supabase](https://supabase.com) (free tier)
2. Vá em **Settings > Database > Connection string** e copie a URI
3. Configure o `.env`:

```bash
cp env.example .env
```

Edite `.env` com suas credenciais:
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

### Comandos

```bash
# Instalar dependências
pnpm install

# Gerar cliente Prisma
pnpm db:generate

# Push do schema para o banco (primeira vez)
pnpm db:push

# Ou criar migration formal
pnpm db:migrate

# Popular com dados de teste
pnpm db:seed

# Resetar e repopular
pnpm db:reset

# Abrir Prisma Studio (UI visual)
pnpm db:studio
```

### Nota sobre Prisma 7

Este projeto usa Prisma 7+, que requer a configuração das URLs no arquivo `prisma.config.ts` ao invés do `schema.prisma`. As variáveis de ambiente são carregadas via `dotenv`.

---

## Consultas Úteis (Painel do Merchant)

### Saldo Escrow Atual
```sql
SELECT m.name, ea.balance_cents / 100.0 as saldo_brl
FROM escrow_accounts ea
JOIN merchants m ON ea.merchant_id = m.id;
```

### Total Desembolsado por Merchant
```sql
SELECT m.name, 
       SUM(fd.total_amount_cents) / 100.0 as total_desembolsado_brl,
       SUM(fd.merchant_amount_cents) / 100.0 as recebido_loja_brl,
       SUM(fd.escrow_amount_cents) / 100.0 as retido_escrow_brl
FROM fund_disbursements fd
JOIN service_contracts sc ON fd.contract_id = sc.id
JOIN merchants m ON sc.merchant_id = m.id
WHERE fd.status = 'posted'
GROUP BY m.id, m.name;
```

### Parcelas em Atraso por Merchant
```sql
SELECT m.name, 
       COUNT(*) as qtd_parcelas,
       SUM(ci.amount_cents) / 100.0 as valor_total_brl
FROM contract_installments ci
JOIN service_contracts sc ON ci.contract_id = sc.id
JOIN merchants m ON sc.merchant_id = m.id
WHERE ci.status IN ('late', 'defaulted')
GROUP BY m.id, m.name;
```

### Distribuição de Status de Contratos
```sql
SELECT eligibility_status, COUNT(*) as quantidade
FROM service_contracts
GROUP BY eligibility_status;
```

