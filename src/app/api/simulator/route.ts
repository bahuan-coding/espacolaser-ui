import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InstallmentStatus, LedgerEntryType, DrawdownReason, CardChargeStatus } from "@/generated/prisma";

type EventType = 
  | "pay_installment" 
  | "mark_late" 
  | "mark_defaulted" 
  | "execute_drawdown"
  | "attempt_fallback_charge"
  | "process_reconciliation";

interface SimulatorRequest {
  event: EventType;
  installmentId?: string;
  contractId?: string;
  amount?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SimulatorRequest = await request.json();
    const { event, installmentId, contractId } = body;

    switch (event) {
      case "pay_installment":
        return await payInstallment(installmentId!);
      case "mark_late":
        return await markLate(installmentId!);
      case "mark_defaulted":
        return await markDefaulted(installmentId!);
      case "execute_drawdown":
        return await executeDrawdown(installmentId!);
      case "attempt_fallback_charge":
        return await attemptFallbackCharge(installmentId!);
      case "process_reconciliation":
        return await processReconciliation();
      default:
        return NextResponse.json({ error: "Unknown event type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Simulator error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

async function payInstallment(installmentId: string) {
  const installment = await prisma.contractInstallment.findUnique({
    where: { id: installmentId },
    include: {
      contract: {
        include: {
          merchant: true,
          disbursements: { where: { status: "posted" } }
        }
      }
    }
  });

  if (!installment) {
    return NextResponse.json({ error: "Installment not found" }, { status: 404 });
  }

  if (installment.status === InstallmentStatus.paid) {
    return NextResponse.json({ error: "Already paid" }, { status: 400 });
  }

  const now = new Date();

  // Update installment to paid
  await prisma.contractInstallment.update({
    where: { id: installmentId },
    data: {
      status: InstallmentStatus.paid,
      paidAt: now,
      paidAmountCents: installment.amountCents,
      daysOverdue: Math.max(0, Math.floor((now.getTime() - installment.dueDate.getTime()) / (24 * 60 * 60 * 1000)))
    }
  });

  // If contract has disbursement, create fund repayment
  if (installment.contract.disbursements.length > 0 && installment.installmentNumber > 1) {
    const fund = await prisma.fund.findFirst({ where: { isActive: true } });
    if (fund) {
      await prisma.fundRepayment.create({
        data: {
          fundId: fund.id,
          installmentId,
          amountCents: installment.amountCents,
          repaidAt: now,
          source: "installment_payment"
        }
      });
    }
  }

  // Create domain event
  await prisma.domainEvent.create({
    data: {
      eventType: "biz.installment.paid",
      source: "simulator",
      target: "a55",
      payload: { installmentId, amount: Number(installment.amountCents) },
      status: "delivered",
      deliveredAt: now
    }
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "pay_installment",
      actorType: "simulator",
      entityType: "installment",
      entityId: installmentId,
      payload: { amount: Number(installment.amountCents) }
    }
  });

  return NextResponse.json({
    success: true,
    message: `Parcela ${installment.installmentNumber} paga com sucesso`,
    data: { installmentId, status: "paid", paidAt: now }
  });
}

async function markLate(installmentId: string) {
  const installment = await prisma.contractInstallment.findUnique({
    where: { id: installmentId }
  });

  if (!installment) {
    return NextResponse.json({ error: "Installment not found" }, { status: 404 });
  }

  const now = new Date();
  const daysOverdue = Math.max(1, Math.floor((now.getTime() - installment.dueDate.getTime()) / (24 * 60 * 60 * 1000)));

  await prisma.contractInstallment.update({
    where: { id: installmentId },
    data: {
      status: InstallmentStatus.late,
      daysOverdue
    }
  });

  await prisma.domainEvent.create({
    data: {
      eventType: "biz.installment.late",
      source: "simulator",
      target: "a55",
      payload: { installmentId, daysOverdue },
      status: "delivered",
      deliveredAt: now
    }
  });

  return NextResponse.json({
    success: true,
    message: `Parcela marcada como atrasada (${daysOverdue} dias)`,
    data: { installmentId, status: "late", daysOverdue }
  });
}

async function markDefaulted(installmentId: string) {
  const installment = await prisma.contractInstallment.findUnique({
    where: { id: installmentId },
    include: { contract: true }
  });

  if (!installment) {
    return NextResponse.json({ error: "Installment not found" }, { status: 404 });
  }

  const now = new Date();
  const daysOverdue = Math.max(61, Math.floor((now.getTime() - installment.dueDate.getTime()) / (24 * 60 * 60 * 1000)));

  await prisma.contractInstallment.update({
    where: { id: installmentId },
    data: {
      status: InstallmentStatus.defaulted,
      daysOverdue
    }
  });

  // Update contract eligibility if needed
  if (installment.installmentNumber === 2) {
    await prisma.serviceContract.update({
      where: { id: installment.contractId },
      data: { eligibilityStatus: "ineligible" }
    });
  }

  await prisma.domainEvent.create({
    data: {
      eventType: "biz.installment.defaulted",
      source: "simulator",
      target: "a55",
      payload: { installmentId, daysOverdue },
      status: "delivered",
      deliveredAt: now
    }
  });

  return NextResponse.json({
    success: true,
    message: `Parcela marcada como inadimplente (${daysOverdue} dias)`,
    data: { installmentId, status: "defaulted", daysOverdue }
  });
}

async function executeDrawdown(installmentId: string) {
  const installment = await prisma.contractInstallment.findUnique({
    where: { id: installmentId },
    include: {
      contract: {
        include: {
          merchant: true,
          disbursements: { where: { status: "posted" } }
        }
      }
    }
  });

  if (!installment) {
    return NextResponse.json({ error: "Installment not found" }, { status: 404 });
  }

  if (!["late", "defaulted"].includes(installment.status)) {
    return NextResponse.json({ error: "Installment must be late or defaulted" }, { status: 400 });
  }

  if (installment.contract.disbursements.length === 0) {
    return NextResponse.json({ error: "Contract has no disbursement" }, { status: 400 });
  }

  // Get escrow account
  const escrowAccount = await prisma.escrowAccount.findFirst({
    where: { merchantId: installment.contract.merchantId, isActive: true }
  });

  if (!escrowAccount) {
    return NextResponse.json({ error: "No escrow account found" }, { status: 400 });
  }

  if (escrowAccount.balanceCents < installment.amountCents) {
    return NextResponse.json({ 
      error: "Insufficient escrow balance",
      details: {
        required: Number(installment.amountCents) / 100,
        available: Number(escrowAccount.balanceCents) / 100
      }
    }, { status: 400 });
  }

  const now = new Date();
  const newBalance = escrowAccount.balanceCents - installment.amountCents;

  // Create drawdown
  const drawdown = await prisma.escrowDrawdown.create({
    data: {
      escrowAccountId: escrowAccount.id,
      amountCents: installment.amountCents,
      reason: installment.status === "defaulted" ? DrawdownReason.default_coverage : DrawdownReason.late_payment,
      referenceType: "installment",
      referenceId: installmentId,
      description: `Cobertura ${installment.status} - Parcela ${installment.installmentNumber}`,
      executedAt: now
    }
  });

  // Create ledger entry
  await prisma.escrowLedgerEntry.create({
    data: {
      escrowAccountId: escrowAccount.id,
      entryType: LedgerEntryType.debit,
      amountCents: installment.amountCents,
      balanceAfterCents: newBalance,
      description: `Débito drawdown - Parcela ${installment.installmentNumber}`,
      referenceType: "drawdown",
      referenceId: drawdown.id
    }
  });

  // Update escrow balance
  await prisma.escrowAccount.update({
    where: { id: escrowAccount.id },
    data: { balanceCents: newBalance }
  });

  await prisma.domainEvent.create({
    data: {
      eventType: "a55.escrow.drawdown",
      source: "simulator",
      target: "fidc",
      payload: { drawdownId: drawdown.id, installmentId, amount: Number(installment.amountCents) },
      status: "delivered",
      deliveredAt: now
    }
  });

  return NextResponse.json({
    success: true,
    message: `Drawdown executado: R$ ${Number(installment.amountCents) / 100}`,
    data: {
      drawdownId: drawdown.id,
      amount: Number(installment.amountCents) / 100,
      newBalance: Number(newBalance) / 100
    }
  });
}

async function attemptFallbackCharge(installmentId: string) {
  const installment = await prisma.contractInstallment.findUnique({
    where: { id: installmentId },
    include: {
      contract: {
        include: { tokenizedCard: true }
      },
      chargeAttempts: { orderBy: { attemptNumber: "desc" }, take: 1 }
    }
  });

  if (!installment) {
    return NextResponse.json({ error: "Installment not found" }, { status: 404 });
  }

  if (!installment.contract.tokenizedCard) {
    return NextResponse.json({ error: "No tokenized card for fallback" }, { status: 400 });
  }

  if (installment.contract.tokenizedCard.tokenizationStatus !== "success") {
    return NextResponse.json({ error: "Tokenized card is not valid" }, { status: 400 });
  }

  const now = new Date();
  const attemptNumber = (installment.chargeAttempts[0]?.attemptNumber ?? 0) + 1;

  // Simulate 30% success rate
  const success = Math.random() < 0.3;

  const charge = await prisma.tokenizedCardCharge.create({
    data: {
      tokenizedCardId: installment.contract.tokenizedCard.id,
      installmentId,
      amountCents: installment.amountCents,
      status: success ? CardChargeStatus.success : CardChargeStatus.failed,
      attemptNumber,
      gatewayReference: `CHG-${installmentId.slice(0, 8)}-${attemptNumber}`,
      failureReason: success ? null : "Insufficient funds",
      attemptedAt: now,
      processedAt: now
    }
  });

  // If success, mark installment as paid
  if (success) {
    await prisma.contractInstallment.update({
      where: { id: installmentId },
      data: {
        status: InstallmentStatus.paid,
        paidAt: now,
        paidAmountCents: installment.amountCents
      }
    });
  }

  await prisma.domainEvent.create({
    data: {
      eventType: success ? "a55.fallback_charge.success" : "a55.fallback_charge.failed",
      source: "simulator",
      target: "biz",
      payload: { chargeId: charge.id, installmentId, success, attemptNumber },
      status: "delivered",
      deliveredAt: now
    }
  });

  return NextResponse.json({
    success: true,
    message: success 
      ? `Cobrança bem-sucedida na tentativa ${attemptNumber}` 
      : `Cobrança falhou na tentativa ${attemptNumber}`,
    data: {
      chargeId: charge.id,
      attemptNumber,
      chargeSuccess: success,
      reason: success ? null : "Insufficient funds"
    }
  });
}

async function processReconciliation() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all paid installments in last 30 days
  const paidInstallments = await prisma.contractInstallment.findMany({
    where: {
      status: InstallmentStatus.paid,
      paidAt: { gte: thirtyDaysAgo }
    }
  });

  if (paidInstallments.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No installments to reconcile",
      data: { matched: 0, mismatched: 0 }
    });
  }

