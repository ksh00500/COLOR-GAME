import { createPublicKey, verify as verifySignature } from "node:crypto";

const admobVerifierKeysUrl =
  "https://www.gstatic.com/admob/reward/verifier-keys.json";
const keyCacheTtlMs = 24 * 60 * 60 * 1000;

interface AdMobVerifierKey {
  keyId: number;
  pem: string;
}

interface AdMobVerifierKeyResponse {
  keys?: AdMobVerifierKey[];
}

export interface AdMobSsvPayload {
  adNetwork: string;
  adUnit: string;
  customData: string | null;
  keyId: number;
  rewardAmount: number;
  rewardItem: string;
  timestamp: number;
  transactionId: string;
  userId: string | null;
}

export interface AdMobSsvVerifier {
  verify(rawUrl: string): Promise<AdMobSsvPayload>;
}

interface CachedKeys {
  expiresAt: number;
  keys: Map<number, string>;
}

let cachedKeys: CachedKeys | null = null;

const base64UrlDecode = (value: string): Buffer => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  return Buffer.from(
    padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), "="),
    "base64",
  );
};

const readRequired = (params: URLSearchParams, key: string): string => {
  const value = params.get(key);
  if (value === null || value === "") throw new Error(`ADMOB_SSV_MISSING_${key.toUpperCase()}`);
  return value;
};

export const parseAdMobSsvUrl = (
  rawUrl: string,
): { payload: AdMobSsvPayload; signedContent: Buffer; signature: Buffer } => {
  const queryStart = rawUrl.indexOf("?");
  if (queryStart < 0) throw new Error("ADMOB_SSV_QUERY_MISSING");
  const rawQuery = rawUrl.slice(queryStart + 1);
  const signatureMarker = "&signature=";
  const signatureStart = rawQuery.indexOf(signatureMarker);
  if (signatureStart < 0) throw new Error("ADMOB_SSV_SIGNATURE_MISSING");
  const keyMarker = "&key_id=";
  const keyStart = rawQuery.indexOf(keyMarker, signatureStart + signatureMarker.length);
  if (keyStart < 0) throw new Error("ADMOB_SSV_KEY_ID_MISSING");
  if (rawQuery.indexOf("&", keyStart + keyMarker.length) >= 0) {
    throw new Error("ADMOB_SSV_PARAMETER_ORDER_INVALID");
  }

  const signedQuery = rawQuery.slice(0, signatureStart);
  const signatureValue = rawQuery.slice(signatureStart + signatureMarker.length, keyStart);
  const keyIdValue = rawQuery.slice(keyStart + keyMarker.length);
  const params = new URLSearchParams(signedQuery);
  const keyId = Number.parseInt(keyIdValue, 10);
  const rewardAmount = Number.parseInt(readRequired(params, "reward_amount"), 10);
  const timestamp = Number.parseInt(readRequired(params, "timestamp"), 10);
  if (!Number.isSafeInteger(keyId) || !Number.isSafeInteger(rewardAmount)
    || !Number.isSafeInteger(timestamp)) {
    throw new Error("ADMOB_SSV_NUMBER_INVALID");
  }

  return {
    signedContent: Buffer.from(signedQuery, "utf8"),
    signature: base64UrlDecode(signatureValue),
    payload: {
      adNetwork: readRequired(params, "ad_network"),
      adUnit: readRequired(params, "ad_unit"),
      customData: params.get("custom_data"),
      keyId,
      rewardAmount,
      rewardItem: readRequired(params, "reward_item"),
      timestamp,
      transactionId: readRequired(params, "transaction_id"),
      userId: params.get("user_id"),
    },
  };
};

const fetchVerifierKeys = async (): Promise<Map<number, string>> => {
  if (cachedKeys !== null && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const response = await fetch(admobVerifierKeysUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("ADMOB_SSV_KEYS_UNAVAILABLE");
  const body = await response.json() as AdMobVerifierKeyResponse;
  const keys = new Map<number, string>();
  for (const key of body.keys ?? []) {
    if (Number.isSafeInteger(key.keyId) && key.pem.includes("BEGIN PUBLIC KEY")) {
      keys.set(key.keyId, key.pem);
    }
  }
  if (keys.size === 0) throw new Error("ADMOB_SSV_KEYS_EMPTY");
  cachedKeys = { keys, expiresAt: Date.now() + keyCacheTtlMs };
  return keys;
};

export class GoogleAdMobSsvVerifier implements AdMobSsvVerifier {
  async verify(rawUrl: string): Promise<AdMobSsvPayload> {
    const parsed = parseAdMobSsvUrl(rawUrl);
    const key = (await fetchVerifierKeys()).get(parsed.payload.keyId);
    if (key === undefined) {
      cachedKeys = null;
      const refreshedKey = (await fetchVerifierKeys()).get(parsed.payload.keyId);
      if (refreshedKey === undefined) throw new Error("ADMOB_SSV_KEY_NOT_FOUND");
      if (!verifySignature("sha256", parsed.signedContent, createPublicKey(refreshedKey), parsed.signature)) {
        throw new Error("ADMOB_SSV_SIGNATURE_INVALID");
      }
      return parsed.payload;
    }
    if (!verifySignature("sha256", parsed.signedContent, createPublicKey(key), parsed.signature)) {
      throw new Error("ADMOB_SSV_SIGNATURE_INVALID");
    }
    return parsed.payload;
  }
}
