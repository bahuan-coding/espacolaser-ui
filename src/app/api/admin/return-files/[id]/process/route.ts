import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentProcessor } from "@/lib/services/payment-processor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Process the return file
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const file = await prisma.returnFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não encontrado" },
        { status: 404 }
      );
    }

    if (file.status === "processed") {
      return NextResponse.json(
        { error: "Arquivo já foi processado" },
        { status: 400 }
      );
    }

    if (file.status === "processing") {
      return NextResponse.json(
        { error: "Arquivo já está sendo processado" },
        { status: 400 }
      );
    }

    if (!file.fileContent) {
      return NextResponse.json(
        { error: "Conteúdo do arquivo não encontrado" },
        { status: 400 }
      );
    }

    // Process the file
    const result = await paymentProcessor.processReturnFile(
      id,
      file.fileContent,
      file.fileType
    );

    return NextResponse.json({
      success: true,
      result: {
        totalRecords: result.totalRecords,
        matchedRecords: result.matchedRecords,
        unmatchedRecords: result.unmatchedRecords,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("Error processing return file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao processar arquivo" },
      { status: 500 }
    );
  }
}