  // Create reconciliation file
  const file = await prisma.reconciliationFile.create({
    data: {
      fileName: `BIZ_RECON_SIM_${now.toISOString().slice(0, 10).replace(/-/g, "")}.csv`,
      fileHash: `sha256:sim_${Date.now()}`,
      source: "simulator",
      periodStart: thirtyDaysAgo,
      periodEnd: now,
      totalRecords: paidInstallments.length,
      status: "pending"
    }
  });

  let matched = 0;
  let mismatched = 0;

  // Create reconciliation items (5% mismatch rate)
  for (const inst of paidInstallments) {
    const isMismatch = Math.random() < 0.05;
    const actualAmount = isMismatch
      ? inst.amountCents + BigInt(Math.floor(Math.random() * 1000) - 500)
      : inst.amountCents;

    await prisma.reconciliationItem.create({
      data: {
        fileId: file.id,
        installmentId: inst.id,
        externalReference: `BIZ-SIM-${inst.id.slice(0, 8)}`,
        expectedAmountCents: inst.amountCents,
        actualAmountCents: actualAmount,
        status: isMismatch ? "mismatched" : "matched",
        mismatchReason: isMismatch ? "Valor divergente" : null
      }
    });

    if (isMismatch) mismatched++;
    else matched++;
  }

