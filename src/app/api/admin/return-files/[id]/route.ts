import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get return file details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const file = await prisma.returnFile.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 100,
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
        },
        _count: { select: { payments: true } },
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Error fetching return file:", error);
    return NextResponse.json(
      { error: "Erro ao buscar arquivo" },
      { status: 500 }
    );
  }
}

// DELETE - Remove return file (only if not processed)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const file = await prisma.returnFile.findUnique({
      where: { id },
      include: { _count: { select: { payments: true } } },
    });

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não encontrado" },
        { status: 404 }
      );
    }

    if (file.status === "processed" && file._count.payments > 0) {
      return NextResponse.json(
        { error: "Não é possível remover arquivo já processado com pagamentos" },
        { status: 400 }
      );
    }

    await prisma.returnFile.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting return file:", error);
    return NextResponse.json(
      { error: "Erro ao remover arquivo" },
      { status: 500 }
    );
  }
}

