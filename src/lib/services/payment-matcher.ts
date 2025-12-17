import { prisma } from "@/lib/prisma";
import { InstallmentStatus } from "@/generated/prisma";

export interface PaymentRecord {
  externalReference?: string;
  customerDocument?: string;
  customerName?: string;
  barcode?: string;
  pixKey?: string;
  amountCents: bigint;
  paymentDate: Date;
  settlementDate?: Date;
}

export interface InstallmentCandidate {
  id: string;
  contractId: string;
  contractNumber: string;
  installmentNumber: number;
  amountCents: bigint;
  dueDate: Date;
  customerDocument: string;
  customerName: string;
  merchantName: string;
}

export interface MatchResult {
  matched: boolean;
  installmentId?: string;
  confidence: number; // 0 to 1
  matchType?: "barcode" | "reference" | "document_amount" | "document_approximate";
  candidates: InstallmentCandidate[];
}

export class PaymentMatcher {
  /**
   * Find matching installment for a payment record
   * Priority order:
   * 1. Barcode exact match
   * 2. External reference match
   * 3. Document + exact amount + due date
   * 4. Document + approximate amount
   */
  async findMatch(record: PaymentRecord): Promise<MatchResult> {
    // Strategy 1: Barcode exact match (highest confidence)
    if (record.barcode) {
      const barcodeMatch = await this.matchByBarcode(record.barcode);
      if (barcodeMatch) {
        return {
          matched: true,
          installmentId: barcodeMatch.id,
          confidence: 1.0,
          matchType: "barcode",
          candidates: [barcodeMatch],
        };
      }
    }

    // Strategy 2: External reference match
    if (record.externalReference) {
      const refMatch = await this.matchByReference(record.externalReference);
      if (refMatch) {
        return {
          matched: true,
          installmentId: refMatch.id,
          confidence: 0.95,
          matchType: "reference",
          candidates: [refMatch],
        };
      }
    }

    // Strategy 3 & 4: Document-based matching
    if (record.customerDocument) {
      const docMatches = await this.matchByDocument(
        record.customerDocument,
        record.amountCents,
        record.paymentDate
      );

      if (docMatches.length === 1) {
        const match = docMatches[0];
        const isExactAmount = match.amountCents === record.amountCents;
        return {
          matched: true,
          installmentId: match.id,
          confidence: isExactAmount ? 0.9 : 0.7,
          matchType: isExactAmount ? "document_amount" : "document_approximate",
          candidates: docMatches,
        };
      }

      if (docMatches.length > 1) {
        // Multiple candidates - need manual review
        return {
          matched: false,
          confidence: 0,
          candidates: docMatches,
        };
      }
    }

    // No match found
    return {
      matched: false,
      confidence: 0,
      candidates: [],
    };
  }

