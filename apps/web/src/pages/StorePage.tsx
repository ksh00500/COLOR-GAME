import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ApiError,
  craftCosmetic,
  equipStyleCosmetic,
  fetchEconomy,
  getAuthToken,
  getCachedEconomy,
  openPaletteMixer,
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
import { CosmeticCategoryIcon } from "../components/CosmeticCategoryIcon";
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
type StoreTab = "weekly" | "atelier" | "collection" | "mixer" | "upcoming";
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
  const [outcomeSource, setOutcomeSource] = useState<"mixer" | "combine">("mixer");
  const [purchaseCandidate, setPurchaseCandidate] = useState<CosmeticItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<StoreTab>(() => {
    const tab = searchParams.get("tab");
    return tab === "box" || tab === "mixer"
      ? "mixer"
      : tab === "atelier" || tab === "collection" || tab === "upcoming"
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
  const [collectionQuery, setCollectionQuery] = useState("");
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [category, setCategory] = useState<CraftCategory>("tile_color");
  const [craftMode, setCraftMode] = useState<"random" | "targeted">("random");
  const [craftTarget, setCraftTarget] = useState<string | null>(null);
  const [craftStep, setCraftStep] = useState<1 | 2 | 3 | 4>(1);

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

  const openMixer = async () => {
    setBusyId("palette-mixer");
    setMessage(null);
    try {
      const nextOutcome = await openPaletteMixer(category);
      setOutcomeSource("mixer");
      setOutcome(nextOutcome);
      setEconomy(nextOutcome.overview);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "팔레트 믹서를 사용하지 못했습니다.");
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

  const craftCost = craftMode === "random" ? 4 : 8;
  const craftFragmentBalance = economy?.fragments[rarity] ?? 0;
  const craftFragmentShortage = Math.max(0, craftCost - craftFragmentBalance);
  const craftCandidates = economy?.catalog.filter(
    (item) => item.category === category && item.rarity === rarity && !item.owned,
  ) ?? [];
  const selectedCraftItem = craftCandidates.find((item) => item.id === craftTarget);
  const craftReady = craftFragmentShortage === 0
    && (craftMode === "random" ? craftCandidates.length > 0 : selectedCraftItem !== undefined);
  const weeklyCategoryItems = economy?.weeklyStore.items
    .filter((item) => item.category === category)
    .sort((left, right) => rarityOrder.indexOf(left.rarity) - rarityOrder.indexOf(right.rarity)) ?? [];

  const cosmeticCard = (item: CosmeticItem) => (
    <article className={`cosmetic-card rarity-border-${item.rarity}`} key={item.id}>
      <button
        className={`cosmetic-wishlist-button${item.wishlisted ? " active" : ""}`}
        type="button"
        aria-label={item.wishlisted ? t("찜 해제") : t("찜하기")}
        onClick={() => void toggleWishlist(item)}
      >{item.wishlisted ? "★" : "☆"}</button>
      <div className="cosmetic-card-visual">
        <span className={`cosmetic-rarity-chip rarity-${item.rarity}`}>{rarityLabel(item.rarity)}</span>
        <CosmeticPreview
          item={item}
          className="store-tile-preview"
          label={localizedCosmeticName(item, locale)}
        />
      </div>
      <div className="cosmetic-card-copy">
        <small>{t(categoryLabels[item.category as CraftCategory] ?? item.visualKind)}</small>
        <h4>{localizedCosmeticName(item, locale)}</h4>
        <p>{locale === "ko" ? item.descriptionKo : item.nameEn}</p>
      </div>
      {item.owned && item.category !== "tile_color" && item.category !== "profile" ? (
        <button className="secondary-action" type="button" disabled={busyId !== null} onClick={() => void equip(item)}>
          <span aria-hidden="true">{economy?.styleLoadout[styleSlots[item.category]] === item.id ? "✓" : "+"}</span>
          {economy?.styleLoadout[styleSlots[item.category]] === item.id ? t("장착 중") : t("장착")}
        </button>
      ) : <button
        className={item.owned ? "secondary-action" : "primary-action"}
        type="button"
        disabled={item.owned || busyId !== null}
        onClick={() => setPurchaseCandidate(item)}
      >
        {item.owned ? (
          <><span aria-hidden="true">✓</span>{t("보유 중")}</>
        ) : (
          <><span className="chip-price-gem" aria-hidden="true">◆</span>{formatNumber(item.chipPrice)}</>
        )}
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
                ["mixer", "팔레트 믹서"],
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
                    <h2>{t("이번 주 상점")}</h2>
                  </div>
                  <span>{t("{date}에 변경", { date: formatDate(economy.weeklyStore.endsAt) })}</span>
                </div>
                <nav className="atelier-category-tabs store-category-rail" aria-label={t("꾸미기 카테고리")}>
                  {craftCategories.map((entry) => (
                    <button key={entry} type="button" className={category === entry ? "active" : ""} onClick={() => setCategory(entry)}>
                      <CosmeticCategoryIcon category={entry} />
                      <span>
                        <strong>{t(categoryLabels[entry])}</strong>
                        <small>{economy.weeklyStore.items.filter((item) => item.category === entry).length}</small>
                      </span>
                    </button>
                  ))}
                </nav>
                {weeklyCategoryItems.length > 0 ? (
                  <div className="weekly-rarity-sections">
                    {rarityOrder.map((entry) => {
                      const items = weeklyCategoryItems.filter((item) => item.rarity === entry);
                      if (items.length === 0) return null;
                      return (
                        <section className={`weekly-rarity-section rarity-${entry}`} key={entry}>
                          <header>
                            <span className="weekly-rarity-mark" aria-hidden="true" />
                            <div>
                              <h3>{rarityLabel(entry)}</h3>
                              <p>{t("이번 주 {count}개", { count: items.length })}</p>
                            </div>
                          </header>
                          <div className={`weekly-cosmetic-grid item-count-${Math.min(items.length, 4)}`}>
                            {items.map(cosmeticCard)}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="weekly-empty-state">
                    <CosmeticCategoryIcon category={category} />
                    <strong>{t("이번 주에는 이 종류의 상품이 없습니다.")}</strong>
                  </div>
                )}
              </section>
            )}

            {storeTab === "atelier" && (
              <section className="store-section atelier-section">
                <div className="store-section-heading">
                  <div>
                    <p className="eyebrow">TANGO ATELIER</p>
                    <h2>{t("Tango 공방")}</h2>
                    <p>{t("종류와 등급, 제작 방식을 차례로 고르면 필요한 파편과 결과를 바로 확인할 수 있습니다.")}</p>
                  </div>
                </div>

                <ol className="atelier-progress" aria-label={t("제작 순서")}>
                  {["꾸미기 종류", "등급", "제작 방식", "제작 확인"].map((label, index) => (
                    <li className={`${craftStep === index + 1 ? "active" : ""}${craftStep > index + 1 ? " complete" : ""}`} key={label}>
                      <button type="button" onClick={() => setCraftStep((index + 1) as 1 | 2 | 3 | 4)}>
                        <b>{craftStep > index + 1 ? "✓" : index + 1}</b><span>{t(label)}</span>
                      </button>
                    </li>
                  ))}
                </ol>

                <div className="atelier-layout">
                  <div className="atelier-builder">
                    <section className="atelier-choice-section atelier-step-category" aria-labelledby="atelier-category-title" hidden={craftStep !== 1}>
                      <header>
                        <b>1</b>
                        <div><small>STYLE TYPE</small><h3 id="atelier-category-title">{t("어떤 꾸미기를 만들까요?")}</h3></div>
                      </header>
                      <div className="atelier-category-cards" role="list">
                        {craftCategories.map((entry) => (
                          <button
                            key={entry}
                            type="button"
                            className={category === entry ? "active" : ""}
                            aria-pressed={category === entry}
                            onClick={() => { setCategory(entry); setCraftTarget(null); }}
                          >
                            <CosmeticCategoryIcon category={entry} />
                            <span>
                              <strong>{t(categoryLabels[entry])}</strong>
                              <small>{t(category === entry ? "선택됨" : "선택")}</small>
                            </span>
                            <b aria-hidden="true">{category === entry ? "✓" : "›"}</b>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="atelier-choice-section atelier-step-rarity" aria-labelledby="atelier-rarity-title" hidden={craftStep !== 2}>
                      <header>
                        <b>2</b>
                        <div><small>RARITY</small><h3 id="atelier-rarity-title">{t("사용할 파편 등급을 고르세요")}</h3></div>
                      </header>
                      <div className="atelier-rarity-cards" role="radiogroup" aria-label={t("등급")}>
                      {rarityOrder.map((entry) => (
                        <button key={entry} type="button" role="radio" aria-checked={rarity === entry} className={`${rarity === entry ? "active" : ""} rarity-${entry}`} onClick={() => { setRarity(entry); setCraftTarget(null); }}>
                          <span className="rarity-gem" aria-hidden="true">◆</span>
                          <strong>{rarityLabel(entry)}</strong>
                          <small>{t("보유 {count}개", { count: formatNumber(economy.fragments[entry]) })}</small>
                        </button>
                      ))}
                      </div>
                    </section>

                    <section className="atelier-choice-section atelier-step-method" aria-labelledby="atelier-mode-title" hidden={craftStep !== 3}>
                      <header>
                        <b>3</b>
                        <div><small>CRAFT METHOD</small><h3 id="atelier-mode-title">{t("어떻게 만들까요?")}</h3></div>
                      </header>
                      <div className="atelier-mode-cards" role="radiogroup" aria-label={t("제작 방식")}>
                        <button type="button" role="radio" aria-checked={craftMode === "random"} className={craftMode === "random" ? "active" : ""} onClick={() => { setCraftMode("random"); setCraftTarget(null); }}>
                          <b aria-hidden="true">?</b>
                          <span><strong>{t("무작위로 만들기")}</strong><small>{t("파편 4개로 미보유 상품 하나를 무작위로 얻습니다.")}</small></span>
                          <em>{t("파편 4개")}</em>
                        </button>
                        <button type="button" role="radio" aria-checked={craftMode === "targeted"} className={craftMode === "targeted" ? "active" : ""} onClick={() => setCraftMode("targeted")}>
                          <b aria-hidden="true">✓</b>
                          <span><strong>{t("원하는 항목 만들기")}</strong><small>{t("파편 8개로 선택한 상품을 확정 제작합니다.")}</small></span>
                          <em>{t("파편 8개")}</em>
                        </button>
                      </div>
                    </section>

                    {craftStep === 3 && craftMode === "targeted" && (
                      <section className="atelier-choice-section atelier-target-section" aria-labelledby="atelier-target-title">
                        <header>
                          <b>+</b>
                          <div><small>SELECT ITEM</small><h3 id="atelier-target-title">{t("제작할 항목을 선택하세요")}</h3></div>
                        </header>
                        {craftCandidates.length > 0 ? (
                          <div className="atelier-target-grid">
                            {craftCandidates.map((item) => (
                              <button key={item.id} type="button" className={`atelier-target-card${craftTarget === item.id ? " selected" : ""}`} aria-pressed={craftTarget === item.id} onClick={() => setCraftTarget(item.id)}>
                                <CosmeticPreview item={item} label={localizedCosmeticName(item, locale)} />
                                <strong>{localizedCosmeticName(item, locale)}</strong>
                                <small>{craftTarget === item.id ? t("선택됨") : t("이 항목 선택")}</small>
                              </button>
                            ))}
                          </div>
                        ) : <p className="atelier-empty-note">{t("이 조건의 모든 꾸미기를 이미 보유하고 있습니다.")}</p>}
                      </section>
                    )}
                  </div>

                  <aside className="atelier-control-card" aria-labelledby="atelier-summary-title" hidden={craftStep !== 4}>
                    <div className="atelier-summary-heading">
                      <span>4</span>
                      <div><small>CRAFT SUMMARY</small><h3 id="atelier-summary-title">{t("제작 확인")}</h3></div>
                    </div>
                    <div className="atelier-summary-hero">
                      {selectedCraftItem ? (
                        <CosmeticPreview item={selectedCraftItem} label={localizedCosmeticName(selectedCraftItem, locale)} />
                      ) : (
                        <span className="atelier-summary-random" aria-hidden="true">
                          <CosmeticCategoryIcon category={category} />
                          <b>?</b>
                        </span>
                      )}
                      <span>
                        <small>{t(craftMode === "random" ? "무작위 결과" : "선택한 결과")}</small>
                        <strong>
                          {selectedCraftItem
                            ? localizedCosmeticName(selectedCraftItem, locale)
                            : t("{rarity} {category}", { rarity: rarityLabel(rarity), category: t(categoryLabels[category]) })}
                        </strong>
                      </span>
                    </div>
                    <dl className="atelier-summary-list">
                      <div><dt>{t("꾸미기 종류")}</dt><dd>{t(categoryLabels[category])}</dd></div>
                      <div><dt>{t("등급")}</dt><dd>{rarityLabel(rarity)}</dd></div>
                      <div><dt>{t("제작 방식")}</dt><dd>{t(craftMode === "random" ? "무작위로 만들기" : "원하는 항목 만들기")}</dd></div>
                      {selectedCraftItem && <div><dt>{t("선택 항목")}</dt><dd>{localizedCosmeticName(selectedCraftItem, locale)}</dd></div>}
                    </dl>
                    <div className="atelier-fragment-status">
                      <span><small>{t("보유 파편")}</small><strong>{formatNumber(craftFragmentBalance)}</strong></span>
                      <i aria-hidden="true">/</i>
                      <span><small>{t("필요 파편")}</small><strong>{formatNumber(craftCost)}</strong></span>
                    </div>
                    <p className={`atelier-ready-status${craftReady ? " ready" : ""}`} role="status">
                      {craftMode === "targeted" && selectedCraftItem === undefined
                        ? t("제작할 항목을 먼저 선택하세요.")
                        : craftFragmentShortage > 0
                          ? t("파편 {count}개가 더 필요합니다.", { count: formatNumber(craftFragmentShortage) })
                          : craftCandidates.length === 0
                            ? t("이 조건의 모든 꾸미기를 이미 보유하고 있습니다.")
                            : t("제작할 준비가 되었습니다.")}
                    </p>
                    <button className="primary-action atelier-craft-action" type="button" disabled={busyId !== null || !craftReady} onClick={() => void craft()}>
                      {busyId === "atelier"
                        ? t("제작 중...")
                        : selectedCraftItem
                          ? t("{name} 제작하기", { name: localizedCosmeticName(selectedCraftItem, locale) })
                          : t("{rarity} {category} 무작위 제작", { rarity: rarityLabel(rarity), category: t(categoryLabels[category]) })}
                    </button>
                  </aside>
                </div>
                <div className="atelier-step-navigation">
                  <button className="secondary-action" type="button" disabled={craftStep === 1} onClick={() => setCraftStep((craftStep - 1) as 1 | 2 | 3 | 4)}>
                    {t("이전")}
                  </button>
                  {craftStep < 4 && (
                    <button
                      className="primary-action"
                      type="button"
                      disabled={craftStep === 3 && craftMode === "targeted" && selectedCraftItem === undefined}
                      onClick={() => setCraftStep((craftStep + 1) as 1 | 2 | 3 | 4)}
                    >
                      {t("다음")}
                    </button>
                  )}
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

                <nav className="atelier-category-tabs store-category-rail" aria-label={t("도감 카테고리")}>
                  {craftCategories.map((entry) => (
                    <button key={entry} type="button" className={category === entry ? "active" : ""} onClick={() => setCategory(entry)}>
                      <CosmeticCategoryIcon category={entry} />
                      <span>
                        <strong>{t(categoryLabels[entry])}</strong>
                        <small>{economy.catalog.filter((item) => item.category === entry).length}</small>
                      </span>
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

                <label className="collection-search-field">
                  <span>{t("도감 검색")}</span>
                  <input
                    type="search"
                    value={collectionQuery}
                    placeholder={t("꾸미기 이름으로 검색")}
                    onChange={(event) => setCollectionQuery(event.target.value)}
                  />
                </label>

                <div className="collection-grid">
                  {economy.catalog
                    .filter((item) => item.category === category
                      && (collectionRarity === "all" || item.rarity === collectionRarity)
                      && (!wishlistOnly || item.wishlisted)
                      && [localizedCosmeticName(item, locale), item.nameKo, item.nameEn]
                        .some((name) => name.toLocaleLowerCase(locale).includes(collectionQuery.trim().toLocaleLowerCase(locale))))
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
                        <b className={item.owned ? "owned-label" : "locked-label"}>
                          <span aria-hidden="true">{item.owned ? "✓" : "•"}</span>
                          {t(item.owned ? "보유 중" : "미보유")}
                        </b>
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

            {storeTab === "mixer" && (() => {
              const mixer = economy.mixer ?? economy.box;
              const mixerTickets = economy.mixerTickets ?? economy.boxTickets;
              return (
                <section className="palette-mixer-section">
                  <div className="palette-mixer-copy">
                    <p className="eyebrow">PALETTE MIXER</p>
                    <h2>{t("팔레트 믹서")}</h2>
                    <p>{t("원하는 꾸미기 종류를 고르고 안료를 섞어 파편 또는 완성 꾸미기 하나를 발견하세요.")}</p>
                    <div className="mixer-category-grid" role="group" aria-label={t("믹서 카테고리")}>
                      {craftCategories.map((entry) => (
                        <button key={entry} type="button" className={category === entry ? "active" : ""} onClick={() => setCategory(entry)}>
                          <CosmeticCategoryIcon category={entry} />
                          <span><strong>{t(categoryLabels[entry])}</strong><small>{t("결과 범위")}</small></span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="palette-mixer-stage" aria-label={t("선택한 안료를 섞는 팔레트 믹서")}>
                    <div className="mixer-pigment pigment-one" aria-hidden="true" />
                    <div className="mixer-pigment pigment-two" aria-hidden="true" />
                    <div className="mixer-pigment pigment-three" aria-hidden="true" />
                    <div className="mixer-bowl" aria-hidden="true">
                      <span /><span /><span />
                      <i />
                    </div>
                    <CosmeticCategoryIcon category={category} className="mixer-selected-icon" />
                  </div>

                  <aside className="palette-mixer-control">
                    <div>
                      <small>{t("선택한 종류")}</small>
                      <strong>{t(categoryLabels[category])}</strong>
                    </div>
                    <dl>
                      <div><dt>{t("믹서 이용권")}</dt><dd>{formatNumber(mixerTickets)}</dd></div>
                      <div><dt>{t("컬러 칩")}</dt><dd>{formatNumber(economy.wallet.colorChips)}</dd></div>
                    </dl>
                    <button
                      className="primary-action mixer-action"
                      type="button"
                      disabled={busyId !== null || (mixerTickets < 1 && economy.wallet.colorChips < mixer.priceChips)}
                      onClick={() => void openMixer()}
                    >
                      {busyId === "palette-mixer"
                        ? t("안료를 섞는 중입니다.")
                        : mixerTickets > 0
                          ? t("믹서 이용권 사용 ({count}개 보유)", { count: formatNumber(mixerTickets) })
                          : t("{chips} 칩으로 섞기", { chips: formatNumber(mixer.priceChips) })}
                    </button>
                    <details className="box-odds mixer-odds">
                      <summary>{t("획득 확률 보기")}</summary>
                      <ul>
                        {mixer.outcomes.map((entry) => (
                          <li key={`${entry.type}-${entry.rarity}`}>
                            <span>{t(entry.rarity)} {t(entry.type === "fragment" ? "파편" : "꾸미기")}</span>
                            <strong>{entry.probability}%</strong>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </aside>
                </section>
              );
            })()}

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
          {...(outcomeSource === "mixer" ? {
            onAgain: () => {
              setOutcome(null);
              void openMixer();
            },
          } : {})}
          againDisabled={
            busyId !== null
            || ((outcome.overview.mixerTickets ?? outcome.overview.boxTickets) < 1
              && outcome.overview.wallet.colorChips < (outcome.overview.mixer ?? outcome.overview.box).priceChips)
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
