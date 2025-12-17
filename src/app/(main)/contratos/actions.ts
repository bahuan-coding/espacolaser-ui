"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { 
  ContractEligibilityStatus, 
  InstallmentOrigin, 
  InstallmentStatus,
  TokenizationStatus,
  PlCardIssuanceStatus,
  DisbursementStatus,
  LedgerEntryType
} from "@/generated/prisma";

// Helpers
const generateContractNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CTR-${timestamp}-${random}`;
};

const generateToken = (prefix: string) => 
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

// ============================================================================
// CREATE CONTRACT
// ============================================================================

export interface CreateContractInput {
  // Customer data
  customerName: string;
  customerDocument: string; // CPF
  customerEmail?: string;
  customerPhone?: string;
  // Contract data
  description: string;
  totalAmountCents: number;
  numberOfInstallments: number;
  startDate: string; // ISO date
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createContract(
  input: CreateContractInput
): Promise<ActionResult<{ contractId: string; contractNumber: string }>> {
  try {
    // Get merchant (in production, from session)
    const merchant = await prisma.merchant.findFirst({
      where: { isActive: true },
    });

    if (!merchant) {
      return { success: false, error: "Lojista não encontrado" };
    }

    // Find or create customer
    let customer = await prisma.endCustomer.findUnique({
      where: { document: input.customerDocument },
    });

    if (!customer) {
      customer = await prisma.endCustomer.create({
        data: {
          name: input.customerName,
          document: input.customerDocument,
          email: input.customerEmail,
          phone: input.customerPhone,
        },
      });
    }

    const contractNumber = generateContractNumber();
    const startDate = new Date(input.startDate);
    const installmentValue = Math.floor(input.totalAmountCents / input.numberOfInstallments);

    // Create contract with installments
    const contract = await prisma.serviceContract.create({
      data: {
        merchantId: merchant.id,
        endCustomerId: customer.id,
        contractNumber,
        description: input.description,
        totalAmountCents: BigInt(input.totalAmountCents),
        numberOfInstallments: input.numberOfInstallments,
        startDate,
        endDate: addMonths(startDate, input.numberOfInstallments),
        eligibilityStatus: ContractEligibilityStatus.pending_first_installment,
        installments: {
          create: Array.from({ length: input.numberOfInstallments }, (_, i) => ({
            installmentNumber: i + 1,
            amountCents: BigInt(installmentValue),
            dueDate: addMonths(startDate, i + 1),
            status: InstallmentStatus.scheduled,
            origin: i === 0 ? InstallmentOrigin.external_capture : InstallmentOrigin.private_label,
          })),
        },
      },
    });

    // Create audit event
    await prisma.domainEvent.create({
      data: {
        eventType: "contract.created",
        source: "portal",
        target: "a55",
        payload: { contractId: contract.id, merchantId: merchant.id },
        status: "delivered",
        deliveredAt: new Date(),
      },
    });

    revalidatePath("/contratos");
    revalidatePath("/clientes");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { contractId: contract.id, contractNumber },
    };
  } catch (error) {
    console.error("createContract error:", error);
    return { success: false, error: "Erro ao criar contrato. Tente novamente." };
  }
}

// ============================================================================
// GENERATE PAYMENT LINK (1st installment)
// ============================================================================

export async function generatePaymentLink(
  contractId: string
): Promise<ActionResult<{ paymentLink: string }>> {
  try {
    const contract = await prisma.serviceContract.findUnique({
      where: { id: contractId },
      include: {
        merchant: true,
        installments: { where: { installmentNumber: 1 } },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato não encontrado" };
    }

    if (contract.eligibilityStatus !== ContractEligibilityStatus.pending_first_installment) {
      return { success: false, error: "Contrato não está aguardando 1ª parcela" };
    }

    const firstInstallment = contract.installments[0];
    if (!firstInstallment) {
      return { success: false, error: "1ª parcela não encontrada" };
    }

    // Simulate gateway link creation
    const paymentLink = `https://pay.a55.tech/${contract.contractNumber}`;
    const gatewayTransactionId = `GW-${contract.contractNumber}-1`;

    // Create gateway transaction
    await prisma.gatewayTransaction.create({
      data: {
        merchantId: contract.merchantId,
        contractId: contract.id,
        gatewayTransactionId,
        amountCents: firstInstallment.amountCents,
        status: "pending",
        paymentLink,
        processedAt: new Date(),
      },
    });

    // Update installment with gateway reference
    await prisma.contractInstallment.update({
      where: { id: firstInstallment.id },
      data: { gatewayTransactionId },
    });

    // Create audit event
    await prisma.domainEvent.create({
      data: {
        eventType: "gateway.payment_link.created",
        source: "a55",
        target: "gateway",
        payload: { contractId, installmentId: firstInstallment.id, link: paymentLink },
        status: "delivered",
        deliveredAt: new Date(),
      },
    });

    revalidatePath(`/contratos/${contractId}`);

    return { success: true, data: { paymentLink } };
  } catch (error) {
    console.error("generatePaymentLink error:", error);
    return { success: false, error: "Erro ao gerar link de pagamento" };
  }
}

