import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ApiError,
  fetchEconomy,
  openPaletteBox,
  purchaseCosmetic,
  type CosmeticItem,
  type CosmeticOutcome,
  type CosmeticRarity,
  type EconomyOverview,
} from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { SettingsPanel } from "../components/SettingsPanel";
import { localizedCosmeticName } from "../cosmetic-localization";
import { cosmeticBackground } from "../cosmetics";
import { useI18n } from "../i18n";

const rarityOrder: CosmeticRarity[] = ["common", "rare", "epic", "legendary"];

export function StorePage() {
  const { t, locale, formatNumber, formatDate } = useI18n();
  const [economy, setEconomy] = useState<EconomyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CosmeticOutcome | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void fetchEconomy()
      .then(setEconomy)
      .catch((error) => setMessage(error instanceof ApiError ? error.code : "상점을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const groupedItems = useMemo(() => {
    const groups = new Map<CosmeticRarity, CosmeticItem[]>();
    for (const rarity of rarityOrder) groups.set(rarity, []);
    for (const item of economy?.weeklyStore.items ?? []) {
      groups.get(item.rarity)?.push(item);
    }
    return groups;
  }, [economy]);

  const buy = async (item: CosmeticItem) => {
    setBusyId(item.id);
    setMessage(null);
    try {
      setEconomy(await purchaseCosmetic(item.id));
      setMessage(t("{name} 스킨을 구매했습니다.", {
        name: localizedCosmeticName(item, locale),
      }));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "구매를 처리하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const openBox = async () => {
    setBusyId("palette-box");
    setMessage(null);
    try {
      const nextOutcome = await openPaletteBox();
      setOutcome(nextOutcome);
      setEconomy(nextOutcome.overview);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "상자를 열지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="online-page app-frame store-page">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />
      <section className="store-shell app-content-shell" aria-labelledby="store-title">
        <header className="store-hero">
          <div>
            <p className="eyebrow">TANGO STORE</p>
            <h1 id="store-title">{t("색을 모으고 나만의 Tango를 만드세요.")}</h1>
            <p>{t("매주 바뀌는 스킨을 컬러 칩으로 구매하거나 팔레트 상자에서 파편을 모을 수 있습니다.")}</p>
          </div>
          <div className="chip-wallet" aria-label={t("컬러 칩 잔액")}>
            <span aria-hidden="true">◆</span>
            <small>{t("컬러 칩")}</small>
            <strong>{formatNumber(economy?.wallet.colorChips ?? 0)}</strong>
          </div>
        </header>

        {loading && <section className="store-empty">{t("상점을 불러오는 중입니다.")}</section>}
        {!loading && economy === null && (
          <section className="store-empty">
            <h2>{t("로그인하고 상점을 이용하세요.")}</h2>
            <p>{t("컬러 칩과 스킨은 Tango 계정에 안전하게 저장됩니다.")}</p>
            <Link className="primary-action" to="/account">{t("로그인")}</Link>
            {message && <p className="online-message">{t(message)}</p>}
          </section>
        )}

        {economy !== null && (
          <>
            <section className="store-section">
              <div className="store-section-heading">
                <div>
                  <p className="eyebrow">WEEKLY SELECTION</p>
                  <h2>{t("이번 주 스킨")}</h2>
                </div>
                <span>{t("{date}에 변경", { date: formatDate(economy.weeklyStore.endsAt) })}</span>
              </div>
              {rarityOrder.map((rarity) => (
                <div className="store-rarity-group" key={rarity}>
                  <h3 className={`rarity-${rarity}`}>{t(rarity)}</h3>
                  <div className="cosmetic-grid">
                    {(groupedItems.get(rarity) ?? []).map((item) => (
                      <article className={`cosmetic-card rarity-border-${rarity}`} key={item.id}>
                        <div
                          className="cosmetic-preview"
                          style={{
                            background: cosmeticBackground(item),
                            "--skin-primary": item.colors[0] ?? "#777",
                            "--skin-secondary": item.colors[1] ?? item.colors[0] ?? "#555",
                          } as React.CSSProperties}
                        >
                          <span />
                          <span />
                          <span />
                        </div>
                        <div>
                          <small>{t(item.category)}</small>
                          <h4>{localizedCosmeticName(item, locale)}</h4>
                          <p>{locale === "ko" ? item.descriptionKo : item.nameEn}</p>
                        </div>
                        <button
                          className={item.owned ? "secondary-action" : "primary-action"}
                          type="button"
                          disabled={item.owned || busyId !== null}
                          onClick={() => void buy(item)}
                        >
                          {item.owned
                            ? t("보유 중")
                            : t("{chips} 칩", { chips: formatNumber(item.chipPrice) })}
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="store-feature-grid">
              <article className="palette-box-card">
                <div className="palette-box-visual" aria-hidden="true">
                  <span>◆</span><span>◆</span><span>◆</span><span>◆</span>
                </div>
                <div>
                  <p className="eyebrow">PALETTE BOX</p>
                  <h2>{t("팔레트 상자")}</h2>
                  <p>{t("등급별 파편 또는 완성 스킨 하나를 획득합니다. 파편 4개를 모으면 같은 등급의 미보유 스킨을 얻습니다.")}</p>
                </div>
                <button
                  className="primary-action"
                  type="button"
                  disabled={busyId !== null || economy.wallet.colorChips < economy.box.priceChips}
                  onClick={() => void openBox()}
                >
                  {t("{chips} 칩으로 열기", { chips: formatNumber(economy.box.priceChips) })}
                </button>
                <details className="box-odds">
                  <summary>{t("획득 확률 보기")}</summary>
                  <ul>
                    {economy.box.outcomes.map((entry) => (
                      <li key={`${entry.type}-${entry.rarity}`}>
                        <span>{t(entry.rarity)} {t(entry.type === "fragment" ? "파편" : "스킨")}</span>
                        <strong>{entry.probability}%</strong>
                      </li>
                    ))}
                  </ul>
                </details>
              </article>

              <article className="locked-pack-card">
                <p className="eyebrow">FOUNDER & PREMIUM</p>
                <h2>{t("창립자 팩과 프리미엄")}</h2>
                <p>{t("정식 출시일이 정해지면 창립자 팩이 30일 동안 열립니다. 현재는 미리보기만 제공됩니다.")}</p>
                <span className="lock-pill">🔒 {t("정식 출시 전 잠금")}</span>
                <ul>
                  <li>{t("창립자 팩")} · ₩{formatNumber(economy.monetization.founderPack.referencePriceKrw)} · +{economy.monetization.founderPack.bonusChips} ◆</li>
                  <li>{t("창립자 한정 타일·프로필·승리 연출")}</li>
                  <li>{t("프리미엄 팩")} · ₩{formatNumber(economy.monetization.premiumPack.referencePriceKrw)}</li>
                  <li>{t("시간·목표 점수·관전 설정")}</li>
                </ul>
              </article>
            </section>

            <section className="store-section upcoming-cosmetics">
              <div className="store-section-heading">
                <div>
                  <p className="eyebrow">COMING NEXT</p>
                  <h2>{t("출시 예정 스킨")}</h2>
                </div>
              </div>
              <div className="cosmetic-category-grid">
                {economy.upcomingCategories.map((category) => (
                  <article key={category}>
                    <span>🔒</span>
                    <strong>{t(category)}</strong>
                    <small>{t("DB 구조 준비 완료 · 효과는 추후 제공")}</small>
                  </article>
                ))}
              </div>
            </section>

            {message && <p className="store-toast">{t(message)}</p>}
          </>
        )}
      </section>

      {outcome !== null && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setOutcome(null)}>
          <section className="box-result-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">PALETTE BOX OPEN</p>
            <div className={`box-result-gem rarity-${outcome.rarity}`}>◆</div>
            <h2>
              {outcome.cosmetic
                ? localizedCosmeticName(outcome.cosmetic, locale)
                : t("{rarity} 파편 1개", { rarity: t(outcome.rarity) })}
            </h2>
            <p>{outcome.cosmetic ? t("새로운 스킨을 획득했습니다.") : t("같은 등급 파편 4개를 모아 스킨을 합성하세요.")}</p>
            <button className="primary-action" type="button" onClick={() => setOutcome(null)}>{t("확인했어요")}</button>
          </section>
        </div>
      )}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
