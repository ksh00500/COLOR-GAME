import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ApiError,
  craftCosmetic,
  equipStyleCosmetic,
  fetchEconomy,
  getAuthToken,
  getCachedEconomy,
  openPaletteBox,
  purchaseCosmetic,
  setCosmeticWishlist,
  type CraftCategory,
  type CosmeticItem,
  type CosmeticOutcome,
  type CosmeticRarity,
  type EconomyOverview,
} from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { SettingsPanel } from "../components/SettingsPanel";
import { CosmeticPreview } from "../components/CosmeticPreview";
import { CosmeticOutcomeModal } from "../components/CosmeticOutcomeModal";
import { loadoutChangedEvent } from "../components/CosmeticLoadoutBridge";
import { localizedCosmeticName } from "../cosmetic-localization";
import { useI18n } from "../i18n";

const rarityOrder: CosmeticRarity[] = ["common", "rare", "epic", "legendary"];
const compactRarityLabels: Record<CosmeticRarity, string> = {
  common: "일반",
  rare: "희귀",
  epic: "영웅",
  legendary: "전설",
};
type StoreTab = "weekly" | "atelier" | "collection" | "box" | "upcoming";
type CollectionRarity = CosmeticRarity | "all";
const craftCategories: CraftCategory[] = ["tile_color", "board_theme", "placement_effect", "score_effect", "victory_effect"];
const categoryLabels: Record<CraftCategory, string> = {
  tile_color: "타일",
  board_theme: "게임판",
  placement_effect: "배치 효과",
  score_effect: "득점 효과",
  victory_effect: "승리 연출",
};
const styleSlots = {
  board_theme: "boardTheme",
  placement_effect: "placementEffect",
  score_effect: "scoreEffect",
  victory_effect: "victoryEffect",
} as const;

