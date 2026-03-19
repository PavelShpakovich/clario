import crypto from 'crypto';
import { env } from '@/lib/env';

export interface WebpayCallbackUrls {
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;
}

export interface WebpayConfig {
  apiBaseUrl: string;
  merchantId: string;
  secretKey: string;
  webhookSecret: string;
  callbackUrls: WebpayCallbackUrls;
}

export interface WebpayCheckoutSession {
  url: string;
  method: 'POST';
  fields: Record<string, string>;
}

export interface WebpayNotificationPayload {
  batchTimestamp: string;
  currencyId: string;
  amount: string;
  paymentMethod: string;
  orderId: string;
  siteOrderId: string;
  transactionId: string;
  paymentType: string;
  rrn: string;
  wsbSignature: string;
  action: string;
  rc: string;
  approval: string;
  card?: string;
  customerId?: string;
  operationType?: string;
  recurringToken?: string;
  offerExpDate?: string;
  rcText?: string;
}

export interface WebpayUnbindResponse {
  batchTimestamp: string;
  customerId: string;
  operationType: string;
  recurringToken: string;
  rc: string;
  rcText?: string;
}

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path.startsWith('/') ? path : `/${path}`, baseUrl).toString();
}

export function getWebpayCallbackUrls(): WebpayCallbackUrls {
  return {
    successUrl: joinUrl(env.NEXT_PUBLIC_APP_URL, env.WEBPAY_SUCCESS_PATH),
    cancelUrl: joinUrl(env.NEXT_PUBLIC_APP_URL, env.WEBPAY_CANCEL_PATH),
    webhookUrl: joinUrl(env.NEXT_PUBLIC_APP_URL, '/api/webhooks/webpay'),
  };
}

export function getWebpayMissingConfig(): string[] {
  const required: Array<[string, string | undefined]> = [
    ['WEBPAY_API_BASE_URL', env.WEBPAY_API_BASE_URL],
    ['WEBPAY_MERCHANT_ID', env.WEBPAY_MERCHANT_ID],
    ['WEBPAY_SECRET_KEY', env.WEBPAY_SECRET_KEY],
    ['WEBPAY_WEBHOOK_SECRET', env.WEBPAY_WEBHOOK_SECRET],
  ];

  return required.filter(([, value]) => !value).map(([key]) => key);
}

export function isWebpayConfigured(): boolean {
  return getWebpayMissingConfig().length === 0;
}

export function getWebpayConfig(): WebpayConfig {
  const missing = getWebpayMissingConfig();
  if (missing.length > 0) {
    throw new Error(`Missing WEBPAY configuration: ${missing.join(', ')}`);
  }

  return {
    apiBaseUrl: env.WEBPAY_API_BASE_URL!,
    merchantId: env.WEBPAY_MERCHANT_ID!,
    secretKey: env.WEBPAY_SECRET_KEY!,
    webhookSecret: env.WEBPAY_WEBHOOK_SECRET!,
    callbackUrls: getWebpayCallbackUrls(),
  };
}

function isWebpaySandbox(): boolean {
  const url = env.WEBPAY_API_BASE_URL?.toLowerCase() ?? '';
  return url.includes('sandbox');
}

function mapLocaleToWebpayLanguage(locale: string | undefined): 'russian' | 'english' {
  return locale === 'en' ? 'english' : 'russian';
}

function formatWebpayTotal(amountMinor: number): string {
  if (amountMinor % 100 === 0) {
    return String(amountMinor / 100);
  }

  return (amountMinor / 100).toFixed(2);
}

