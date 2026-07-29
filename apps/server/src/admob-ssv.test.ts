import { generateKeyPairSync, sign, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseAdMobSsvUrl } from "./admob-ssv.js";

const toBase64Url = (value: Buffer): string =>
  value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("AdMob SSV parser", () => {
  it("preserves the exact signed query and parses custom data", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });
    const signedQuery = [
      "ad_network=5450213213286189855",
      "ad_unit=1234567890",
      "custom_data=session%3Aabc-123",
      "reward_amount=12",
      "reward_item=color_chips",
      "timestamp=1785292800000",
      "transaction_id=txn-123",
      "user_id=account-123",
    ].join("&");
    const signature = sign("sha256", Buffer.from(signedQuery), privateKey);
    const rawUrl = `/ads/admob/ssv?${signedQuery}&signature=${toBase64Url(signature)}&key_id=7`;
    const parsed = parseAdMobSsvUrl(rawUrl);

    expect(parsed.signedContent.toString("utf8")).toBe(signedQuery);
    expect(parsed.payload.customData).toBe("session:abc-123");
    expect(parsed.payload.transactionId).toBe("txn-123");
    expect(parsed.payload.keyId).toBe(7);
    expect(
      verify(
        "sha256",
        parsed.signedContent,
        publicKey,
        parsed.signature,
      ),
    ).toBe(true);
  });

  it("rejects callbacks whose signature and key id are not last", () => {
    expect(() => parseAdMobSsvUrl(
      "/ads/admob/ssv?ad_network=1&ad_unit=2&custom_data=3&reward_amount=12"
      + "&reward_item=chips&timestamp=4&transaction_id=5&signature=abc&key_id=7&extra=1",
    )).toThrow("ADMOB_SSV_PARAMETER_ORDER_INVALID");
  });

  it("accepts a signed console probe without custom data", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });
    const signedQuery = [
      "ad_network=5450213213286189855",
      "ad_unit=1234567890",
      "reward_amount=12",
      "reward_item=color_chips",
      "timestamp=1785292800000",
      "transaction_id=test-transaction",
    ].join("&");
    const signature = sign("sha256", Buffer.from(signedQuery), privateKey);
    const parsed = parseAdMobSsvUrl(
      `/ads/admob/ssv?${signedQuery}&signature=${toBase64Url(signature)}&key_id=7`,
    );

    expect(parsed.payload.customData).toBeNull();
    expect(verify("sha256", parsed.signedContent, publicKey, parsed.signature)).toBe(true);
  });
});
