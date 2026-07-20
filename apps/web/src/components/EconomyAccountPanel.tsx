import { useEffect, useState } from "react";
import {
  ApiError,
  fetchEconomy,
  redeemCoupon,
  type CouponRedemptionResult,
  type EconomyOverview,
} from "../api";
import { useI18n } from "../i18n";
import { localizedCosmeticName } from "../cosmetic-localization";
import { EconomyQuestGrid } from "./EconomyQuestGrid";
import { CosmeticPreview } from "./CosmeticPreview";
import { loadoutChangedEvent } from "./CosmeticLoadoutBridge";
import { TilePalettePanel } from "./TilePalettePanel";

export { filterOwnedTileItems } from "./TilePalettePanel";

export type AccountEconomyTab = "tiles" | "quests" | "records" | "benefits";

export function EconomyAccountPanel({ activeTab }: { activeTab: AccountEconomyTab }) {
  const { t, locale, formatNumber, formatDate } = useI18n();
  const [economy, setEconomy] = useState<EconomyOverview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponRedemptionResult | null>(null);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);

  useEffect(() => {
    void fetchEconomy().then(setEconomy).catch(() => undefined);
  }, []);

  const applyEconomy = (next: EconomyOverview) => {
    setEconomy(next);
    window.dispatchEvent(new CustomEvent(loadoutChangedEvent, { detail: next }));
  };

  const submitCoupon = async () => {
    if (couponCode.trim() === "") return;
    setBusy("coupon");
    setMessage(null);
    setCouponResult(null);
    try {
      const result = await redeemCoupon(couponCode);
      applyEconomy(result.economy);
      setCouponResult(result.redemption);
      setCouponCode("");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "쿠폰을 사용할 수 없습니다.");
    } finally {
      setBusy(null);
    }
  };

  if (economy === null) {
    return <section className="economy-account-panel loading">{t("상점을 불러오는 중입니다.")}</section>;
  }

  return (
    <section className="economy-account-panel">
      {activeTab === "tiles" && (
        <TilePalettePanel economy={economy} onEconomyChange={setEconomy} />
      )}

      {activeTab === "quests" && (
        <>
          <div className="economy-account-heading">
            <div>
              <p className="eyebrow">QUESTS</p>
              <h3>{t("퀘스트")}</h3>
            </div>
            <strong className="mini-chip-balance">◆ {formatNumber(economy.wallet.colorChips)}</strong>
          </div>
          <EconomyQuestGrid economy={economy} onEconomyChange={setEconomy} />
        </>
      )}

      {activeTab === "records" && (
        <>
          <div className="economy-account-heading">
            <div>
              <p className="eyebrow">CHIP LEDGER</p>
              <h3>{t("최근 획득·사용 기록")}</h3>
            </div>
            <strong className="mini-chip-balance">◆ {formatNumber(economy.wallet.colorChips)}</strong>
          </div>
          <div className="economy-ledger">
            {economy.ledger.length === 0 ? (
              <p className="online-message">{t("아직 컬러 칩 기록이 없습니다.")}</p>
            ) : economy.ledger.slice(0, ledgerExpanded ? economy.ledger.length : 5).map((entry) => (
              <div key={entry.id}>
                <span>
                  <strong>{t(entry.reason)}</strong>
                  <small>{formatDate(entry.createdAt)}</small>
                </span>
                <b className={entry.delta > 0 ? "credit" : "debit"}>
                  {entry.delta > 0 ? "+" : ""}{formatNumber(entry.delta)} ◆
                </b>
              </div>
            ))}
          </div>
          {economy.ledger.length > 5 && (
            <button className="history-more-button" type="button" onClick={() => setLedgerExpanded(!ledgerExpanded)}>
              {t(ledgerExpanded ? "접기" : "더보기")}
            </button>
          )}
        </>
      )}

      {activeTab === "benefits" && (
        <>
          <div className="economy-account-heading">
            <div>
              <p className="eyebrow">BENEFITS</p>
              <h3>{t("프리미엄과 창립자 혜택")}</h3>
            </div>
          </div>
          <div className="account-benefit-grid">
            <article>
              <strong>{t("창립자 팩")}</strong>
              <small>₩{formatNumber(economy.monetization.founderPack.referencePriceKrw)} · +{economy.monetization.founderPack.bonusChips} ◆</small>
              <b>🔒 {t(economy.monetization.founderPack.status === "ended" ? "판매 종료" : "출시 예정")}</b>
            </article>
            <article>
              <strong>{t("프리미엄 팩")}</strong>
              <small>₩{formatNumber(economy.monetization.premiumPack.referencePriceKrw)}</small>
              <b>🔒 {t("출시 예정")}</b>
            </article>
            <button type="button" disabled>{t("구매 복원")} · {t("출시 예정")}</button>
          </div>
          <section className="coupon-redeem-card">
            <div>
              <p className="eyebrow">COUPON</p>
              <h3>{t("쿠폰 등록")}</h3>
              <p>{t("쿠폰 코드를 입력해 보상을 받으세요.")}</p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void submitCoupon(); }}>
              <input
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                placeholder={t("쿠폰 코드")}
                maxLength={40}
                autoCapitalize="characters"
              />
              <button type="submit" disabled={busy !== null || couponCode.trim().length < 3}>
                {busy === "coupon" ? t("처리 중") : t("등록")}
              </button>
            </form>
          </section>
        </>
      )}

      {message && <p className="online-message">{t(message)}</p>}
      {couponResult !== null && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setCouponResult(null)}>
          <section className="confirm-panel coupon-result-panel" role="dialog" aria-modal="true" aria-labelledby="coupon-result-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">COUPON REWARD</p>
            <h2 id="coupon-result-title">{couponResult.coupon.name}</h2>
            <p>{t("쿠폰 보상을 받았습니다.")}</p>
            <div className="coupon-reward-grid">
              {couponResult.rewards.map((reward, index) => {
                const item = reward.cosmeticId
                  ? economy.catalog.find((candidate) => candidate.id === reward.cosmeticId)
                  : null;
                const label = reward.cosmeticName
                  ?? (reward.type === "color_chips"
                    ? `${t("컬러 칩")} ${reward.amount ?? 0}`
                    : reward.type === "palette_box_ticket"
                      ? `${t("팔레트 상자")} ${reward.amount ?? 0}`
                      : reward.type === "fragments"
                        ? `${t(reward.rarity ?? "common")} ${t("파편")} ${reward.amount ?? 0}`
                        : t("영구 프리미엄"));
                return (
                  <article key={`${reward.type}-${reward.cosmeticId ?? index}`}>
                    {item
                      ? <CosmeticPreview item={item} label={localizedCosmeticName(item, locale)} />
                      : <span className={`coupon-reward-icon reward-${reward.type}`} aria-hidden="true">
                          {reward.type === "color_chips" ? "◆" : reward.type === "palette_box_ticket" ? "◇" : reward.type === "fragments" ? "✦" : "★"}
                        </span>}
                    <strong>{label}</strong>
                    {reward.convertedToFragment && <small>{t("보유 중 · 파편으로 전환")}</small>}
                  </article>
                );
              })}
            </div>
            <button className="primary-action" type="button" onClick={() => setCouponResult(null)}>{t("확인했어요")}</button>
          </section>
        </div>
      )}

    </section>
  );
}