// ============================================================================
// CONFIRM PAYMENT (simulates webhook - tokenizes card + issues PL)
// ============================================================================

export async function confirmPayment(
  contractId: string
): Promise<ActionResult> {
  try {
    const contract = await prisma.serviceContract.findUnique({
      where: { id: contractId },
      include: {
        endCustomer: true,
        installments: { where: { installmentNumber: 1 } },
        gatewayTransactions: { where: { status: "pending" } },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato não encontrado" };
    }

    if (contract.eligibilityStatus !== ContractEligibilityStatus.pending_first_installment) {
      return { success: false, error: "Contrato já processado" };
    }

    const firstInstallment = contract.installments[0];
    const gatewayTransaction = contract.gatewayTransactions[0];

    if (!firstInstallment || !gatewayTransaction) {
      return { success: false, error: "Dados de pagamento não encontrados" };
    }

    const now = new Date();

    // 1. Update gateway transaction
    await prisma.gatewayTransaction.update({
      where: { id: gatewayTransaction.id },
      data: {
        status: "settled",
        authorizationCode: `AUTH${Date.now().toString().slice(-6)}`,
        processedAt: now,
      },
    });

    // 2. Mark installment as paid
    await prisma.contractInstallment.update({
      where: { id: firstInstallment.id },
      data: {
        status: InstallmentStatus.paid,
        paidAt: now,
        paidAmountCents: firstInstallment.amountCents,
        contributesToSubQuota: true, // 1st goes to Sub quota
      },
    });

    // 3. Tokenize card
    const tokenizedCard = await prisma.tokenizedCard.create({
      data: {
        endCustomerId: contract.endCustomerId,
        cardToken: generateToken("tok"),
        lastFourDigits: String(Math.floor(1000 + Math.random() * 9000)),
        brand: ["visa", "mastercard", "elo"][Math.floor(Math.random() * 3)],
        expirationMonth: Math.floor(1 + Math.random() * 12),
        expirationYear: 2027 + Math.floor(Math.random() * 3),
        tokenizationStatus: TokenizationStatus.success,
        tokenizedAt: now,
      },
    });

    // 4. Issue PL card
    const remainingValue = contract.totalAmountCents - firstInstallment.amountCents;
    const plCard = await prisma.privateLabelCard.create({
      data: {
        endCustomerId: contract.endCustomerId,
        contractId: contract.id,
        bizCardId: `BIZ-${contract.contractNumber}`,
        cardToken: generateToken("pl"),
        lastFourDigits: String(Math.floor(1000 + Math.random() * 9000)),
        expirationMonth: Math.floor(1 + Math.random() * 12),
        expirationYear: 2027 + Math.floor(Math.random() * 3),
        creditLimitCents: remainingValue,
        issuanceStatus: PlCardIssuanceStatus.issued,
        issuedAt: now,
      },
    });

    // 5. Update contract
    await prisma.serviceContract.update({
      where: { id: contractId },
      data: {
        eligibilityStatus: ContractEligibilityStatus.pending_second_installment,
        firstInstallmentPaidAt: now,
        tokenizedCardId: tokenizedCard.id,
      },
    });

    // 6. Create audit events
    await prisma.domainEvent.createMany({
      data: [
        {
          eventType: "gateway.transaction.captured",
          source: "gateway",
          target: "a55",
          payload: { contractId, amount: Number(firstInstallment.amountCents) },
          status: "delivered",
          deliveredAt: now,
        },
        {
          eventType: "gateway.card.tokenized",
          source: "gateway",
          target: "a55",
          payload: { contractId, tokenId: tokenizedCard.id },
          status: "delivered",
          deliveredAt: now,
        },
        {
          eventType: "biz.pl_card.issued",
          source: "biz",
          target: "a55",
          payload: { contractId, cardId: plCard.id },
          status: "delivered",
          deliveredAt: now,
        },
      ],
    });

    revalidatePath(`/contratos/${contractId}`);
    revalidatePath("/contratos");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("confirmPayment error:", error);
    return { success: false, error: "Erro ao confirmar pagamento" };
  }
}

// ============================================================================
// SIMULATE SECOND INSTALLMENT PAYMENT (for testing eligibility)
// ============================================================================

export async function simulateSecondPayment(
  contractId: string,
  daysLate: number = 0
): Promise<ActionResult> {
  try {
    const contract = await prisma.serviceContract.findUnique({
      where: { id: contractId },
      include: {
        installments: { where: { installmentNumber: 2 } },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato não encontrado" };
    }

    if (contract.eligibilityStatus !== ContractEligibilityStatus.pending_second_installment) {
      return { success: false, error: "Contrato não está aguardando 2ª parcela" };
    }

    const secondInstallment = contract.installments[0];
    if (!secondInstallment) {
      return { success: false, error: "2ª parcela não encontrada" };
    }

    const now = new Date();
    const isLate = daysLate > 0;
    const isEligible = daysLate <= 60;

    // Update installment
    await prisma.contractInstallment.update({
      where: { id: secondInstallment.id },
      data: {
        status: InstallmentStatus.paid,
        paidAt: now,
        paidAmountCents: secondInstallment.amountCents,
        daysOverdue: daysLate,
        contributesToSubQuota: isLate, // Late 2nd goes to Sub quota
      },
    });

    // Update contract eligibility
    await prisma.serviceContract.update({
      where: { id: contractId },
      data: {
        eligibilityStatus: isEligible
          ? (isLate ? ContractEligibilityStatus.eligible_late : ContractEligibilityStatus.eligible)
          : ContractEligibilityStatus.ineligible,
        secondInstallmentPaidAt: now,
      },
    });

    // Create audit event
    await prisma.domainEvent.create({
      data: {
        eventType: isEligible ? "biz.disbursement.eligible" : "biz.installment.late",
        source: "biz",
        target: "a55",
        payload: { contractId, daysLate, eligible: isEligible },
        status: "delivered",
        deliveredAt: now,
      },
    });

    revalidatePath(`/contratos/${contractId}`);
    revalidatePath("/contratos");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("simulateSecondPayment error:", error);
    return { success: false, error: "Erro ao simular pagamento" };
  }
}

// ============================================================================
// REQUEST ADVANCE (antecipação)
// ============================================================================

export async function requestAdvance(
  contractId: string
): Promise<ActionResult<{ merchantAmount: number; escrowAmount: number }>> {
  try {
    const contract = await prisma.serviceContract.findUnique({
      where: { id: contractId },
      include: {
        merchant: {
          include: {
            escrowAccounts: { where: { isActive: true }, take: 1 },
          },
        },
        installments: { where: { installmentNumber: 1 } },
        disbursements: true,
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato não encontrado" };
    }

    if (
      contract.eligibilityStatus !== ContractEligibilityStatus.eligible &&
      contract.eligibilityStatus !== ContractEligibilityStatus.eligible_late
    ) {
      return { success: false, error: "Contrato não elegível para antecipação" };
    }

    if (contract.disbursements.length > 0) {
      return { success: false, error: "Contrato já foi antecipado" };
    }

    const escrowAccount = contract.merchant.escrowAccounts[0];
    if (!escrowAccount) {
      return { success: false, error: "Conta escrow não encontrada" };
    }

    // Get fund
    const fund = await prisma.fund.findFirst({ where: { isActive: true } });
    if (!fund) {
      return { success: false, error: "Fundo não encontrado" };
    }

    const firstInstallmentAmount = contract.installments[0]?.amountCents ?? 0n;
    const remainingValue = contract.totalAmountCents - firstInstallmentAmount;
    const merchantAmount = (remainingValue * 70n) / 100n;
    const escrowAmount = remainingValue - merchantAmount;

    const now = new Date();

    // Create disbursement with splits
    const disbursement = await prisma.fundDisbursement.create({
      data: {
        fundId: fund.id,
        contractId: contract.id,
        totalAmountCents: remainingValue,
        merchantAmountCents: merchantAmount,
        escrowAmountCents: escrowAmount,
        status: DisbursementStatus.posted,
        disbursedAt: now,
        splits: {
          create: [
            { recipientType: "merchant", amountCents: merchantAmount, percentage: 70.0 },
            { recipientType: "escrow", amountCents: escrowAmount, percentage: 30.0 },
          ],
        },
      },
    });

    // Update escrow balance
    const newBalance = escrowAccount.balanceCents + escrowAmount;
    await prisma.escrowAccount.update({
      where: { id: escrowAccount.id },
      data: { balanceCents: newBalance },
    });

    // Create escrow ledger entry
    await prisma.escrowLedgerEntry.create({
      data: {
        escrowAccountId: escrowAccount.id,
        entryType: LedgerEntryType.credit,
        amountCents: escrowAmount,
        balanceAfterCents: newBalance,
        description: `Crédito split 30% - ${contract.contractNumber}`,
        referenceType: "disbursement_split",
        referenceId: disbursement.id,
      },
    });

    // Update contract status
    await prisma.serviceContract.update({
      where: { id: contractId },
      data: { eligibilityStatus: ContractEligibilityStatus.disbursed },
    });

    // Create audit events
    await prisma.domainEvent.createMany({
      data: [
        {
          eventType: "a55.disbursement.requested",
          source: "portal",
          target: "fidc",
          payload: { contractId, amount: Number(remainingValue) },
          status: "delivered",
          deliveredAt: now,
        },
        {
          eventType: "a55.disbursement.posted",
          source: "a55",
          target: "fidc",
          payload: { contractId, disbursementId: disbursement.id },
          status: "delivered",
          deliveredAt: now,
        },
        {
          eventType: "a55.escrow.credited",
          source: "a55",
          target: "escrow",
          payload: { contractId, amount: Number(escrowAmount) },
          status: "delivered",
          deliveredAt: now,
        },
      ],
    });

    revalidatePath(`/contratos/${contractId}`);
    revalidatePath("/contratos");
    revalidatePath("/extrato");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        merchantAmount: Number(merchantAmount),
        escrowAmount: Number(escrowAmount),
      },
    };
  } catch (error) {
    console.error("requestAdvance error:", error);
    return { success: false, error: "Erro ao solicitar antecipação" };
  }
}

