#!/bin/bash
# Database Setup Script - Initial setup for Netlify Neon PostgreSQL
# Usage: pnpm db:setup

set -e  # Exit on error

echo "🚀 Starting database setup..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Pulling from Netlify..."
    netlify env:pull
fi

echo "✓ Environment configured"
echo ""

# Step 1: Generate Prisma Client
echo "📦 Step 1/3: Generating Prisma Client..."
pnpm prisma generate
echo "✓ Prisma Client generated"
echo ""

# Step 2: Push schema to database
echo "🗄️  Step 2/3: Pushing schema to Neon PostgreSQL..."
pnpm prisma db push --accept-data-loss
echo "✓ Schema pushed successfully"
echo ""

# Step 3: Seed database with mock data
echo "🌱 Step 3/3: Seeding database with mock data..."
pnpm prisma db seed
echo "✓ Database seeded successfully"
echo ""

echo "✅ Database setup complete!"
echo ""
echo "📊 Your database now has:"
echo "   - 2 funds (FIDCs)"
echo "   - 3 merchants with users"
echo "   - 30 end customers"
echo "   - 60 service contracts"
echo "   - 5 test case scenarios (happy path, late, defaulted, escrow drawdown, tokenization failed)"
echo ""
echo "🎨 To explore the data, run:"
echo "   pnpm db:studio"
echo ""
