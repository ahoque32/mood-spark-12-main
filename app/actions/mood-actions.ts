"use server";

import { revalidatePath } from "next/cache";


export async function saveMood(mood: string, note: string) {

  revalidatePath("/");
  revalidatePath("/insights");

  return { success: true };
}


export async function updateMood(id: string, mood: string, note: string) {

  revalidatePath("/");
  revalidatePath("/insights");

  return { success: true };
}


export async function deleteMood(id: string) {


  revalidatePath("/");
  revalidatePath("/insights");

  return { success: true };
}


export async function getMoodsByDateRange(startDate: Date, endDate: Date) {
  

  return { moods: [] };
}
