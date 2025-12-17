"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface MerchantUpdateData {
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export async function updateMerchant(merchantId: string, data: MerchantUpdateData) {
  try {
    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
      },
    });

    revalidatePath("/configuracoes");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to update merchant:", error);
    return { success: false, error: "Falha ao atualizar dados" };
  }
}

