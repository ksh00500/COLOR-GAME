import { useEffect, useState } from "react";
import {
  ApiError,
  combineCosmeticFragments,
  equipTileColor,
  fetchEconomy,
  redeemCoupon,
  resetTileColor,
  type CosmeticItem,
  type CosmeticOutcome,
  type CosmeticRarity,
  type CouponRedemptionResult,
  type EconomyOverview,
  type TileLoadoutSlot,
} from "../api";
import { localizedCosmeticName } from "../cosmetic-localization";
import { useI18n } from "../i18n";
import { EconomyQuestGrid } from "./EconomyQuestGrid";
import { TileSkinPreview } from "./TileSkinPreview";
import { CosmeticOutcomeModal } from "./CosmeticOutcomeModal";

export type AccountEconomyTab = "tiles" | "quests" | "records" | "benefits";

const rarities: CosmeticRarity[] = ["common", "rare", "epic", "legendary"];
const tileSlots: Array<{
  key: TileLoadoutSlot;
  label: string;
  defaultName: string;
}> = [
  { key: "colorA", label: "빨강 슬롯", defaultName: "기본 버건디" },
  { key: "colorB", label: "파랑 슬롯", defaultName: "기본 네이비" },
  { key: "colorC", label: "초록 슬롯", defaultName: "기본 그린" },
];