  private async matchByBarcode(barcode: string): Promise<InstallmentCandidate | null> {
    // Barcode typically contains contract info - we'll search by gateway transaction
    const transaction = await prisma.gatewayTransaction.findFirst({
      where: {
        OR: [
          { gatewayTransactionId: barcode },
          { paymentLink: { contains: barcode.slice(-20) } },
        ],
      },
      include: {
        contract: {
          include: {
            endCustomer: { select: { name: true, document: true } },
            merchant: { select: { name: true } },
            installments: {
              where: { status: { in: [InstallmentStatus.scheduled, InstallmentStatus.late] } },
              orderBy: { installmentNumber: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    if (transaction?.contract?.installments[0]) {
      const inst = transaction.contract.installments[0];
      return {
        id: inst.id,
        contractId: transaction.contract.id,
        contractNumber: transaction.contract.contractNumber,
        installmentNumber: inst.installmentNumber,
        amountCents: inst.amountCents,
        dueDate: inst.dueDate,
        customerDocument: transaction.contract.endCustomer.document,
        customerName: transaction.contract.endCustomer.name,
        merchantName: transaction.contract.merchant.name,
      };
    }

    return null;
  }

  private async matchByReference(reference: string): Promise<InstallmentCandidate | null> {
    // Search in reconciliation items for external reference
    const reconItem = await prisma.reconciliationItem.findFirst({
      where: { externalReference: reference },
      include: {
        installment: {
          include: {
            contract: {
              include: {
                endCustomer: { select: { name: true, document: true } },
                merchant: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (reconItem?.installment) {
      const inst = reconItem.installment;
      return {
        id: inst.id,
        contractId: inst.contract.id,
        contractNumber: inst.contract.contractNumber,
        installmentNumber: inst.installmentNumber,
        amountCents: inst.amountCents,
        dueDate: inst.dueDate,
        customerDocument: inst.contract.endCustomer.document,
        customerName: inst.contract.endCustomer.name,
        merchantName: inst.contract.merchant.name,
      };
    }

    return null;
  }

  private async matchByDocument(
    document: string,
    amountCents: bigint,
    paymentDate: Date
  ): Promise<InstallmentCandidate[]> {
    // Clean document (remove formatting)
    const cleanDoc = document.replace(/\D/g, "");

    // Find unpaid installments for this customer
    const installments = await prisma.contractInstallment.findMany({
      where: {
        status: { in: [InstallmentStatus.scheduled, InstallmentStatus.late] },
        contract: {
          endCustomer: {
            document: { contains: cleanDoc },
          },
        },
      },
      include: {
        contract: {
          include: {
            endCustomer: { select: { name: true, document: true } },
            merchant: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Score and filter candidates
    const candidates: InstallmentCandidate[] = [];
    const tolerance = BigInt(100); // R$ 1.00 tolerance

    for (const inst of installments) {
      const amountDiff = inst.amountCents > amountCents
        ? inst.amountCents - amountCents
        : amountCents - inst.amountCents;

      // Include if exact match or within tolerance
      if (amountDiff <= tolerance) {
        candidates.push({
          id: inst.id,
          contractId: inst.contract.id,
          contractNumber: inst.contract.contractNumber,
          installmentNumber: inst.installmentNumber,
          amountCents: inst.amountCents,
          dueDate: inst.dueDate,
          customerDocument: inst.contract.endCustomer.document,
          customerName: inst.contract.endCustomer.name,
          merchantName: inst.contract.merchant.name,
        });
      }
    }

    // Sort by amount difference (exact matches first)
    candidates.sort((a, b) => {
      const diffA = a.amountCents > amountCents
        ? Number(a.amountCents - amountCents)
        : Number(amountCents - a.amountCents);
      const diffB = b.amountCents > amountCents
        ? Number(b.amountCents - amountCents)
        : Number(amountCents - b.amountCents);
      return diffA - diffB;
    });

    return candidates;
  }

  /**
   * Search for installment candidates by various criteria
   */
  async searchInstallments(query: {
    contractNumber?: string;
    customerDocument?: string;
    barcode?: string;
  }): Promise<InstallmentCandidate[]> {
    const where: any = {
      status: { in: [InstallmentStatus.scheduled, InstallmentStatus.late] },
    };

    if (query.contractNumber) {
      where.contract = {
        contractNumber: { contains: query.contractNumber, mode: "insensitive" },
      };
    }

    if (query.customerDocument) {
      const cleanDoc = query.customerDocument.replace(/\D/g, "");
      where.contract = {
        ...where.contract,
        endCustomer: { document: { contains: cleanDoc } },
      };
    }

    const installments = await prisma.contractInstallment.findMany({
      where,
      include: {
        contract: {
          include: {
            endCustomer: { select: { name: true, document: true } },
            merchant: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 50,
    });

    return installments.map((inst) => ({
      id: inst.id,
      contractId: inst.contract.id,
      contractNumber: inst.contract.contractNumber,
      installmentNumber: inst.installmentNumber,
      amountCents: inst.amountCents,
      dueDate: inst.dueDate,
      customerDocument: inst.contract.endCustomer.document,
      customerName: inst.contract.endCustomer.name,
      merchantName: inst.contract.merchant.name,
    }));
  }
}

export const paymentMatcher = new PaymentMatcher();

