import { prisma } from "@/lib/prisma";
import {
  PaymentEventType,
  PaymentMethod,
  PaymentMatchStatus,
  InstallmentStatus,
  LedgerEntryType,
  DrawdownReason,
} from "@/generated/prisma";
import { paymentMatcher, type MatchResult } from "./payment-matcher";
import { fileParser, type ParsedPaymentRecord } from "./file-parser";

export interface ProcessPaymentResult {
  paymentEventId: string;
  matched: boolean;
  installmentId?: string;
  actions: string[];
  error?: string;
}

export interface ProcessFileResult {
  returnFileId: string;
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  errors: string[];
  results: ProcessPaymentResult[];
}

export class PaymentProcessor {
  /**
   * Process a return file - parse, match, and apply payments
   */
  async processReturnFile(
    fileId: string,
    content: string,
    fileType: string
  ): Promise<ProcessFileResult> {
    const result: ProcessFileResult = {
      returnFileId: fileId,
      totalRecords: 0,
      matchedRecords: 0,
      unmatchedRecords: 0,
      errors: [],
      results: [],
    };

    // Update file status to processing
    await prisma.returnFile.update({
      where: { id: fileId },
      data: { status: "processing" },
    });

    try {
      // Parse the file
      const parseResult = fileParser.parse(content, fileType as any);
      result.totalRecords = parseResult.records.length;

      if (!parseResult.success && parseResult.records.length === 0) {
        throw new Error(parseResult.errors.map((e) => e.message).join(", "));
      }

      // Process each payment record
      for (const record of parseResult.records) {
        try {
          const paymentResult = await this.processPaymentRecord(record, fileId);
          result.results.push(paymentResult);

          if (paymentResult.matched) {
            result.matchedRecords++;
          } else {
            result.unmatchedRecords++;
          }
        } catch (error) {
          result.errors.push(
            `Linha ${record.lineNumber}: ${error instanceof Error ? error.message : "Erro desconhecido"}`
          );
        }
      }

      // Update file with results
      await prisma.returnFile.update({
        where: { id: fileId },
        data: {
          status: "processed",
          totalRecords: result.totalRecords,
          matchedRecords: result.matchedRecords,
          unmatchedRecords: result.unmatchedRecords,
          processedAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      await prisma.returnFile.update({
        where: { id: fileId },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
        },
      });
      throw error;
    }
  }

  /**
   * Process a single payment record from file
   */
  private async processPaymentRecord(
    record: ParsedPaymentRecord,
    returnFileId: string
  ): Promise<ProcessPaymentResult> {
    // Try to find matching installment
    const matchResult = await paymentMatcher.findMatch({
      externalReference: record.externalReference,
      customerDocument: record.customerDocument,
      customerName: record.customerName,
      barcode: record.barcode,
      pixKey: record.pixKey,
      amountCents: record.amountCents,
      paymentDate: record.paymentDate,
    });

    // Create payment event
    const paymentEvent = await prisma.paymentEvent.create({
      data: {
        returnFileId,
        installmentId: matchResult.matched ? matchResult.installmentId : null,
        externalReference: record.externalReference,
        customerDocument: record.customerDocument,
        customerName: record.customerName,
        barcode: record.barcode,
        pixKey: record.pixKey,
        expectedAmountCents: matchResult.matched
          ? matchResult.candidates[0]?.amountCents || record.amountCents
          : record.amountCents,
        paidAmountCents: record.amountCents,
        netAmountCents: record.amountCents,
        eventType: record.eventType,
        paymentMethod: record.paymentMethod,
        matchStatus: matchResult.matched
          ? PaymentMatchStatus.auto_matched
          : PaymentMatchStatus.pending,
        matchedBy: matchResult.matched ? "auto" : null,
        matchedAt: matchResult.matched ? new Date() : null,
        matchConfidence: matchResult.confidence,
        paymentDate: record.paymentDate,
        settlementDate: record.settlementDate,
        processedAt: new Date(),
      },
    });

    const actions: string[] = [];

    // If matched, apply the payment
    if (matchResult.matched && matchResult.installmentId) {
      await this.applyPaymentToInstallment(
        matchResult.installmentId,
        record.amountCents,
        record.paymentDate,
        record.eventType,
        actions
      );
    }

    return {
      paymentEventId: paymentEvent.id,
      matched: matchResult.matched,
      installmentId: matchResult.installmentId,
      actions,
    };
  }

  /**
   * Create a manual payment (baixa manual)
   */
  async createManualPayment(data: {
    installmentId: string;
    eventType: PaymentEventType;
    paymentMethod: PaymentMethod;
    paidAmountCents: bigint;
    paymentDate: Date;
    observations?: string;
    createdBy?: string;
  }): Promise<ProcessPaymentResult> {
    const installment = await prisma.contractInstallment.findUnique({
      where: { id: data.installmentId },
      include: {
        contract: {
          include: {
            endCustomer: true,
            disbursements: { where: { status: "posted" } },
          },
        },
      },
    });

    if (!installment) {
      throw new Error("Parcela não encontrada");
    }

    if (installment.status === InstallmentStatus.paid) {
      throw new Error("Parcela já está paga");
    }

    if (installment.status === InstallmentStatus.cancelled) {
      throw new Error("Parcela cancelada");
    }

    // Create payment event
    const paymentEvent = await prisma.paymentEvent.create({
      data: {
        installmentId: data.installmentId,
        customerDocument: installment.contract.endCustomer.document,
        customerName: installment.contract.endCustomer.name,
        expectedAmountCents: installment.amountCents,
        paidAmountCents: data.paidAmountCents,
        netAmountCents: data.paidAmountCents,
        eventType: data.eventType,
        paymentMethod: data.paymentMethod,
        matchStatus: PaymentMatchStatus.manual_matched,
        matchedBy: data.createdBy || "admin",
        matchedAt: new Date(),
        matchConfidence: 1.0,
        paymentDate: data.paymentDate,
        processedAt: new Date(),
        observations: data.observations,
        createdBy: data.createdBy,
      },
    });

    const actions: string[] = [];

    // Apply the payment
    await this.applyPaymentToInstallment(
      data.installmentId,
      data.paidAmountCents,
      data.paymentDate,
      data.eventType,
      actions
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "manual_payment",
        actorType: "user",
        actorId: data.createdBy,
        entityType: "installment",
        entityId: data.installmentId,
        payload: {
          paymentEventId: paymentEvent.id,
          eventType: data.eventType,
          paymentMethod: data.paymentMethod,
          amount: Number(data.paidAmountCents),
        },
      },
    });

    // Create domain event
    await prisma.domainEvent.create({
      data: {
        eventType: `biz.installment.${data.eventType}`,
        source: "admin",
        target: "a55",
        payload: {
          installmentId: data.installmentId,
          paymentEventId: paymentEvent.id,
          amount: Number(data.paidAmountCents),
        },
        status: "delivered",
        deliveredAt: new Date(),
      },
    });

    return {
      paymentEventId: paymentEvent.id,
      matched: true,
      installmentId: data.installmentId,
      actions,
    };
  }

