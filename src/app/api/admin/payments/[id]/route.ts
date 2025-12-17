import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get payment event details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const payment = await prisma.paymentEvent.findUnique({
      where: { id },
      include: {
        installment: {
          include: {
            contract: {
              include: {
                endCustomer: true,
                merchant: { select: { name: true } },
              },
            },
          },
        },
        returnFile: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pagamento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      payment: {
        ...payment,
        paidAmountCents: payment.paidAmountCents.toString(),
        expectedAmountCents: payment.expectedAmountCents.toString(),
        netAmountCents: payment.netAmountCents.toString(),
        feesCents: payment.feesCents.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pagamento" },
      { status: 500 }
    );
  }
}

// PATCH - Update payment event
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { observations, matchStatus } = body;

    const payment = await prisma.paymentEvent.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pagamento não encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.paymentEvent.update({
      where: { id },
      data: {
        ...(observations !== undefined && { observations }),
        ...(matchStatus && { matchStatus }),
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        ...updated,
        paidAmountCents: updated.paidAmountCents.toString(),
        expectedAmountCents: updated.expectedAmountCents.toString(),
        netAmountCents: updated.netAmountCents.toString(),
        feesCents: updated.feesCents.toString(),
      },
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar pagamento" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/remove payment event (only if not applied)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const payment = await prisma.paymentEvent.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pagamento não encontrado" },
        { status: 404 }
      );
    }

    if (payment.matchStatus === "manual_matched" && payment.installmentId) {
      return NextResponse.json(
        { error: "Não é possível remover pagamento já aplicado. Use estorno." },
        { status: 400 }
      );
    }

    await prisma.paymentEvent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Erro ao remover pagamento" },
      { status: 500 }
    );
  }
}

