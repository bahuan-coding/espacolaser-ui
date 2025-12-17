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
echo "   - 60 contracts with 5 different test scenarios"
echo "   - Happy path (36 contracts)"
echo "   - Late payment ≤60d (12 contracts)"
echo "   - Defaulted (6 contracts)"
echo "   - Escrow drawdown (4 contracts)"
echo "   - Tokenization failed (2 contracts)"
echo ""
echo "🎨 View data at: pnpm db:studio"
echo ""
