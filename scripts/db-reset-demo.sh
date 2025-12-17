#!/bin/bash
# Database Reset Script - Reset and reseed demo environment
# Usage: pnpm db:demo:reset

set -e  # Exit on error

echo "🔄 Resetting demo database..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Pulling from Netlify..."
    netlify env:pull
fi

echo "⚠️  WARNING: This will delete ALL data in your database!"
echo ""

# Ask for confirmation
read -p "Are you sure you want to continue? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Reset cancelled"
    exit 0
fi

echo ""
echo "🗑️  Step 1/2: Dropping all tables..."
pnpm prisma migrate reset --force --skip-seed
echo "✓ Tables dropped"
echo ""

echo "🌱 Step 2/2: Reseeding database..."
pnpm prisma db seed
echo "✓ Database reseeded"
echo ""

echo "✅ Demo database reset complete!"
echo ""
echo "📊 Fresh data includes:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📌 AGENTES"
echo "   - 2 FIDCs (Espaço Laser I e II)"
echo "   - 3 Lojistas (Ibirapuera, Morumbi, Eldorado)"
echo "   - 9 Usuários de merchant (admin, operador, viewer)"
echo "   - 30 Clientes finais"
echo ""
echo "📋 CONTRATOS - 60 total, 5 cenários:"
echo "   - 36 Happy path (pagamento em dia, desembolso completo)"
echo "   - 12 Late ≤60d (2ª parcela paga com atraso)"
echo "   - 6 Defaulted (inadimplência, tentativas de cobrança)"
echo "   - 4 Escrow drawdown (cobertura via escrow)"
echo "   - 2 Tokenization failed (bloqueio do contrato)"
echo ""
echo "💳 PAGAMENTOS"
echo "   - ~60 Gateway Transactions"
echo "   - 5 Gateway Settlements"
echo "   - 3 Return Files (gateway, BIZ, banco)"
echo "   - ~200 Payment Events (boleto, PIX, cartão)"
echo ""
echo "💰 FLUXO FINANCEIRO"
echo "   - ~52 Fund Disbursements (70/30 split)"
echo "   - Escrow accounts com saldo"
echo "   - Quota contributions (Sub/Senior)"
echo "   - Escrow drawdowns para cobertura"
echo ""
echo "📊 CONCILIAÇÃO"
echo "   - 1 Reconciliation file com 5% de divergência"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🔐 Logins disponíveis:"
echo "   Lojista: gerente.ibirapuera@espacolaser.com.br"
echo "   Admin FIDC: admin@a55.tech"
echo ""
echo "🎨 View data at: pnpm db:studio"
echo ""
