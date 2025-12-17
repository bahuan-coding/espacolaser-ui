import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LedgerEntryType } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const entryType = searchParams.get("type") as LedgerEntryType | null;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const search = searchParams.get("search");

  // Get first merchant (in production, get from session)
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const escrowAccount = await prisma.escrowAccount.findFirst({
    where: { merchantId: merchant.id, isActive: true },
  });

  if (!escrowAccount) {
    return NextResponse.json({ error: "Escrow account not found" }, { status: 404 });
  }

  const where = {
    escrowAccountId: escrowAccount.id,
    ...(entryType && { entryType }),
    ...(startDate && { createdAt: { gte: new Date(startDate) } }),
    ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: "insensitive" as const } },
        { referenceId: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [entries, total] = await Promise.all([
    prisma.escrowLedgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.escrowLedgerEntry.count({ where }),
  ]);

  return NextResponse.json({
    data: entries.map((entry) => ({
      id: entry.id,
      entryType: entry.entryType,
      amountCents: entry.amountCents.toString(),
      balanceAfterCents: entry.balanceAfterCents.toString(),
      description: entry.description,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      createdAt: entry.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    currentBalance: escrowAccount.balanceCents.toString(),
  });
}

