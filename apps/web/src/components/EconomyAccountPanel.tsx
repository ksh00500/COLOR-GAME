import { useEffect, useState } from "react";
import {
  ApiError,
  claimEconomyQuest,
  combineCosmeticFragments,
  equipTileColor,
  fetchEconomy,
  type CosmeticOutcome,
  type CosmeticRarity,
  type EconomyOverview,
  type TileLoadoutSlot,
} from "../api";
import { localizedCosmeticName } from "../cosmetic-localization";
import { cosmeticBackground } from "../cosmetics";
import { useI18n } from "../i18n";

const rarities: CosmeticRarity[] = ["common", "rare", "epic", "legendary"];
const tileSlots: Array<{ key: TileLoadoutSlot; label: string }> = [
  { key: "colorA", label: "빨강 슬롯" },
  { key: "colorB", label: "파랑 슬롯" },
  { key: "colorC", label: "초록 슬롯" },
];
const questLabels = {
  welcome: "신규 계정 보상",
  attendance: "오늘의 출석",
  attendance_streak: "7일 연속 출석",
  online_matches: "온라인 대전 보상",
  first_online_win: "오늘의 첫 승리",
  reward_ad: "선택형 보상 광고",
} as const;
const claimRoutes = {
  welcome: "welcome",
  attendance: "attendance",
  attendance_streak: "attendance-streak",
  first_online_win: "first-online-win",
} as const;

export function EconomyAccountPanel() {
  const { t, locale, formatNumber, formatDate } = useI18n();
  const [economy, setEconomy] = useState<EconomyOverview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CosmeticOutcome | null>(null);

  useEffect(() => {
    void fetchEconomy().then(setEconomy).catch(() => undefined);
  }, []);

  const claim = async (quest: keyof typeof claimRoutes) => {
    setBusy(quest);
    setMessage(null);
    try {
      const result = await claimEconomyQuest(claimRoutes[quest]);
      setEconomy(result.economy);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "보상을 받지 못했습니다.");
    } finally {
      setBusy(null);
    }
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

  const equip = async (slot: TileLoadoutSlot, cosmeticId: string) => {
    setBusy(`${slot}:${cosmeticId}`);
    setMessage(null);
    try {
      const next = await equipTileColor(slot, cosmeticId);
      setEconomy(next);
      window.localStorage.setItem("tango-cosmetic-loadout", JSON.stringify(next.loadout));
      window.dispatchEvent(new CustomEvent("tango:loadout-changed"));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "스킨을 장착하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  if (economy === null) return null;

  return (
    <section className="economy-account-panel">
      <div className="economy-account-heading">
        <div>
          <p className="eyebrow">MY TANGO</p>
          <h3>{t("컬러 칩과 내 스킨")}</h3>
        </div>
        <strong className="mini-chip-balance">◆ {formatNumber(economy.wallet.colorChips)}</strong>
      </div>

      <div className="quest-grid">
        {economy.quests.map((quest) => {
          const canClaim = quest.key in claimRoutes;
          return (
            <article key={`${quest.key}:${quest.cycleKey}`}>
              <span>
                <strong>{t(questLabels[quest.key])}</strong>
                <small>{quest.progress}/{quest.goal} · +{quest.rewardChips} ◆</small>
              </span>
              {canClaim ? (
                <button
                  type="button"
                  disabled={!quest.claimable || busy !== null}
                  onClick={() => void claim(quest.key as keyof typeof claimRoutes)}
                >
                  {t(quest.claimed ? "완료" : quest.claimable ? "받기" : "진행 중")}
                </button>
              ) : quest.key === "reward_ad" ? (
                <b>🔒 {t("출시 예정")}</b>
              ) : (
                <b>{t(quest.claimed ? "완료" : "자동 지급")}</b>
              )}
            </article>
          );
        })}
      </div>

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

      <h3>{t("보유 타일 색")}</h3>
      {economy.inventory.filter((item) => item.equipSlot === "tile_color").length === 0 ? (
        <p className="online-message">{t("아직 보유한 스킨이 없습니다. 상점에서 첫 스킨을 만나보세요.")}</p>
      ) : (
        <div className="inventory-grid tile-inventory-grid">
          {economy.inventory.filter((item) => item.equipSlot === "tile_color").map((item) => (
            <article key={item.id}>
              <span className="inventory-swatch" style={{ background: cosmeticBackground(item) }} />
              <span>
                <strong>{localizedCosmeticName(item, locale)}</strong>
                <small>{t(item.rarity)} · {t(item.visualKind)}</small>
              </span>
              <div className="tile-slot-actions">
                {tileSlots.map((slot) => (
                  <button
                    type="button"
                    key={slot.key}
                    className={item.equippedSlots.includes(slot.key) ? "active" : ""}
                    disabled={item.equippedSlots.includes(slot.key) || busy !== null}
                    onClick={() => void equip(slot.key, item.id)}
                    title={t(slot.label)}
                  >
                    {slot.key.slice(-1)}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <h3>{t("최근 획득·사용 기록")}</h3>
      <div className="economy-ledger">
        {economy.ledger.length === 0 ? (
          <p className="online-message">{t("아직 컬러 칩 기록이 없습니다.")}</p>
        ) : economy.ledger.map((entry) => (
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

      {message && <p className="online-message">{t(message)}</p>}
      {outcome?.cosmetic && (
        <p className="economy-unlock-message">
          {t("{name} 스킨을 획득했습니다.", {
            name: localizedCosmeticName(outcome.cosmetic, locale),
          })}
        </p>
      )}
    </section>
  );
}
