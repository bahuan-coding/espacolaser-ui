import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentEventType, PaymentMethod, InstallmentStatus } from "@/generated/prisma";
import { paymentProcessor } from "@/lib/services/payment-processor";
import { paymentMatcher } from "@/lib/services/payment-matcher";

// GET - Search for installments to apply baixa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractNumber = searchParams.get("contractNumber");
    const customerDocument = searchParams.get("customerDocument");
    const barcode = searchParams.get("barcode");

    if (!contractNumber && !customerDocument && !barcode) {
      return NextResponse.json(
        { error: "Informe contrato, CPF ou código de barras" },
        { status: 400 }
      );
    }

    const candidates = await paymentMatcher.searchInstallments({
      contractNumber: contractNumber || undefined,
      customerDocument: customerDocument || undefined,
      barcode: barcode || undefined,
    });

    return NextResponse.json({
      candidates: candidates.map((c) => ({
        ...c,
        amountCents: c.amountCents.toString(),
      })),
    });
  } catch (error) {
    console.error("Error searching installments:", error);
    return NextResponse.json(
      { error: "Erro ao buscar parcelas" },
      { status: 500 }
    );
  }
}

// POST - Apply manual baixa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      installmentId,
      eventType,
      paymentMethod,
      paidAmountCents,
      paymentDate,
      observations,
      createdBy,
    } = body;

    // Validate required fields
    if (!installmentId) {
      return NextResponse.json(
        { error: "installmentId é obrigatório" },
        { status: 400 }
      );
    }
    if (!eventType) {
      return NextResponse.json(
        { error: "eventType é obrigatório" },
        { status: 400 }
      );
    }
    if (!paymentMethod) {
      return NextResponse.json(
        { error: "paymentMethod é obrigatório" },
        { status: 400 }
      );
    }
    if (!paidAmountCents) {
      return NextResponse.json(
        { error: "paidAmountCents é obrigatório" },
        { status: 400 }
      );
    }
    if (!paymentDate) {
      return NextResponse.json(
        { error: "paymentDate é obrigatório" },
        { status: 400 }
      );
    }

    // Validate event type
    if (!Object.values(PaymentEventType).includes(eventType as PaymentEventType)) {
      return NextResponse.json(
        { error: `eventType inválido. Valores: ${Object.values(PaymentEventType).join(", ")}` },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
      return NextResponse.json(
        { error: `paymentMethod inválido. Valores: ${Object.values(PaymentMethod).join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch installment with details
    const installment = await prisma.contractInstallment.findUnique({
      where: { id: installmentId },
      include: {
        contract: {
          include: {
            endCustomer: true,
            merchant: true,
          },
        },
      },
    });

    if (!installment) {
      return NextResponse.json(
        { error: "Parcela não encontrada" },
        { status: 404 }
      );
    }

    if (installment.status === InstallmentStatus.paid) {
      return NextResponse.json(
        { error: "Parcela já está paga" },
        { status: 400 }
      );
    }

    if (installment.status === InstallmentStatus.cancelled) {
      return NextResponse.json(
        { error: "Parcela está cancelada" },
        { status: 400 }
      );
    }

    // Process the baixa
    const result = await paymentProcessor.createManualPayment({
      installmentId,
      eventType: eventType as PaymentEventType,
      paymentMethod: paymentMethod as PaymentMethod,
      paidAmountCents: BigInt(paidAmountCents),
      paymentDate: new Date(paymentDate),
      observations,
      createdBy: createdBy || "admin",
    });

    return NextResponse.json({
      success: true,
      message: `Baixa aplicada com sucesso: ${result.actions.join(", ")}`,
      result: {
        paymentEventId: result.paymentEventId,
        installmentId: result.installmentId,
        actions: result.actions,
      },
      installment: {
        id: installment.id,
        contractNumber: installment.contract.contractNumber,
        installmentNumber: installment.installmentNumber,
        customerName: installment.contract.endCustomer.name,
        merchantName: installment.contract.merchant.name,
      },
    });
  } catch (error) {
    console.error("Error applying baixa:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao aplicar baixa" },
      { status: 500 }
    );
  }
}

