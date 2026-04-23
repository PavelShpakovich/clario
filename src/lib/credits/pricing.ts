import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  DEFAULT_READING_CREDIT_COST,
  DEFAULT_COMPATIBILITY_CREDIT_COST,
  DEFAULT_FORECAST_PACK_CREDIT_COST,
  DEFAULT_CHAT_PACK_CREDIT_COST,
} from '@/lib/usage-policy';
import { logger } from '@/lib/logger';

const db = supabaseAdmin;

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProductKind =
  | 'natal_report'
  | 'compatibility_report'
  | 'forecast_report'
  | 'follow_up_pack';

export type CreditCosts = Record<ProductKind, number>;
export type FreeProducts = Set<ProductKind>;

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceminor: number | null;
  currency: string;
  active: boolean;
  sortOrder: number;
}

// ─── In-memory cache with TTL ───────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds
// Free-product flag can change any time via the admin panel.
// Short TTL ensures all server instances see the change quickly.
const FREE_PRODUCTS_CACHE_TTL_MS = 10_000; // 10 seconds

let creditCostsCache: CacheEntry<CreditCosts> | null = null;
let freeProductsCache: CacheEntry<FreeProducts> | null = null;
let creditPacksCache: CacheEntry<CreditPack[]> | null = null;

export function invalidatePricingCache(): void {
  creditCostsCache = null;
  freeProductsCache = null;
  creditPacksCache = null;
}

// ─── Default costs (fallback if DB query fails) ─────────────────────────────

const FALLBACK_COSTS: CreditCosts = {
  natal_report: DEFAULT_READING_CREDIT_COST,
  compatibility_report: DEFAULT_COMPATIBILITY_CREDIT_COST,
  forecast_report: DEFAULT_FORECAST_PACK_CREDIT_COST,
  follow_up_pack: DEFAULT_CHAT_PACK_CREDIT_COST,
};

// ─── Credit costs from DB ───────────────────────────────────────────────────

export async function getCreditCosts(): Promise<CreditCosts> {
  if (creditCostsCache && Date.now() < creditCostsCache.expiresAt) {
    return creditCostsCache.data;
  }

  try {
    const { data: rawData, error } = await db
      .from('report_products')
      .select('kind, credit_cost')
      .not('credit_cost', 'is', null);

    if (error) throw error;

    const costs = { ...FALLBACK_COSTS };
    for (const row of rawData ?? []) {
      if (row.kind in costs) {
        costs[row.kind as ProductKind] = row.credit_cost!;
      }
    }

    creditCostsCache = { data: costs, expiresAt: Date.now() + CACHE_TTL_MS };
    return costs;
  } catch (err) {
    logger.error({ error: err }, 'Failed to load credit costs from DB, using fallback');
    return FALLBACK_COSTS;
  }
}

export async function getFreeProducts(): Promise<FreeProducts> {
  if (freeProductsCache && Date.now() < freeProductsCache.expiresAt) {
    return freeProductsCache.data;
  }

  try {
    // Use an RPC function so this query never depends on PostgREST's column
    // schema cache knowing about the `free` column.  PostgREST executes RPC
    // bodies as raw SQL, so even a stale schema cache won't break this call.
    const { data, error } = await db.rpc('get_free_product_kinds');

    if (error) throw error;

    const free = new Set<ProductKind>();
    for (const kind of (data as string[]) ?? []) {
      if (kind in FALLBACK_COSTS) free.add(kind as ProductKind);
    }

    freeProductsCache = { data: free, expiresAt: Date.now() + FREE_PRODUCTS_CACHE_TTL_MS };
    return free;
  } catch (err) {
    logger.error({ error: err }, 'Failed to load free products from DB');
    return new Set();
  }
}

/** Single call to get both cost and free status for a product. */
export async function getProductPricing(
  kind: ProductKind,
): Promise<{ cost: number; isFree: boolean }> {
  const [costs, free] = await Promise.all([getCreditCosts(), getFreeProducts()]);
  return { cost: costs[kind], isFree: free.has(kind) };
}

// ─── Credit packs from DB ───────────────────────────────────────────────────

export async function getCreditPacks(): Promise<CreditPack[]> {
  if (creditPacksCache && Date.now() < creditPacksCache.expiresAt) {
    return creditPacksCache.data;
  }

  try {
    const { data, error } = await db
      .from('credit_packs')
      .select('id, name, credits, price_minor, currency, active, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const packs: CreditPack[] = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      credits: row.credits,
      priceminor: row.price_minor,
      currency: row.currency,
      active: row.active,
      sortOrder: row.sort_order,
    }));

    creditPacksCache = { data: packs, expiresAt: Date.now() + CACHE_TTL_MS };
    return packs;
  } catch (err) {
    logger.error({ error: err }, 'Failed to load credit packs from DB');
    return [];
  }
}

// ─── All credit packs (including inactive) — for admin ──────────────────────

export async function getAllCreditPacks(): Promise<CreditPack[]> {
  try {
    const { data, error } = await db
      .from('credit_packs')
      .select('id, name, credits, price_minor, currency, active, sort_order')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      credits: row.credits,
      priceminor: row.price_minor,
      currency: row.currency,
      active: row.active,
      sortOrder: row.sort_order,
    }));
  } catch (err) {
    logger.error({ error: err }, 'Failed to load all credit packs from DB');
    return [];
  }
}
