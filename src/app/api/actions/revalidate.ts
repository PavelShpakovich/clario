'use server';

import { revalidatePath } from 'next/cache';

/** Revalidates the dashboard server cache so newly created/updated themes appear immediately. */
export async function revalidateDashboard() {
  revalidatePath('/dashboard');
}
