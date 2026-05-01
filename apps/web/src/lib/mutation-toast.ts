'use client';

import { toast } from 'sonner';

interface RunToastMutationOptions<TResult> {
  action: () => Promise<TResult>;
  successMessage?: string;
  mapSuccessMessage?: (result: TResult) => string | undefined;
  errorMessage?: string;
  mapErrorMessage?: (error: unknown) => string | undefined;
  silentSuccess?: boolean;
  toastKey?: string;
  dedupeWindowMs?: number;
  onSuccess?: (result: TResult) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
}

const lastToastAt = new Map<string, number>();
const DEFAULT_DEDUPE_WINDOW_MS = 2_000;

function shouldShowToast(key: string, dedupeWindowMs: number): boolean {
  const now = Date.now();
  const lastShownAt = lastToastAt.get(key) ?? 0;

  if (now - lastShownAt < dedupeWindowMs) {
    return false;
  }

  lastToastAt.set(key, now);
  return true;
}

export async function runToastMutation<TResult>({
  action,
  successMessage,
  mapSuccessMessage,
  errorMessage,
  mapErrorMessage,
  silentSuccess = false,
  toastKey,
  dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
  onSuccess,
  onError,
}: RunToastMutationOptions<TResult>): Promise<TResult> {
  try {
    const result = await action();
    await onSuccess?.(result);
    const resolvedSuccessMessage = mapSuccessMessage?.(result) ?? successMessage;

    if (!silentSuccess && resolvedSuccessMessage) {
      toast.success(resolvedSuccessMessage);
    }

    return result;
  } catch (error) {
    await onError?.(error);

    const resolvedErrorMessage = mapErrorMessage?.(error) ?? errorMessage;
    const resolvedToastKey = toastKey ?? resolvedErrorMessage;

    if (
      resolvedErrorMessage &&
      resolvedToastKey &&
      shouldShowToast(resolvedToastKey, dedupeWindowMs)
    ) {
      toast.error(resolvedErrorMessage);
    }

    throw error;
  }
}