function sha1Hex(value: string): string {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function md5Hex(value: string): string {
  return crypto.createHash('md5').update(value).digest('hex');
}

export function buildWebpayOrderSignature(input: {
  seed: string;
  storeId: string;
  customerId: string;
  orderNum: string;
  test: string;
  currencyId: string;
  total: string;
  operationType: 'recurring_bind' | 'recurring_pay';
  recurringToken?: string;
}): string {
  const { secretKey } = getWebpayConfig();
  const parts = [
    input.seed,
    input.storeId,
    input.customerId,
    input.orderNum,
    input.test,
    input.currencyId,
    input.total,
    input.operationType,
  ];

  if (input.recurringToken) {
    parts.push(input.recurringToken);
  }

  parts.push(secretKey);
  return sha1Hex(parts.join(''));
}

export function buildWebpayUnbindSignature(input: {
  seed: string;
  storeId: string;
  customerId: string;
  operationType: 'recurring_unbind';
  recurringToken: string;
}): string {
  const { secretKey } = getWebpayConfig();
  return sha1Hex(
    [
      input.seed,
      input.storeId,
      input.customerId,
      input.operationType,
      input.recurringToken,
      secretKey,
    ].join(''),
  );
}

export function verifyWebpayNotificationSignature(payload: WebpayNotificationPayload): boolean {
  const { secretKey } = getWebpayConfig();
  const parts = [
    payload.batchTimestamp,
    payload.currencyId,
    payload.amount,
    payload.paymentMethod,
    payload.orderId,
    payload.siteOrderId,
    payload.transactionId,
    payload.paymentType,
    payload.rrn,
  ];

  if (payload.card) {
    parts.push(payload.card);
  }
  if (payload.customerId) {
    parts.push(payload.customerId);
  }
  if (payload.operationType) {
    parts.push(payload.operationType);
  }
  if (payload.recurringToken) {
    parts.push(payload.recurringToken);
  }
  if (payload.offerExpDate) {
    parts.push(payload.offerExpDate);
  }

  parts.push(secretKey);
  const expected = md5Hex(parts.join(''));
  const provided = Buffer.from(payload.wsbSignature.toLowerCase());
  const actual = Buffer.from(expected);

  if (provided.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, actual);
}

export function parseWebpayNotificationPayload(
  rawPayload: string,
): WebpayNotificationPayload | null {
  const params = new URLSearchParams(rawPayload);
  const wsbSignature = params.get('wsb_signature');
  const siteOrderId = params.get('site_order_id');

  if (!wsbSignature || !siteOrderId) {
    return null;
  }

  return {
    batchTimestamp: params.get('batch_timestamp') ?? '',
    currencyId: params.get('currency_id') ?? '',
    amount: params.get('amount') ?? '',
    paymentMethod: params.get('payment_method') ?? '',
    orderId: params.get('order_id') ?? '',
    siteOrderId,
    transactionId: params.get('transaction_id') ?? '',
    paymentType: params.get('payment_type') ?? '',
    rrn: params.get('rrn') ?? '',
    wsbSignature,
    action: params.get('action') ?? '',
    rc: params.get('rc') ?? '',
    approval: params.get('approval') ?? '',
    card: params.get('card') ?? undefined,
    customerId: params.get('customer_id') ?? undefined,
    operationType: params.get('operation_type') ?? undefined,
    recurringToken: params.get('recurring_token') ?? undefined,
    offerExpDate: params.get('offer_exp_date') ?? undefined,
    rcText: params.get('rc_text') ?? undefined,
  };
}

export function buildWebpayOrderReference(transactionId: string): string {
  return `clario-${transactionId}`;
}

export function parseWebpayOrderReference(orderReference: string | undefined): string | null {
  if (!orderReference) return null;
  return orderReference.startsWith('clario-') ? orderReference.slice('clario-'.length) : null;
}

export function buildWebpayCheckoutSession(input: {
  transactionId: string;
  amountMinor: number;
  currency: string;
  productId: string;
  planId: string;
  customerReference: string;
  locale?: string;
  customerEmail?: string | null;
  planName?: string;
}): WebpayCheckoutSession {
  const { apiBaseUrl, merchantId, callbackUrls } = getWebpayConfig();
  const orderNum = buildWebpayOrderReference(input.transactionId);
  const total = formatWebpayTotal(input.amountMinor);
  const test = isWebpaySandbox() ? '1' : '0';
  const seed = String(Date.now());
  const operationType = 'recurring_bind';
  const language = mapLocaleToWebpayLanguage(input.locale);

  const fields = {
    '*scart': '',
    wsb_version: '2',
    wsb_language_id: language,
    wsb_storeid: merchantId,
    wsb_order_num: orderNum,
    wsb_test: test,
    wsb_currency_id: input.currency,
    wsb_seed: seed,
    wsb_return_url: callbackUrls.successUrl,
    wsb_cancel_return_url: callbackUrls.cancelUrl,
    wsb_notify_url: callbackUrls.webhookUrl,
    'wsb_invoice_item_name[0]': input.planName ?? input.productId,
    'wsb_invoice_item_quantity[0]': '1',
    'wsb_invoice_item_price[0]': total,
    wsb_total: total,
    wsb_customer_id: input.customerReference,
    wsb_operation_type: operationType,
    wsb_order_tag: input.planId,
    ...(input.customerEmail ? { wsb_email: input.customerEmail } : {}),
  };

  return {
    url: apiBaseUrl.replace(/\/$/, ''),
    method: 'POST',
    fields: {
      ...fields,
      wsb_signature: buildWebpayOrderSignature({
        seed,
        storeId: merchantId,
        customerId: input.customerReference,
        orderNum,
        test,
        currencyId: input.currency,
        total,
        operationType,
      }),
    },
  };
}

export function buildWebpayRecurringPaymentSession(input: {
  transactionId: string;
  amountMinor: number;
  currency: string;
  customerReference: string;
  recurringToken: string;
  locale?: string;
  customerEmail?: string | null;
  planName?: string;
}): WebpayCheckoutSession {
  const { apiBaseUrl, merchantId, callbackUrls } = getWebpayConfig();
  const orderNum = buildWebpayOrderReference(input.transactionId);
  const total = formatWebpayTotal(input.amountMinor);
  const test = isWebpaySandbox() ? '1' : '0';
  const seed = String(Date.now());
  const operationType = 'recurring_pay';
  const language = mapLocaleToWebpayLanguage(input.locale);

  const fields = {
    '*scart': '',
    wsb_version: '2',
    wsb_language_id: language,
    wsb_storeid: merchantId,
    wsb_order_num: orderNum,
    wsb_test: test,
    wsb_currency_id: input.currency,
    wsb_seed: seed,
    wsb_return_url: callbackUrls.successUrl,
    wsb_cancel_return_url: callbackUrls.cancelUrl,
    wsb_notify_url: callbackUrls.webhookUrl,
    'wsb_invoice_item_name[0]': input.planName ?? 'Subscription renewal',
    'wsb_invoice_item_quantity[0]': '1',
    'wsb_invoice_item_price[0]': total,
    wsb_total: total,
    wsb_customer_id: input.customerReference,
    wsb_operation_type: operationType,
    wsb_recurring_token: input.recurringToken,
    ...(input.customerEmail ? { wsb_email: input.customerEmail } : {}),
  };

  return {
    url: apiBaseUrl.replace(/\/$/, ''),
    method: 'POST',
    fields: {
      ...fields,
      wsb_signature: buildWebpayOrderSignature({
        seed,
        storeId: merchantId,
        customerId: input.customerReference,
        orderNum,
        test,
        currencyId: input.currency,
        total,
        operationType,
        recurringToken: input.recurringToken,
      }),
    },
  };
}

export function buildWebpayUnbindSession(input: {
  customerReference: string;
  recurringToken: string;
}): WebpayCheckoutSession {
  const { apiBaseUrl, merchantId } = getWebpayConfig();
  const seed = String(Date.now());
  const operationType = 'recurring_unbind';

  const fields = {
    '*scart': '',
    wsb_version: '2',
    wsb_seed: seed,
    wsb_storeid: merchantId,
    wsb_customer_id: input.customerReference,
    wsb_operation_type: operationType,
    wsb_recurring_token: input.recurringToken,
  };

  return {
    url: apiBaseUrl.replace(/\/$/, ''),
    method: 'POST',
    fields: {
      ...fields,
      wsb_signature: buildWebpayUnbindSignature({
        seed,
        storeId: merchantId,
        customerId: input.customerReference,
        operationType,
        recurringToken: input.recurringToken,
      }),
    },
  };
}

function buildFormBody(fields: Record<string, string>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(fields)) {
    params.append(key, value);
  }

  return params.toString();
}