  // Update file with counts
  await prisma.reconciliationFile.update({
    where: { id: file.id },
    data: {
      matchedCount: matched,
      mismatchedCount: mismatched,
      status: mismatched > 0 ? "mismatched" : "matched",
      processedAt: now
    }
  });

  return NextResponse.json({
    success: true,
    message: `Conciliação processada: ${matched} ok, ${mismatched} divergentes`,
    data: { fileId: file.id, matched, mismatched, total: paidInstallments.length }
  });
}

export async function GET() {
  // Return available events and their descriptions
  return NextResponse.json({
    events: [
      { type: "pay_installment", description: "Marca parcela como paga e cria repagamento ao fundo", requires: "installmentId" },
      { type: "mark_late", description: "Marca parcela como atrasada (1-60 dias)", requires: "installmentId" },
      { type: "mark_defaulted", description: "Marca parcela como inadimplente (>60 dias)", requires: "installmentId" },
      { type: "execute_drawdown", description: "Executa drawdown do escrow para cobrir parcela", requires: "installmentId" },
      { type: "attempt_fallback_charge", description: "Tenta cobrar no cartão tokenizado (30% sucesso)", requires: "installmentId" },
      { type: "process_reconciliation", description: "Processa conciliação simulada dos últimos 30 dias", requires: null }
    ]
  });
}

