# Database Setup Guide - Private Label FIDC

## Quick Start

### 1. Configure Supabase

Create a project at [supabase.com](https://supabase.com) and get your connection strings:

1. Go to **Settings > Database > Connection string**
2. Copy the **URI** format
3. Create `.env` file:

```bash
cp env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

### 2. Run Setup

**One-command setup** (recommended):
```bash
pnpm db:setup
```

This will:
- ✅ Generate Prisma client
- ✅ Push schema to Supabase
- ✅ Seed with 60 contracts of mock data

**Or step-by-step**:
```bash
# Generate client
pnpm db:generate

# Push schema
pnpm db:push

# Seed data
pnpm db:seed
```

### 3. View Data

Open Prisma Studio to explore the data:
```bash
pnpm db:studio
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm db:setup` | **Initial setup** - Generate, push schema, and seed |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:seed` | Seed database with mock data |
| `pnpm db:studio` | Open Prisma Studio (visual UI) |
| `pnpm db:demo:reset` | **Reset demo** - Drop all data and reseed |
| `pnpm db:migrate` | Create formal migration |
| `pnpm db:reset` | Reset with migrations |

---

## Mock Data Generated

After running `db:setup` or `db:seed`, you'll have:

### Test Case Distribution

| Scenario | Quantity | Description |
|----------|----------|-------------|
| **Happy Path** | 36 | All installments paid on time |
| **Late ≤60d** | 12 | 2nd installment paid late, still eligible |
| **Defaulted** | 6 | 2nd installment not paid, fallback charges attempted |
| **Escrow Drawdown** | 4 | Post-disbursement defaults covered by escrow |
| **Tokenization Failed** | 2 | Contract blocked, no PL card issued |

### Entities

- **2 funds** (FIDCs with Omni/BTG as administrators)
- **3 merchants** (Espaço Laser Centro, Shopping, Premium)
- **6 users** (2 per merchant: admin + operator)
- **30 end customers** with CPF, email, phone
- **60 service contracts** (20 per merchant, 6-12 installments each)
- **~500 installments** (mix of paid, late, defaulted, scheduled)
- **60 tokenized cards** (for fallback charging)
- **58 PL cards** (2 failed issuance)
- **54 disbursements** with 70/30 splits
- **Fund quota contributions** to Sub quota (1st installment + late 2nd)
- **Escrow drawdowns** for defaults
- **Fallback charge attempts** on tokenized cards
- **Reconciliation file** with 5% mismatch rate

---

## Reset Demo Environment

To clear all data and reseed fresh mock data:

```bash
pnpm db:demo:reset
```

⚠️ **Warning**: This drops ALL tables and data!

---

## Troubleshooting

### Error: Missing DATABASE_URL

Make sure `.env` exists with valid Supabase connection strings:
```bash
cat .env
```

### Error: Connection refused

- Check if your Supabase project is active
- Verify the connection string is correct
- Ensure you're using the pooler URL (port 6543) for DATABASE_URL

### Error: Permission denied

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

### Reset everything and start fresh

```bash
# Delete migrations and reset
rm -rf prisma/migrations
pnpm db:push --accept-data-loss
pnpm db:seed
```

---

## Next Steps

1. ✅ Run `pnpm db:setup`
2. ✅ Open `pnpm db:studio` to explore data
3. ✅ Check the documentation at `docs/data-model-private-label.md`
4. ✅ Start building your UI with the mock data

---

## Need Help?

- **Schema documentation**: `docs/data-model-private-label.md`
- **ERD diagram**: See mermaid diagram in docs
- **Prisma docs**: https://www.prisma.io/docs
- **Supabase docs**: https://supabase.com/docs

