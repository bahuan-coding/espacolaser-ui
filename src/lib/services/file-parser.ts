import { PaymentEventType, PaymentMethod } from "@/generated/prisma";

export interface ParsedPaymentRecord {
  lineNumber: number;
  externalReference?: string;
  customerDocument?: string;
  customerName?: string;
  barcode?: string;
  pixKey?: string;
  amountCents: bigint;
  paymentDate: Date;
  settlementDate?: Date;
  eventType: PaymentEventType;
  paymentMethod: PaymentMethod;
  rawData: Record<string, string>;
}

export interface ParseResult {
  success: boolean;
  records: ParsedPaymentRecord[];
  errors: ParseError[];
  totalLines: number;
  parsedLines: number;
}

export interface ParseError {
  lineNumber: number;
  message: string;
  rawLine?: string;
}

type FileType = "gateway" | "biz" | "bank" | "generic";

/**
 * Parse return files from various sources
 */
export class FileParser {
  /**
   * Parse file content based on file type
   */
  parse(content: string, fileType: FileType): ParseResult {
    const lines = content.split("\n").filter((l) => l.trim());
    const result: ParseResult = {
      success: true,
      records: [],
      errors: [],
      totalLines: lines.length,
      parsedLines: 0,
    };

    if (lines.length === 0) {
      result.success = false;
      result.errors.push({ lineNumber: 0, message: "Arquivo vazio" });
      return result;
    }

    switch (fileType) {
      case "gateway":
        return this.parseGatewayFile(lines);
      case "biz":
        return this.parseBizFile(lines);
      case "bank":
        return this.parseBankFile(lines);
      default:
        return this.parseGenericCSV(lines);
    }
  }

  /**
   * Detect file type from content
   */
  detectFileType(content: string, fileName: string): FileType {
    const firstLine = content.split("\n")[0]?.toLowerCase() || "";
    
    if (fileName.toLowerCase().includes("gateway") || firstLine.includes("transaction_id")) {
      return "gateway";
    }
    if (fileName.toLowerCase().includes("biz") || firstLine.includes("biz_reference")) {
      return "biz";
    }
    if (fileName.toLowerCase().includes("banco") || firstLine.includes("cod_banco")) {
      return "bank";
    }
    return "generic";
  }