  /**
   * Apply payment to installment and trigger side effects
   */
  private async applyPaymentToInstallment(
    installmentId: string,
    paidAmountCents: bigint,
    paymentDate: Date,
    eventType: PaymentEventType,
    actions: string[]
  ): Promise<void> {
    const installment = await prisma.contractInstallment.findUnique({
      where: { id: installmentId },
      include: {
        contract: {
          include: {
            merchant: true,
            disbursements: { where: { status: "posted" } },
          },
        },
      },
    });

    if (!installment) return;

    const daysOverdue = Math.max(
      0,
      Math.floor((paymentDate.getTime() - installment.dueDate.getTime()) / (24 * 60 * 60 * 1000))
    );

    // Determine new status based on payment type
    let newStatus: InstallmentStatus;
    let newPaidAmount = paidAmountCents;

    switch (eventType) {
      case PaymentEventType.full_payment:
      case PaymentEventType.overpayment:
      case PaymentEventType.late_payment:
        newStatus = InstallmentStatus.paid;
        break;
      case PaymentEventType.partial_payment:
        // Add to existing paid amount
        const existingPaid = installment.paidAmountCents || BigInt(0);
        newPaidAmount = existingPaid + paidAmountCents;
        if (newPaidAmount >= installment.amountCents) {
          newStatus = InstallmentStatus.paid;
        } else {
          newStatus = daysOverdue > 0 ? InstallmentStatus.late : InstallmentStatus.scheduled;
        }
        break;
      case PaymentEventType.write_off:
        newStatus = InstallmentStatus.cancelled;
        break;
      case PaymentEventType.refund:
      case PaymentEventType.chargeback:
        // Revert payment
        newStatus = InstallmentStatus.scheduled;
        newPaidAmount = BigInt(0);
        break;
      default:
        newStatus = installment.status;
    }

    // Update installment
    await prisma.contractInstallment.update({
      where: { id: installmentId },
      data: {
        status: newStatus,
        paidAt: newStatus === InstallmentStatus.paid ? paymentDate : null,
        paidAmountCents: newPaidAmount,
        daysOverdue,
      },
    });
    actions.push(`Status atualizado para ${newStatus}`);

    // If paid and contract has disbursement, create fund repayment
    if (
      newStatus === InstallmentStatus.paid &&
      installment.contract.disbursements.length > 0 &&
      installment.installmentNumber > 1
    ) {
      const fund = await prisma.fund.findFirst({ where: { isActive: true } });
      if (fund) {
        await prisma.fundRepayment.create({
          data: {
            fundId: fund.id,
            installmentId,
            amountCents: paidAmountCents,
            repaidAt: paymentDate,
            source: "installment_payment",
          },
        });
        actions.push("Repagamento ao fundo criado");
      }
    }

    // Update contract eligibility if this is 1st or 2nd installment
    if (installment.installmentNumber === 1 && newStatus === InstallmentStatus.paid) {
      await prisma.serviceContract.update({
        where: { id: installment.contractId },
        data: {
          firstInstallmentPaidAt: paymentDate,
          eligibilityStatus: "pending_second_installment",
        },
      });
      actions.push("Contrato atualizado para pending_second_installment");
    }

    if (installment.installmentNumber === 2 && newStatus === InstallmentStatus.paid) {
      const eligibility = daysOverdue <= 60 ? "eligible" : "eligible_late";
      await prisma.serviceContract.update({
        where: { id: installment.contractId },
        data: {
          secondInstallmentPaidAt: paymentDate,
          eligibilityStatus: eligibility,
        },
      });
      actions.push(`Contrato atualizado para ${eligibility}`);

      // If late, mark as contributing to sub quota
      if (daysOverdue > 0 && daysOverdue <= 60) {
        await prisma.contractInstallment.update({
          where: { id: installmentId },
          data: { contributesToSubQuota: true },
        });

        const fund = await prisma.fund.findFirst({ where: { isActive: true } });
        if (fund) {
          await prisma.fundQuotaContribution.create({
            data: {
              fundId: fund.id,
              installmentId,
              amountCents: paidAmountCents,
              quotaType: "sub",
              reason: "late_second_installment",
              contributedAt: paymentDate,
            },
          });
          actions.push("Contribuição para cota Sub registrada");
        }
      }
    }
  }

