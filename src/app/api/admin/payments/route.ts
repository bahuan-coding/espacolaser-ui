import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentEventType, PaymentMethod, PaymentMatchStatus } from "@/generated/prisma";
import { paymentProcessor } from "@/lib/services/payment-processor";

// GET - List all payment events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const matchStatus = searchParams.get("matchStatus") as PaymentMatchStatus | null;
    const paymentMethod = searchParams.get("paymentMethod") as PaymentMethod | null;
    const eventType = searchParams.get("eventType") as PaymentEventType | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (matchStatus) where.matchStatus = matchStatus;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (eventType) where.eventType = eventType;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const [payments, total, stats] = await Promise.all([
      prisma.paymentEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
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
          returnFile: { select: { fileName: true } },
        },
      }),
      prisma.paymentEvent.count({ where }),
      prisma.paymentEvent.groupBy({
        by: ["matchStatus"],
        _count: true,
        _sum: { paidAmountCents: true },
      }),
    ]);

    const statsMap = stats.reduce(
      (acc, s) => {
        acc[s.matchStatus] = {
          count: s._count,
          total: s._sum.paidAmountCents ?? BigInt(0),
        };
        return acc;
      },
      {} as Record<string, { count: number; total: bigint }>
    );

    return NextResponse.json({
      payments: payments.map((p) => ({
        ...p,
        paidAmountCents: p.paidAmountCents.toString(),
        expectedAmountCents: p.expectedAmountCents.toString(),
        netAmountCents: p.netAmountCents.toString(),
        feesCents: p.feesCents.toString(),
      })),
      stats: Object.fromEntries(
        Object.entries(statsMap).map(([k, v]) => [
          k,
          { count: v.count, total: v.total.toString() },
        ])
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pagamentos" },
      { status: 500 }
    );
  }
}

// POST - Create manual payment entry
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

    if (!installmentId || !eventType || !paymentMethod || !paidAmountCents || !paymentDate) {
      return NextResponse.json(
        { error: "Campos obrigatórios: installmentId, eventType, paymentMethod, paidAmountCents, paymentDate" },
        { status: 400 }
      );
    }

    const result = await paymentProcessor.createManualPayment({
      installmentId,
      eventType: eventType as PaymentEventType,
      paymentMethod: paymentMethod as PaymentMethod,
      paidAmountCents: BigInt(paidAmountCents),
      paymentDate: new Date(paymentDate),
      observations,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar pagamento" },
      { status: 500 }
    );
  }
}