export function EconomyAccountPanel({ activeTab }: { activeTab: AccountEconomyTab }) {
  const { t, locale, formatNumber, formatDate } = useI18n();
  const [economy, setEconomy] = useState<EconomyOverview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CosmeticOutcome | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TileLoadoutSlot>("colorA");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponRedemptionResult | null>(null);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);
  const [similarWarning, setSimilarWarning] = useState<{
    slot: TileLoadoutSlot;
    item: CosmeticItem;
  } | null>(null);

  useEffect(() => {
    void fetchEconomy().then(setEconomy).catch(() => undefined);
  }, []);

  const applyEconomy = (next: EconomyOverview) => {
    setEconomy(next);
    window.localStorage.setItem("tango-cosmetic-loadout", JSON.stringify(next.loadout));
    window.dispatchEvent(new CustomEvent("tango:loadout-changed"));
  };

  const combine = async (rarity: CosmeticRarity) => {
    setBusy(`combine-${rarity}`);
    setMessage(null);
    try {
      const result = await combineCosmeticFragments(rarity);
      setOutcome(result);
      setEconomy(result.overview);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "파편을 합성하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const equip = async (
    slot: TileLoadoutSlot,
    item: CosmeticItem,
    allowSimilar = false,
  ) => {
    setBusy(`${slot}:${item.id}`);
    setMessage(null);
    try {
      applyEconomy(await equipTileColor(slot, item.id, allowSimilar));
      setSimilarWarning(null);
    } catch (error) {
      if (error instanceof ApiError && error.code === "TILE_COLORS_TOO_SIMILAR" && !allowSimilar) {
        setSimilarWarning({ slot, item });
      } else {
        setMessage(error instanceof ApiError ? error.code : "스킨을 장착하지 못했습니다.");
      }
    } finally {
      setBusy(null);
    }
  };

  const reset = async (slot: TileLoadoutSlot) => {
    setBusy(`reset:${slot}`);
    setMessage(null);
    try {
      applyEconomy(await resetTileColor(slot));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "기본 타일로 복원하지 못했습니다.");
    } finally {
      setBusy(null);
    }
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

  const ownedTiles = economy.inventory.filter((item) => item.equipSlot === "tile_color");

  return (
    <section className="economy-account-panel">
      {activeTab === "tiles" && (
        <>
          <div className="economy-account-heading">
            <div>
              <p className="eyebrow">TILE LOADOUT</p>
              <h3>{t("세 가지 기본 색을 내 타일로 바꾸세요")}</h3>
            </div>
            <strong className="mini-chip-balance">◆ {formatNumber(economy.wallet.colorChips)}</strong>
          </div>

          <div className="tile-loadout-grid">
            {tileSlots.map((slot) => {
              const item = ownedTiles.find((entry) => entry.id === economy.loadout[slot.key]);
              return (
                <article className={selectedSlot === slot.key ? "selected" : ""} key={slot.key}>
                  <button type="button" onClick={() => setSelectedSlot(slot.key)}>
                    <TileSkinPreview
                      {...(item ? { item } : {})}
                      defaultSlot={slot.key}
                      label={t(slot.label)}
                    />
                    <span>
                      <small>{t(slot.label)}</small>
                      <strong>{item ? localizedCosmeticName(item, locale) : t(slot.defaultName)}</strong>
                    </span>
                  </button>
                  <button
                    className="loadout-reset"
                    type="button"
                    disabled={!item || busy !== null}
                    onClick={() => void reset(slot.key)}
                  >
                    {t("기본으로 복원")}
                  </button>
                </article>
              );
            })}
          </div>

          <div className="inventory-heading">
            <div>
              <h3>{t("보유 타일")}</h3>
              <p>{t("타일 하나를 선택한 슬롯에 장착합니다.")}</p>
            </div>
            <strong>{t(tileSlots.find((slot) => slot.key === selectedSlot)?.label ?? "빨강 슬롯")}</strong>
          </div>
          {ownedTiles.length === 0 ? (
            <p className="online-message">{t("아직 보유한 스킨이 없습니다. 상점에서 첫 스킨을 만나보세요.")}</p>
          ) : (
            <div className="owned-tile-grid">
              {ownedTiles.map((item) => {
                const equippedHere = economy.loadout[selectedSlot] === item.id;
                const equippedElsewhere = item.equippedSlots.some((slot) => slot !== selectedSlot);
                return (
                  <article key={item.id}>
                    <TileSkinPreview item={item} label={localizedCosmeticName(item, locale)} />
                    <span>
                      <strong>{localizedCosmeticName(item, locale)}</strong>
                      <small>{t(item.rarity)} · {t(item.visualKind)}</small>
                    </span>
                    <button
                      type="button"
                      className={equippedHere ? "active" : ""}
                      disabled={equippedHere || equippedElsewhere || busy !== null}
                      onClick={() => void equip(selectedSlot, item)}
                    >
                      {equippedHere ? t("장착 중") : equippedElsewhere ? t("다른 슬롯 사용 중") : t("장착")}
                    </button>
                    {item.isNew && (
                      <span className="new-cosmetic-badge" title={t("새로 획득한 스킨")}>!</span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "quests" && (
        <>
          <div className="economy-account-heading">
            <div>
              <p className="eyebrow">QUEST & FRAGMENTS</p>
              <h3>{t("퀘스트와 파편")}</h3>
            </div>
            <strong className="mini-chip-balance">◆ {formatNumber(economy.wallet.colorChips)}</strong>
          </div>
          <EconomyQuestGrid economy={economy} onEconomyChange={setEconomy} />
          <h3>{t("등급별 파편")}</h3>
          <div className="fragment-grid">
            {rarities.map((rarity) => (
              <article className={`fragment-card rarity-border-${rarity}`} key={rarity}>
                <span className={`fragment-gem rarity-${rarity}`}>◆</span>
                <div>
                  <strong>{t(rarity)}</strong>
                  <small>{economy.fragments[rarity]}/{economy.box.fragmentRequirement}</small>
                </div>
                <button
                  type="button"
                  disabled={economy.fragments[rarity] < economy.box.fragmentRequirement || busy !== null}
                  onClick={() => void combine(rarity)}
                >
                  {t("합성")}
                </button>
              </article>
            ))}
          </div>
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
      {outcome !== null && (
        <CosmeticOutcomeModal
          outcome={outcome}
          source="combine"
          onClose={() => setOutcome(null)}
        />
      )}
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
                      ? <TileSkinPreview item={item} label={localizedCosmeticName(item, locale)} />
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

      {similarWarning && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSimilarWarning(null)}>
          <section className="confirm-panel tile-similarity-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">COLOR WARNING</p>
            <TileSkinPreview item={similarWarning.item} label={localizedCosmeticName(similarWarning.item, locale)} />
            <h2>{t("기존 타일과 색이 비슷합니다.")}</h2>
            <p>{t("색각 보조 도형은 유지됩니다. 그래도 이 조합을 사용하시겠어요?")}</p>
            <div className="confirm-actions">
              <button className="secondary-action" type="button" onClick={() => setSimilarWarning(null)}>{t("취소")}</button>
              <button className="primary-action" type="button" onClick={() => void equip(similarWarning.slot, similarWarning.item, true)}>{t("그래도 장착")}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