  /**
   * Parse gateway return file (CSV format)
   * Expected columns: transaction_id, amount, payment_date, status, customer_document, customer_name
   */
  private parseGatewayFile(lines: string[]): ParseResult {
    const result: ParseResult = {
      success: true,
      records: [],
      errors: [],
      totalLines: lines.length,
      parsedLines: 0,
    };

    // First line is header
    const header = this.parseCSVLine(lines[0]);
    const colIndex = this.mapColumns(header, {
      transaction_id: ["transaction_id", "txn_id", "id"],
      amount: ["amount", "valor", "value"],
      payment_date: ["payment_date", "data_pagamento", "date"],
      customer_document: ["customer_document", "cpf", "cnpj", "document"],
      customer_name: ["customer_name", "nome", "name"],
      status: ["status"],
    });

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        if (values.length < 3) continue;

        const status = values[colIndex.status]?.toLowerCase();
        if (status !== "paid" && status !== "settled" && status !== "approved") {
          continue; // Skip non-payment records
        }

        const amountStr = values[colIndex.amount]?.replace(/[^\d.,]/g, "").replace(",", ".");
        const amount = Math.round(parseFloat(amountStr) * 100);
        
        if (isNaN(amount) || amount <= 0) {
          result.errors.push({
            lineNumber: i + 1,
            message: `Valor inválido: ${values[colIndex.amount]}`,
            rawLine: lines[i],
          });
          continue;
        }

        const record: ParsedPaymentRecord = {
          lineNumber: i + 1,
          externalReference: values[colIndex.transaction_id],
          customerDocument: values[colIndex.customer_document],
          customerName: values[colIndex.customer_name],
          amountCents: BigInt(amount),
          paymentDate: this.parseDate(values[colIndex.payment_date]) || new Date(),
          eventType: PaymentEventType.full_payment,
          paymentMethod: PaymentMethod.credit_card,
          rawData: this.zipToObject(header, values),
        };

        result.records.push(record);
        result.parsedLines++;
      } catch (error) {
        result.errors.push({
          lineNumber: i + 1,
          message: `Erro ao processar linha: ${error instanceof Error ? error.message : "unknown"}`,
          rawLine: lines[i],
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Parse BIZ return file (boleto payments)
   */
  private parseBizFile(lines: string[]): ParseResult {
    const result: ParseResult = {
      success: true,
      records: [],
      errors: [],
      totalLines: lines.length,
      parsedLines: 0,
    };

    const header = this.parseCSVLine(lines[0]);
    const colIndex = this.mapColumns(header, {
      reference: ["biz_reference", "reference", "nosso_numero"],
      barcode: ["barcode", "codigo_barras", "linha_digitavel"],
      amount: ["amount", "valor", "valor_pago"],
      payment_date: ["payment_date", "data_pagamento", "data_credito"],
      customer_document: ["cpf", "cnpj", "document"],
      customer_name: ["nome", "name", "pagador"],
    });

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        if (values.length < 3) continue;

        const amountStr = values[colIndex.amount]?.replace(/[^\d.,]/g, "").replace(",", ".");
        const amount = Math.round(parseFloat(amountStr) * 100);

        if (isNaN(amount) || amount <= 0) {
          result.errors.push({
            lineNumber: i + 1,
            message: `Valor inválido: ${values[colIndex.amount]}`,
            rawLine: lines[i],
          });
          continue;
        }

        const record: ParsedPaymentRecord = {
          lineNumber: i + 1,
          externalReference: values[colIndex.reference],
          barcode: values[colIndex.barcode],
          customerDocument: values[colIndex.customer_document],
          customerName: values[colIndex.customer_name],
          amountCents: BigInt(amount),
          paymentDate: this.parseDate(values[colIndex.payment_date]) || new Date(),
          eventType: PaymentEventType.full_payment,
          paymentMethod: PaymentMethod.boleto,
          rawData: this.zipToObject(header, values),
        };

        result.records.push(record);
        result.parsedLines++;
      } catch (error) {
        result.errors.push({
          lineNumber: i + 1,
          message: `Erro ao processar linha: ${error instanceof Error ? error.message : "unknown"}`,
          rawLine: lines[i],
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Parse bank return file (CNAB format simplified)
   */
  private parseBankFile(lines: string[]): ParseResult {
    const result: ParseResult = {
      success: true,
      records: [],
      errors: [],
      totalLines: lines.length,
      parsedLines: 0,
    };

    // Simplified CNAB-like parsing
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip header/trailer records (type 0 and 9)
      const recordType = line.substring(0, 1);
      if (recordType !== "1" && recordType !== "3") continue;

      try {
        // Simplified position-based parsing
        const nossoNumero = line.substring(37, 57).trim();
        const valorPago = parseInt(line.substring(77, 90), 10);
        const dataCredito = line.substring(110, 118);

        if (isNaN(valorPago) || valorPago <= 0) continue;

        const record: ParsedPaymentRecord = {
          lineNumber: i + 1,
          externalReference: nossoNumero,
          amountCents: BigInt(valorPago),
          paymentDate: this.parseDateCNAB(dataCredito) || new Date(),
          eventType: PaymentEventType.full_payment,
          paymentMethod: PaymentMethod.boleto,
          rawData: { raw: line },
        };

        result.records.push(record);
        result.parsedLines++;
      } catch (error) {
        result.errors.push({
          lineNumber: i + 1,
          message: `Erro ao processar linha CNAB`,
          rawLine: line,
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Parse generic CSV file
   */
  private parseGenericCSV(lines: string[]): ParseResult {
    const result: ParseResult = {
      success: true,
      records: [],
      errors: [],
      totalLines: lines.length,
      parsedLines: 0,
    };

    if (lines.length < 2) {
      result.success = false;
      result.errors.push({ lineNumber: 0, message: "Arquivo deve ter header e dados" });
      return result;
    }

    const header = this.parseCSVLine(lines[0]);
    const colIndex = this.mapColumns(header, {
      reference: ["reference", "referencia", "id", "transaction_id"],
      amount: ["amount", "valor", "value", "valor_pago"],
      payment_date: ["payment_date", "data", "date", "data_pagamento"],
      customer_document: ["cpf", "cnpj", "document", "documento"],
      customer_name: ["nome", "name", "pagador"],
      barcode: ["barcode", "codigo_barras"],
    });

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        if (values.length < 2) continue;

        const amountStr = values[colIndex.amount]?.replace(/[^\d.,]/g, "").replace(",", ".");
        const amount = Math.round(parseFloat(amountStr) * 100);

        if (isNaN(amount) || amount <= 0) continue;

        const record: ParsedPaymentRecord = {
          lineNumber: i + 1,
          externalReference: values[colIndex.reference],
          barcode: values[colIndex.barcode],
          customerDocument: values[colIndex.customer_document],
          customerName: values[colIndex.customer_name],
          amountCents: BigInt(amount),
          paymentDate: this.parseDate(values[colIndex.payment_date]) || new Date(),
          eventType: PaymentEventType.full_payment,
          paymentMethod: PaymentMethod.boleto,
          rawData: this.zipToObject(header, values),
        };

        result.records.push(record);
        result.parsedLines++;
      } catch {
        result.errors.push({
          lineNumber: i + 1,
          message: "Erro ao processar linha",
          rawLine: lines[i],
        });
      }
    }

    result.success = result.errors.length === 0 || result.parsedLines > 0;
    return result;
  }

  // Helper methods
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === "," || char === ";") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private mapColumns(
    header: string[],
    mapping: Record<string, string[]>
  ): Record<string, number> {
    const result: Record<string, number> = {};
    const lowerHeader = header.map((h) => h.toLowerCase().trim());

    for (const [key, aliases] of Object.entries(mapping)) {
      for (const alias of aliases) {
        const idx = lowerHeader.indexOf(alias.toLowerCase());
        if (idx !== -1) {
          result[key] = idx;
          break;
        }
      }
      if (result[key] === undefined) {
        result[key] = -1;
      }
    }
    return result;
  }

  private parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;

    // Try common formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const [, a, b, c] = match;
        if (format === formats[0]) {
          return new Date(parseInt(a), parseInt(b) - 1, parseInt(c));
        } else {
          return new Date(parseInt(c), parseInt(b) - 1, parseInt(a));
        }
      }
    }

    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseDateCNAB(dateStr: string): Date | null {
    // DDMMYYYY format
    if (dateStr.length !== 8) return null;
    const day = parseInt(dateStr.substring(0, 2), 10);
    const month = parseInt(dateStr.substring(2, 4), 10);
    const year = parseInt(dateStr.substring(4, 8), 10);
    return new Date(year, month - 1, day);
  }

  private zipToObject(keys: string[], values: string[]): Record<string, string> {
    const obj: Record<string, string> = {};
    keys.forEach((key, i) => {
      obj[key] = values[i] || "";
    });
    return obj;
  }
}

export const fileParser = new FileParser();

