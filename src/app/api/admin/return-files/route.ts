import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fileParser } from "@/lib/services/file-parser";
import crypto from "crypto";

// GET - List all return files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const fileType = searchParams.get("fileType");

    const where: any = {};
    if (status) where.status = status;
    if (fileType) where.fileType = fileType;

    const [files, total] = await Promise.all([
      prisma.returnFile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { payments: true } },
        },
      }),
      prisma.returnFile.count({ where }),
    ]);

    return NextResponse.json({
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching return files:", error);
    return NextResponse.json(
      { error: "Erro ao buscar arquivos" },
      { status: 500 }
    );
  }
}

// POST - Upload a new return file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = (formData.get("fileType") as string) || "generic";
    const uploadedBy = formData.get("uploadedBy") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    const content = await file.text();
    const fileHash = crypto.createHash("sha256").update(content).digest("hex");

    // Check for duplicate
    const existing = await prisma.returnFile.findFirst({
      where: { fileHash },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Arquivo já foi processado anteriormente", existingId: existing.id },
        { status: 409 }
      );
    }

    // Detect file type if not specified
    const detectedType = fileParser.detectFileType(content, file.name);
    const finalFileType = fileType === "generic" ? detectedType : fileType;

    // Parse to get initial count
    const parseResult = fileParser.parse(content, finalFileType as any);

    // Create return file record
    const returnFile = await prisma.returnFile.create({
      data: {
        fileName: file.name,
        fileType: finalFileType,
        fileHash,
        fileSize: file.size,
        fileContent: content,
        uploadedBy,
        status: "uploaded",
        totalRecords: parseResult.records.length,
      },
    });

    return NextResponse.json({
      success: true,
      file: returnFile,
      preview: {
        totalRecords: parseResult.records.length,
        parsedLines: parseResult.parsedLines,
        errors: parseResult.errors.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}

