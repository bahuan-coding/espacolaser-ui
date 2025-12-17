import { NextRequest, NextResponse } from "next/server";
import { paymentProcessor } from "@/lib/services/payment-processor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Match payment to installment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { installmentId, matchedBy } = body;

    if (!installmentId) {
      return NextResponse.json(
        { error: "installmentId é obrigatório" },
        { status: 400 }
      );
    }

    const result = await paymentProcessor.matchPaymentToInstallment(
      id,
      installmentId,
      matchedBy || "admin"
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error matching payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao vincular pagamento" },
      { status: 500 }
    );
  }
}