export function StorePage() {
  const { t, locale, formatNumber, formatDate } = useI18n();
  const [searchParams] = useSearchParams();
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
  const [outcomeSource, setOutcomeSource] = useState<"box" | "combine">("box");
  const [purchaseCandidate, setPurchaseCandidate] = useState<CosmeticItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<StoreTab>(() => {
    const tab = searchParams.get("tab");
    return tab === "atelier" || tab === "collection" || tab === "box" || tab === "upcoming"
      ? tab
      : "weekly";
  });
  const [rarity, setRarity] = useState<CosmeticRarity>(() => {
    const requested = searchParams.get("rarity");
    return rarityOrder.includes(requested as CosmeticRarity)
      ? requested as CosmeticRarity
      : "common";
  });
  const [collectionRarity, setCollectionRarity] = useState<CollectionRarity>("all");
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [category, setCategory] = useState<CraftCategory>("tile_color");
  const [craftMode, setCraftMode] = useState<"random" | "targeted">("random");
  const [craftTarget, setCraftTarget] = useState<string | null>(null);
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
      const nextOutcome = await openPaletteBox(category);
      setOutcomeSource("box");
      setOutcome(nextOutcome);
      setEconomy(nextOutcome.overview);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "상자를 열지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const craft = async () => {
    setBusyId("atelier");
    setMessage(null);
    try {
      const nextOutcome = await craftCosmetic(
        craftMode,
        category,
        rarity,
        craftTarget ?? undefined,
      );
      setOutcomeSource("combine");
      setOutcome(nextOutcome);
      setEconomy(nextOutcome.overview);
      setCraftTarget(null);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "제작을 완료하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleWishlist = async (item: CosmeticItem) => {
    setBusyId(`wish:${item.id}`);
    try {
      setEconomy(await setCosmeticWishlist(item.id, !item.wishlisted));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "찜 목록을 변경하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const equip = async (item: CosmeticItem) => {
    if (item.category === "tile_color" || item.category === "profile") return;
    setBusyId(`equip:${item.id}`);
    try {
      const slot = styleSlots[item.category];
      const next = await equipStyleCosmetic(slot, item.id);
      setEconomy(next);
      window.dispatchEvent(new CustomEvent(loadoutChangedEvent, { detail: next }));
      setMessage(t("{name}을 장착했습니다.", { name: localizedCosmeticName(item, locale) }));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "장착하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const cosmeticCard = (item: CosmeticItem) => (
    <article className={`cosmetic-card rarity-border-${item.rarity}`} key={item.id}>
      <button
        className={`cosmetic-wishlist-button${item.wishlisted ? " active" : ""}`}
        type="button"
        aria-label={item.wishlisted ? t("찜 해제") : t("찜하기")}
        onClick={() => void toggleWishlist(item)}
      >{item.wishlisted ? "★" : "☆"}</button>
      <CosmeticPreview
        item={item}
        className="store-tile-preview"
        label={localizedCosmeticName(item, locale)}
      />
      <div className="cosmetic-card-copy">
        <small>{t(categoryLabels[item.category as CraftCategory] ?? item.visualKind)}</small>
        <h4>{localizedCosmeticName(item, locale)}</h4>
        <p>{locale === "ko" ? item.descriptionKo : item.nameEn}</p>
      </div>
      {item.owned && item.category !== "tile_color" && item.category !== "profile" ? (
        <button className="secondary-action" type="button" disabled={busyId !== null} onClick={() => void equip(item)}>
          {economy?.styleLoadout[styleSlots[item.category]] === item.id ? t("장착 중") : t("장착")}
        </button>
      ) : <button
        className={item.owned ? "secondary-action" : "primary-action"}
        type="button"
        disabled={item.owned || busyId !== null}
        onClick={() => setPurchaseCandidate(item)}
      >
        {item.owned
          ? t("보유 중")
          : t("{chips} 칩", { chips: formatNumber(item.chipPrice) })}
      </button>}
    </article>
  );

  return (
    <main className="online-page app-frame store-page">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />
      <section className="store-shell app-content-shell" aria-labelledby="store-title">
        <header className="store-hero">
          <div>
            <p className="eyebrow">TANGO STORE</p>
            <h1 id="store-title">{t("Tango 꾸미기 상점")}</h1>
            <p>{t("타일·게임판·배치·득점·승리 스타일을 나만의 조합으로 완성하세요.")}</p>
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
                ["weekly", "주간 상점"],
                ["atelier", "Tango 공방"],
                ["collection", "스킨 도감"],
                ["box", "아틀리에 상자"],
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
                    <h2>{t("이번 주 꾸미기")}</h2>
                  </div>
                  <span>{t("{date}에 변경", { date: formatDate(economy.weeklyStore.endsAt) })}</span>
                </div>
                <nav className="atelier-category-tabs" aria-label={t("꾸미기 카테고리")}>
                  {craftCategories.map((entry) => (
                    <button key={entry} type="button" className={category === entry ? "active" : ""} onClick={() => setCategory(entry)}>
                      {t(categoryLabels[entry])}
                    </button>
                  ))}
                </nav>
                {wideCatalog ? (
                  <div className="store-expanded-catalog">
                    {rarityOrder.map((entry) => {
                      const items = economy.weeklyStore.items.filter((item) => item.category === category && item.rarity === entry);
                      if (items.length === 0) return null;
                      return (
                        <section className={`store-rarity-row rarity-${entry}`} key={entry}>
                          <div className="store-rarity-heading">
                            <strong>{rarityLabel(entry)}</strong>
                            <small>{items.length}</small>
                          </div>
                          <div className="cosmetic-grid">
                            {items.map(cosmeticCard)}
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
                          <small>{economy.weeklyStore.items.filter((item) => item.category === category && item.rarity === entry).length}</small>
                        </button>
                      ))}
                    </div>
                    <div className="cosmetic-grid">
                      {economy.weeklyStore.items.filter((item) => item.category === category && item.rarity === rarity).map(cosmeticCard)}
                    </div>
                  </>
                )}
              </section>
            )}

            {storeTab === "atelier" && (
              <section className="store-section atelier-section">
                <div className="store-section-heading">
                  <div><p className="eyebrow">TANGO ATELIER</p><h2>{t("Tango 공방")}</h2></div>
                  <span>{t("파편으로 원하는 꾸미기를 제작하세요.")}</span>
                </div>
                <nav className="atelier-category-tabs" aria-label={t("제작 카테고리")}>
                  {craftCategories.map((entry) => (
                    <button key={entry} type="button" className={category === entry ? "active" : ""} onClick={() => { setCategory(entry); setCraftTarget(null); }}>
                      {t(categoryLabels[entry])}
                    </button>
                  ))}
                </nav>
                <div className="atelier-layout">
                  <div>
                    <div className="rarity-tabs" role="tablist" aria-label={t("등급")}>
                      {rarityOrder.map((entry) => (
                        <button key={entry} type="button" role="tab" aria-selected={rarity === entry} className={`${rarity === entry ? "active" : ""} rarity-${entry}`} onClick={() => { setRarity(entry); setCraftTarget(null); }}>
                          {rarityLabel(entry)} <small>{economy.fragments[entry]}</small>
                        </button>
                      ))}
                    </div>
                    {craftMode === "targeted" && (
                      <div className="atelier-target-grid">
                        {economy.catalog.filter((item) => item.category === category && item.rarity === rarity && !item.owned).map((item) => (
                          <button key={item.id} type="button" className={`atelier-target-card${craftTarget === item.id ? " selected" : ""}`} onClick={() => setCraftTarget(item.id)}>
                            <CosmeticPreview item={item} label={localizedCosmeticName(item, locale)} />
                            <strong>{localizedCosmeticName(item, locale)}</strong>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <aside className="atelier-control-card">
                    <div className="atelier-mode-tabs">
                      <button type="button" className={craftMode === "random" ? "active" : ""} onClick={() => setCraftMode("random")}>{t("무작위 제작")}</button>
                      <button type="button" className={craftMode === "targeted" ? "active" : ""} onClick={() => setCraftMode("targeted")}>{t("지정 제작")}</button>
                    </div>
                    <h3>{t(categoryLabels[category])} · {rarityLabel(rarity)}</h3>
                    <p>{craftMode === "random" ? t("미보유 상품 하나를 무작위로 제작합니다.") : t("선택한 상품을 확정 제작합니다.")}</p>
                    <strong>{t("필요 파편 {count}개", { count: craftMode === "random" ? 4 : 8 })}</strong>
                    <button className="primary-action" type="button" disabled={busyId !== null || economy.fragments[rarity] < (craftMode === "random" ? 4 : 8) || (craftMode === "targeted" && craftTarget === null)} onClick={() => void craft()}>
                      {t("제작하기")}
                    </button>
                  </aside>
                </div>
              </section>
            )}

            {storeTab === "collection" && (
              <section className="store-section collection-section">
                <div className="collection-heading">
                  <div>
                    <p className="eyebrow">TILE COLLECTION</p>
                    <h2>{t("스킨 도감")}</h2>
                    <p>{t("Tango의 모든 꾸미기와 테마 컬렉션을 확인하세요.")}</p>
                  </div>
                  <div className="collection-progress">
                    <strong>
                      {formatNumber(economy.catalog.filter((item) => item.owned).length)}
                      <small> / {formatNumber(economy.catalog.length)}</small>
                    </strong>
                    <span>{t("수집 완료")}</span>
                  </div>
                </div>

                <nav className="atelier-category-tabs" aria-label={t("도감 카테고리")}>
                  {craftCategories.map((entry) => (
                    <button key={entry} type="button" className={category === entry ? "active" : ""} onClick={() => setCategory(entry)}>
                      {t(categoryLabels[entry])}
                    </button>
                  ))}
                </nav>

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
                        {economy.catalog.filter((item) => item.category === category && (entry === "all" || item.rarity === entry)).length}
                      </small>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={wishlistOnly ? "active" : ""}
                    onClick={() => setWishlistOnly((current) => !current)}
                  >
                    ★ {t("찜 목록")} <small>{economy.wishlist.length}/10</small>
                  </button>
                </nav>

                <div className="collection-grid">
                  {economy.catalog
                    .filter((item) => item.category === category
                      && (collectionRarity === "all" || item.rarity === collectionRarity)
                      && (!wishlistOnly || item.wishlisted))
                    .map((item) => (
                      <article
                        className={`collection-card rarity-border-${item.rarity}${item.owned ? " owned" : " locked"}`}
                        key={item.id}
                      >
                        <button
                          className={`cosmetic-wishlist-button${item.wishlisted ? " active" : ""}`}
                          type="button"
                          aria-label={item.wishlisted ? t("찜 해제") : t("찜하기")}
                          onClick={() => void toggleWishlist(item)}
                        >{item.wishlisted ? "★" : "☆"}</button>
                        <CosmeticPreview
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
                {wishlistOnly && !economy.catalog.some((item) => item.category === category
                  && item.wishlisted
                  && (collectionRarity === "all" || item.rarity === collectionRarity)) && (
                  <p className="online-message">{t("이 카테고리에 찜한 꾸미기가 없습니다.")}</p>
                )}
                <div className="collection-set-grid">
                  {[...new Set(economy.catalog.map((item) => item.collectionKey).filter((key): key is string => key !== null))].map((collectionKey) => {
                    const items = economy.catalog.filter((item) => item.collectionKey === collectionKey);
                    const owned = items.filter((item) => item.owned).length;
                    return (
                      <article className="collection-set-card" key={collectionKey}>
                        <small>THEMED COLLECTION</small>
                        <h3>{collectionKey.toUpperCase()}</h3>
                        <div className="collection-set-previews">
                          {items.slice(0, 4).map((item) => <CosmeticPreview key={item.id} item={item} />)}
                        </div>
                        <strong>{owned} / {items.length}</strong>
                      </article>
                    );
                  })}
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
                  <p className="eyebrow">ATELIER BOX</p>
                  <h2>{t("아틀리에 상자")}</h2>
                  <p>{t("원하는 카테고리를 먼저 고른 뒤 파편 또는 완성 꾸미기 하나를 획득합니다.")}</p>
                </div>
                <nav className="atelier-category-tabs" aria-label={t("상자 카테고리")}>
                  {craftCategories.map((entry) => (
                    <button key={entry} type="button" className={category === entry ? "active" : ""} onClick={() => setCategory(entry)}>{t(categoryLabels[entry])}</button>
                  ))}
                </nav>
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
          source={outcomeSource}
          onClose={() => setOutcome(null)}
          {...(outcomeSource === "box" ? {
            onAgain: () => {
              setOutcome(null);
              void openBox();
            },
          } : {})}
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
            <CosmeticPreview
              item={purchaseCandidate}
              className="purchase-tile-preview"
              label={localizedCosmeticName(purchaseCandidate, locale)}
            />
            <h2 id="purchase-title">{localizedCosmeticName(purchaseCandidate, locale)}</h2>
            <p>{t("{chips}칩을 사용해 이 꾸미기를 구매할까요?", {
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
