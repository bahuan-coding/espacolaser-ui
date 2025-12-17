import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // For now, we'll use the first merchant (in production, get from session)
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const [escrowAccount, disbursements, lateInstallments, recentLedger] =
    await Promise.all([
      // Saldo Escrow
      prisma.escrowAccount.findFirst({
        where: { merchantId: merchant.id, isActive: true },
        select: { id: true, balanceCents: true },
      }),

      // Total desembolsado (posted)
      prisma.fundDisbursement.aggregate({
        where: {
          contract: { merchantId: merchant.id },
          status: "posted",
        },
        _sum: {
          totalAmountCents: true,
          merchantAmountCents: true,
          escrowAmountCents: true,
        },
      }),

      // Parcelas em atraso
      prisma.contractInstallment.aggregate({
        where: {
          contract: { merchantId: merchant.id },
          status: { in: ["late", "defaulted"] },
        },
        _count: true,
        _sum: { amountCents: true },
      }),

      // Últimas movimentações do ledger
      prisma.escrowLedgerEntry.findMany({
        where: {
          escrowAccount: { merchantId: merchant.id },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          entryType: true,
          amountCents: true,
          balanceAfterCents: true,
          description: true,
          referenceType: true,
          createdAt: true,
        },
      }),
    ]);

  return NextResponse.json({
    merchantId: merchant.id,
    merchantName: merchant.name,
    escrow: {
      balanceCents: escrowAccount?.balanceCents ?? 0n,
    },
    disbursements: {
      totalCents: disbursements._sum.totalAmountCents ?? 0n,
      merchantCents: disbursements._sum.merchantAmountCents ?? 0n,
      escrowCents: disbursements._sum.escrowAmountCents ?? 0n,
    },
    lateInstallments: {
      count: lateInstallments._count,
      totalCents: lateInstallments._sum.amountCents ?? 0n,
    },
    recentLedger: recentLedger.map((entry) => ({
      ...entry,
      amountCents: entry.amountCents.toString(),
      balanceAfterCents: entry.balanceAfterCents.toString(),
    })),
  });
}

