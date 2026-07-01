import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ApiError,
  fetchEconomy,
  getAuthToken,
  getCachedEconomy,
  openPaletteBox,
  purchaseCosmetic,
  type CosmeticItem,
  type CosmeticOutcome,
  type CosmeticRarity,
  type EconomyOverview,
} from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { SettingsPanel } from "../components/SettingsPanel";
import { TileSkinPreview } from "../components/TileSkinPreview";
import { CosmeticOutcomeModal } from "../components/CosmeticOutcomeModal";
import { localizedCosmeticName } from "../cosmetic-localization";
import { useI18n } from "../i18n";

const rarityOrder: CosmeticRarity[] = ["common", "rare", "epic", "legendary"];
const compactRarityLabels: Record<CosmeticRarity, string> = {
  common: "일반",
  rare: "희귀",
  epic: "영웅",
  legendary: "전설",
};
type StoreTab = "weekly" | "collection" | "box" | "upcoming";
type CollectionRarity = CosmeticRarity | "all";

export function StorePage() {
  const { t, locale, formatNumber, formatDate } = useI18n();
  const rarityLabel = (value: CosmeticRarity) =>
    locale === "ko" ? compactRarityLabels[value] : t(value);
  const [economy, setEconomy] = useState<EconomyOverview | null>(
    () => getAuthToken() === null ? null : getCachedEconomy(),
  );
  const [loading, setLoading] = useState(
    () => getAuthToken() !== null && getCachedEconomy() === null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CosmeticOutcome | null>(null);
  const [purchaseCandidate, setPurchaseCandidate] = useState<CosmeticItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<StoreTab>("weekly");
  const [rarity, setRarity] = useState<CosmeticRarity>("common");
  const [collectionRarity, setCollectionRarity] = useState<CollectionRarity>("all");
  const [wideCatalog, setWideCatalog] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 901px)").matches,
  );

  useEffect(() => {
    if (getAuthToken() === null) {
      setLoading(false);
      return;
    }

    void fetchEconomy({ force: true })
      .then(setEconomy)
      .catch((error) => setMessage(error instanceof ApiError ? error.code : "상점을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 901px)");
    const updateCatalogMode = () => setWideCatalog(media.matches);
    updateCatalogMode();
    media.addEventListener("change", updateCatalogMode);
    return () => media.removeEventListener("change", updateCatalogMode);
  }, []);

  const buy = async (item: CosmeticItem) => {
    setBusyId(item.id);
    setMessage(null);
    try {
      setEconomy(await purchaseCosmetic(item.id));
      setPurchaseCandidate(null);
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

  const tileCard = (item: CosmeticItem) => (
    <article className={`cosmetic-card rarity-border-${item.rarity}`} key={item.id}>
      <TileSkinPreview
        item={item}
        className="store-tile-preview"
        label={localizedCosmeticName(item, locale)}
      />
      <div className="cosmetic-card-copy">
        <small>{t(item.visualKind)}</small>
        <h4>{localizedCosmeticName(item, locale)}</h4>
        <p>{locale === "ko" ? item.descriptionKo : item.nameEn}</p>
      </div>
      <button
        className={item.owned ? "secondary-action" : "primary-action"}
        type="button"
        disabled={item.owned || busyId !== null}
        onClick={() => setPurchaseCandidate(item)}
      >
        {item.owned
          ? t("보유 중")
          : t("{chips} 칩", { chips: formatNumber(item.chipPrice) })}
      </button>
    </article>
  );

  return (
    <main className="online-page app-frame store-page">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />
      <section className="store-shell app-content-shell" aria-labelledby="store-title">
        <header className="store-hero">
          <div>
            <p className="eyebrow">TANGO STORE</p>
            <h1 id="store-title">{t("타일 컬러 상점")}</h1>
            <p>{t("타일 하나를 구매해 빨강·파랑·초록 슬롯 중 원하는 곳에 장착하세요.")}</p>
          </div>
          <div className="chip-wallet" aria-label={t("컬러 칩 잔액")}>
            <span aria-hidden="true">◆</span>
            <small>{t("컬러 칩")}</small>
            <strong>{economy === null ? "—" : formatNumber(economy.wallet.colorChips)}</strong>
          </div>
        </header>

        {loading && (
          <section className="route-loading store-route-loading" aria-label={t("상점을 불러오는 중입니다.")} aria-busy="true">
            <span className="route-loading-title" />
            <span className="route-loading-line" />
            <div className="route-loading-grid">
              <span /><span /><span /><span />
            </div>
          </section>
        )}
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
            <nav className="store-tabs" aria-label={t("상점 메뉴")}>
              {([
                ["weekly", "주간 타일"],
                ["collection", "스킨 도감"],
                ["box", "팔레트 상자"],
                ["upcoming", "출시 예정"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={storeTab === key ? "active" : ""}
                  onClick={() => setStoreTab(key)}
                >
                  {t(label)}
                </button>
              ))}
            </nav>

            {storeTab === "weekly" && (
              <section className="store-section weekly-store-section">
                <div className="store-section-heading">
                  <div>
                    <p className="eyebrow">WEEKLY SELECTION</p>
                    <h2>{t("이번 주 타일")}</h2>
                  </div>
                  <span>{t("{date}에 변경", { date: formatDate(economy.weeklyStore.endsAt) })}</span>
                </div>
                {wideCatalog ? (
                  <div className="store-expanded-catalog">
                    {rarityOrder.map((entry) => {
                      const items = economy.weeklyStore.items.filter((item) => item.rarity === entry);
                      return (
                        <section className={`store-rarity-row rarity-${entry}`} key={entry}>
                          <div className="store-rarity-heading">
                            <strong>{rarityLabel(entry)}</strong>
                            <small>{items.length}</small>
                          </div>
                          <div className="cosmetic-grid">
                            {items.map(tileCard)}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className="rarity-tabs" role="tablist" aria-label={t("등급")}>
                      {rarityOrder.map((entry) => (
                        <button
                          key={entry}
                          type="button"
                          role="tab"
                          aria-selected={rarity === entry}
                          className={`${rarity === entry ? "active" : ""} rarity-${entry}`}
                          onClick={() => setRarity(entry)}
                        >
                          <span className="rarity-label-full">{rarityLabel(entry)}</span>
                          <span className="rarity-label-compact">{rarityLabel(entry)}</span>
                          <small>{economy.weeklyStore.items.filter((item) => item.rarity === entry).length}</small>
                        </button>
                      ))}
                    </div>
                    <div className="cosmetic-grid">
                      {economy.weeklyStore.items.filter((item) => item.rarity === rarity).map(tileCard)}
                    </div>
                  </>
                )}
              </section>
            )}

            {storeTab === "collection" && (
              <section className="store-section collection-section">
                <div className="collection-heading">
                  <div>
                    <p className="eyebrow">TILE COLLECTION</p>
                    <h2>{t("스킨 도감")}</h2>
                    <p>{t("Tango의 타일 스킨을 모아 도감을 완성하세요.")}</p>
                  </div>
                  <div className="collection-progress">
                    <strong>
                      {formatNumber(economy.catalog.filter((item) => item.owned).length)}
                      <small> / {formatNumber(economy.catalog.length)}</small>
                    </strong>
                    <span>{t("수집 완료")}</span>
                  </div>
                </div>

                <nav className="collection-filters" aria-label={t("도감 등급 필터")}>
                  {(["all", ...rarityOrder] as const).map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      className={collectionRarity === entry ? "active" : ""}
                      onClick={() => setCollectionRarity(entry)}
                    >
                      {entry === "all" ? t("모두") : rarityLabel(entry)}
                      <small>
                        {economy.catalog.filter((item) => entry === "all" || item.rarity === entry).length}
                      </small>
                    </button>
                  ))}
                </nav>

                <div className="collection-grid">
                  {economy.catalog
                    .filter((item) => collectionRarity === "all" || item.rarity === collectionRarity)
                    .map((item) => (
                      <article
                        className={`collection-card rarity-border-${item.rarity}${item.owned ? " owned" : " locked"}`}
                        key={item.id}
                      >
                        <TileSkinPreview
                          item={item}
                          className="collection-tile-preview"
                          label={localizedCosmeticName(item, locale)}
                        />
                        <span>
                          <small>{rarityLabel(item.rarity)}</small>
                          <strong>{localizedCosmeticName(item, locale)}</strong>
                        </span>
                        <b>{item.owned ? `✓ ${t("보유 중")}` : `🔒 ${t("미보유")}`}</b>
                      </article>
                    ))}
                </div>
              </section>
            )}

            {storeTab === "box" && (
              <section className="store-feature-grid single-feature">
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
                  disabled={busyId !== null || (economy.boxTickets < 1 && economy.wallet.colorChips < economy.box.priceChips)}
                  onClick={() => void openBox()}
                >
                  {economy.boxTickets > 0
                    ? t("상자 이용권으로 열기 ({count}개 보유)", { count: formatNumber(economy.boxTickets) })
                    : t("{chips} 칩으로 열기", { chips: formatNumber(economy.box.priceChips) })}
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
              </section>
            )}

            {storeTab === "upcoming" && (
              <section className="store-feature-grid">
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
                <article className="locked-pack-card upcoming-cosmetics">
                  <p className="eyebrow">COMING NEXT</p>
                  <h2>{t("출시 예정 스킨")}</h2>
                  <div className="cosmetic-category-grid">
                    {economy.upcomingCategories.map((category) => (
                      <article key={category}>
                        <span>🔒</span>
                        <strong>{t(category)}</strong>
                        <small>{t("출시 예정")}</small>
                      </article>
                    ))}
                  </div>
                </article>
              </section>
            )}

            {message && <p className="store-toast">{t(message)}</p>}
          </>
        )}
      </section>

      {outcome !== null && (
        <CosmeticOutcomeModal
          outcome={outcome}
          source="box"
          onClose={() => setOutcome(null)}
          onAgain={() => {
            setOutcome(null);
            void openBox();
          }}
          againDisabled={
            busyId !== null
            || (outcome.overview.boxTickets < 1
              && outcome.overview.wallet.colorChips < outcome.overview.box.priceChips)
          }
        />
      )}
      {purchaseCandidate !== null && economy !== null && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPurchaseCandidate(null)}>
          <section className="confirm-panel store-purchase-panel" role="dialog" aria-modal="true" aria-labelledby="purchase-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">CONFIRM PURCHASE</p>
            <TileSkinPreview
              item={purchaseCandidate}
              className="purchase-tile-preview"
              label={localizedCosmeticName(purchaseCandidate, locale)}
            />
            <h2 id="purchase-title">{localizedCosmeticName(purchaseCandidate, locale)}</h2>
            <p>{t("{chips}칩을 사용해 이 타일을 구매할까요?", {
              chips: formatNumber(purchaseCandidate.chipPrice),
            })}</p>
            <small>{t("보유 칩 {chips}", { chips: formatNumber(economy.wallet.colorChips) })}</small>
            <div className="confirm-actions">
              <button className="secondary-action" type="button" onClick={() => setPurchaseCandidate(null)}>{t("취소")}</button>
              <button
                className="primary-action"
                type="button"
                disabled={busyId !== null || economy.wallet.colorChips < purchaseCandidate.chipPrice}
                onClick={() => void buy(purchaseCandidate)}
              >
                {t("구매 확정")}
              </button>
            </div>
          </section>
        </div>
      )}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