  /**
   * Match an unmatched payment to an installment manually
   */
  async matchPaymentToInstallment(
    paymentEventId: string,
    installmentId: string,
    matchedBy: string
  ): Promise<ProcessPaymentResult> {
    const paymentEvent = await prisma.paymentEvent.findUnique({
      where: { id: paymentEventId },
    });

    if (!paymentEvent) {
      throw new Error("Pagamento não encontrado");
    }

    if (paymentEvent.matchStatus === PaymentMatchStatus.manual_matched) {
      throw new Error("Pagamento já está vinculado");
    }

    // Update payment event
    await prisma.paymentEvent.update({
      where: { id: paymentEventId },
      data: {
        installmentId,
        matchStatus: PaymentMatchStatus.manual_matched,
        matchedBy,
        matchedAt: new Date(),
        matchConfidence: 1.0,
      },
    });

    const actions: string[] = ["Pagamento vinculado manualmente"];

    // Apply the payment
    await this.applyPaymentToInstallment(
      installmentId,
      paymentEvent.paidAmountCents,
      paymentEvent.paymentDate,
      paymentEvent.eventType,
      actions
    );

    return {
      paymentEventId,
      matched: true,
      installmentId,
      actions,
    };
  }
}

export const paymentProcessor = new PaymentProcessor();

