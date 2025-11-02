"use server";

import { revalidatePath } from "next/cache";


export async function updateSettings(settings: {
  analyzeTone?: boolean;
  correlateSocial?: boolean;
  shareWithTherapist?: boolean;
}) {


  revalidatePath("/settings");

  return { success: true, settings };
}


export async function getSettings() {


  return {
    analyzeTone: false,
    correlateSocial: false,
    shareWithTherapist: false
  };
}


export async function resetSettings() {

  revalidatePath("/settings");

  return { success: true };
}