export async function sendWebpayFormRequest(fields: Record<string, string>): Promise<{
  ok: boolean;
  status: number;
  body: string;
  contentType: string;
}> {
  const { apiBaseUrl } = getWebpayConfig();
  const response = await fetch(apiBaseUrl.replace(/\/$/, ''), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/x-www-form-urlencoded, application/json, text/plain',
    },
    body: buildFormBody(fields),
    cache: 'no-store',
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
    contentType: response.headers.get('content-type') ?? '',
  };
}

export function parseWebpayUnbindResponse(rawPayload: string): WebpayUnbindResponse | null {
  try {
    const parsed = JSON.parse(rawPayload) as {
      batch_timestamp?: string | number;
      customer_id?: string;
      operation_type?: string;
      recurring_token?: string | number;
      rc?: string | number;
      rc_text?: string;
    };

    if (
      !parsed.customer_id ||
      !parsed.operation_type ||
      parsed.recurring_token == null ||
      parsed.rc == null
    ) {
      return null;
    }

    return {
      batchTimestamp: String(parsed.batch_timestamp ?? ''),
      customerId: parsed.customer_id,
      operationType: parsed.operation_type,
      recurringToken: String(parsed.recurring_token),
      rc: String(parsed.rc),
      rcText: parsed.rc_text,
    };
  } catch {
    return null;
  }
}

export function resolveWebpayStatus(
  rawStatus: string | undefined,
  paymentType?: string | undefined,
  resultCode?: string | undefined,
): 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' {
  const normalized = rawStatus?.toLowerCase();
  const normalizedPaymentType = paymentType?.toLowerCase();
  const normalizedResultCode = resultCode?.toLowerCase();

  if (normalizedResultCode === '0' || normalizedResultCode?.startsWith('w0001')) {
    return 'paid';
  }

  if (
    normalizedPaymentType === '1' ||
    normalizedPaymentType === '4' ||
    normalizedPaymentType === '10'
  ) {
    return 'paid';
  }

  if (normalizedPaymentType === '2') {
    return 'failed';
  }

  switch (normalized) {
    case 'paid':
    case 'success':
    case 'succeeded':
    case 'completed':
      return 'paid';
    case 'refunded':
    case 'refund':
      return 'refunded';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'failed':
    case 'declined':
    case 'error':
      return 'failed';
    default:
      return 'pending';
  }
}
