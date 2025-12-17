import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const contract = await prisma.serviceContract.findUnique({
    where: { id },
    include: {
      endCustomer: true,
      merchant: { select: { id: true, name: true } },
      plCard: {
        select: {
          id: true,
          lastFourDigits: true,
          issuanceStatus: true,
          issuedAt: true,
        },
      },
      tokenizedCard: {
        select: {
          id: true,
          lastFourDigits: true,
          brand: true,
          tokenizationStatus: true,
        },
      },
      installments: {
        orderBy: { installmentNumber: "asc" },
        include: {
          reconciliationItems: {
            select: {
              id: true,
              status: true,
              externalReference: true,
            },
          },
        },
      },
      disbursements: {
        include: {
          fund: { select: { id: true, name: true } },
          splits: true,
        },
      },
      gatewayTransactions: {
        orderBy: { processedAt: "desc" },
        take: 5,
        select: {
          id: true,
          gatewayTransactionId: true,
          amountCents: true,
          status: true,
          processedAt: true,
        },
      },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: contract.id,
    contractNumber: contract.contractNumber,
    description: contract.description,
    totalAmountCents: contract.totalAmountCents.toString(),
    numberOfInstallments: contract.numberOfInstallments,
    eligibilityStatus: contract.eligibilityStatus,
    firstInstallmentPaidAt: contract.firstInstallmentPaidAt?.toISOString(),
    secondInstallmentPaidAt: contract.secondInstallmentPaidAt?.toISOString(),
    startDate: contract.startDate.toISOString(),
    endDate: contract.endDate?.toISOString(),
    createdAt: contract.createdAt.toISOString(),
    merchant: contract.merchant,
    customer: {
      id: contract.endCustomer.id,
      name: contract.endCustomer.name,
      document: contract.endCustomer.document,
      email: contract.endCustomer.email,
      phone: contract.endCustomer.phone,
    },
    plCard: contract.plCard,
    tokenizedCard: contract.tokenizedCard,
    installments: contract.installments.map((inst) => ({
      id: inst.id,
      installmentNumber: inst.installmentNumber,
      amountCents: inst.amountCents.toString(),
      dueDate: inst.dueDate.toISOString(),
      paidAt: inst.paidAt?.toISOString(),
      paidAmountCents: inst.paidAmountCents?.toString(),
      daysOverdue: inst.daysOverdue,
      status: inst.status,
      origin: inst.origin,
      contributesToSubQuota: inst.contributesToSubQuota,
      reconciliationItems: inst.reconciliationItems,
    })),
    disbursements: contract.disbursements.map((disb) => ({
      id: disb.id,
      fundName: disb.fund.name,
      totalAmountCents: disb.totalAmountCents.toString(),
      merchantAmountCents: disb.merchantAmountCents.toString(),
      escrowAmountCents: disb.escrowAmountCents.toString(),
      status: disb.status,
      disbursedAt: disb.disbursedAt?.toISOString(),
      splits: disb.splits.map((s) => ({
        recipientType: s.recipientType,
        amountCents: s.amountCents.toString(),
        percentage: s.percentage.toString(),
      })),
    })),
    recentTransactions: contract.gatewayTransactions.map((tx) => ({
      id: tx.id,
      gatewayTransactionId: tx.gatewayTransactionId,
      amountCents: tx.amountCents.toString(),
      status: tx.status,
      processedAt: tx.processedAt.toISOString(),
    })),
  });
}

