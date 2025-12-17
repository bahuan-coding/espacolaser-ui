import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ContractEligibilityStatus } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status") as ContractEligibilityStatus | null;
  const search = searchParams.get("search");

  // Get first merchant (in production, get from session)
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const where = {
    merchantId: merchant.id,
    ...(status && { eligibilityStatus: status }),
    ...(search && {
      OR: [
        { contractNumber: { contains: search, mode: "insensitive" as const } },
        { endCustomer: { name: { contains: search, mode: "insensitive" as const } } },
        { endCustomer: { document: { contains: search } } },
      ],
    }),
  };

  const [contracts, total] = await Promise.all([
    prisma.serviceContract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        endCustomer: { select: { id: true, name: true, document: true } },
        _count: { select: { installments: true } },
        installments: {
          select: { status: true },
        },
      },
    }),
    prisma.serviceContract.count({ where }),
  ]);

  return NextResponse.json({
    data: contracts.map((contract) => {
      const paidCount = contract.installments.filter((i) => i.status === "paid").length;
      const lateCount = contract.installments.filter((i) => i.status === "late" || i.status === "defaulted").length;

      return {
        id: contract.id,
        contractNumber: contract.contractNumber,
        description: contract.description,
        totalAmountCents: contract.totalAmountCents.toString(),
        numberOfInstallments: contract.numberOfInstallments,
        eligibilityStatus: contract.eligibilityStatus,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate?.toISOString(),
        customer: contract.endCustomer,
        installmentStats: {
          total: contract._count.installments,
          paid: paidCount,
          late: lateCount,
        },
        createdAt: contract.createdAt.toISOString(),
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

