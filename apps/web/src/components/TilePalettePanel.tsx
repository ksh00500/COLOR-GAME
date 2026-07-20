import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  deleteTilePalette,
  equipStyleCosmetic,
  equipTileLoadout,
  saveTilePalette,
  type CosmeticItem,
  type CosmeticRarity,
  type EconomyOverview,
  type StyleLoadoutSlot,
  type TileColorConflict,
  type TileLoadout,
  type TileLoadoutSlot,
  type TilePalettePreset,
} from "../api";
import { localizedCosmeticName } from "../cosmetic-localization";
import { useI18n } from "../i18n";
import { loadoutChangedEvent } from "./CosmeticLoadoutBridge";
import { CosmeticPreview } from "./CosmeticPreview";
import { TileSkinPreview } from "./TileSkinPreview";

const rarities: CosmeticRarity[] = ["common", "rare", "epic", "legendary"];
type TileRarityFilter = "all" | CosmeticRarity;

const tileSlots: Array<{
  key: TileLoadoutSlot;
  label: string;
  defaultName: string;
}> = [
  { key: "colorA", label: "빨강 슬롯", defaultName: "기본 버건디" },
  { key: "colorB", label: "파랑 슬롯", defaultName: "기본 네이비" },
  { key: "colorC", label: "초록 슬롯", defaultName: "기본 그린" },
];

const styleSlots: Array<{
  key: StyleLoadoutSlot;
  category: "board_theme" | "placement_effect" | "score_effect" | "victory_effect";
  label: string;
  defaultName: string;
}> = [
  { key: "boardTheme", category: "board_theme", label: "게임판", defaultName: "기본 원목 게임판" },
  { key: "placementEffect", category: "placement_effect", label: "배치 효과", defaultName: "기본 배치 효과" },
  { key: "scoreEffect", category: "score_effect", label: "득점 효과", defaultName: "기본 득점 효과" },
  { key: "victoryEffect", category: "victory_effect", label: "승리 연출", defaultName: "기본 승리 연출" },
];

export const filterOwnedTileItems = (
  items: CosmeticItem[],
  locale: string,
  query: string,
  rarity: TileRarityFilter,
) => {
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  return items.filter((item) => {
    if (rarity !== "all" && item.rarity !== rarity) return false;
    if (normalizedQuery === "") return true;
    return [localizedCosmeticName(item, locale), item.nameKo, item.nameEn]
      .some((name) => name.toLocaleLowerCase(locale).includes(normalizedQuery));
  });
};

export const tileLoadoutsEqual = (first: TileLoadout, second: TileLoadout): boolean =>
  tileSlots.every((slot) => first[slot.key] === second[slot.key]);

export const firstEmptyPaletteSlot = (palettes: TilePalettePreset[]): number | null => {
  for (let slotIndex = 1; slotIndex <= 3; slotIndex += 1) {
    if (!palettes.some((palette) => palette.slotIndex === slotIndex)) return slotIndex;
  }
  return null;
};

const itemForSlot = (
  inventory: CosmeticItem[],
  loadout: TileLoadout,
  slot: TileLoadoutSlot,
): CosmeticItem | undefined => inventory.find((item) => item.id === loadout[slot]);

function PaletteTileStrip({
  inventory,
  loadout,
  label,
  conflictSlots,
}: {
  inventory: CosmeticItem[];
  loadout: TileLoadout;
  label: string;
  conflictSlots?: ReadonlySet<TileLoadoutSlot>;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="palette-tile-strip" aria-label={label}>
      {tileSlots.map((slot) => {
        const item = itemForSlot(inventory, loadout, slot.key);
        return (
          <div className={`palette-tile-mini${conflictSlots?.has(slot.key) ? " conflict" : ""}`} key={slot.key}>
            <TileSkinPreview
              {...(item ? { item } : {})}
              defaultSlot={slot.key}
              label={item ? localizedCosmeticName(item, locale) : t(slot.defaultName)}
            />
            <small>{t(slot.label)}</small>
          </div>
        );
      })}
    </div>
  );
}

type PendingAction =
  | { kind: "equip"; loadout: TileLoadout }
  | { kind: "save"; loadout: TileLoadout; slotIndex: number; name: string | null };

export const tileColorConflictsFromDetails = (details: unknown): TileColorConflict[] => {
  if (details === null || typeof details !== "object" || !("conflicts" in details)) return [];
  const conflicts = (details as { conflicts?: unknown }).conflicts;
  if (!Array.isArray(conflicts)) return [];
  return conflicts.filter((conflict): conflict is TileColorConflict => {
    if (conflict === null || typeof conflict !== "object") return false;
    const candidate = conflict as { slots?: unknown; distance?: unknown };
    return Array.isArray(candidate.slots)
      && candidate.slots.length === 2
      && candidate.slots.every((slot) => tileSlots.some((entry) => entry.key === slot))
      && typeof candidate.distance === "number";
  });
};

export function TilePalettePanel({
  economy,
  onEconomyChange,
}: {
  economy: EconomyOverview;
  onEconomyChange: (economy: EconomyOverview) => void;
}) {
  const { t, locale, formatNumber } = useI18n();
  const ownedTiles = useMemo(
    () => economy.inventory.filter((item) => item.equipSlot === "tile_color"),
    [economy.inventory],
  );
  const [draftLoadout, setDraftLoadout] = useState<TileLoadout>({ ...economy.loadout });
  const [selectedSlot, setSelectedSlot] = useState<TileLoadoutSlot>("colorA");
  const [tileQuery, setTileQuery] = useState("");
  const [tileRarity, setTileRarity] = useState<TileRarityFilter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [similarityConflicts, setSimilarityConflicts] = useState<TileColorConflict[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [savePickerOpen, setSavePickerOpen] = useState(false);
  const [editingNameSlot, setEditingNameSlot] = useState<number | null>(null);
  const [paletteName, setPaletteName] = useState("");
  const [selectedStyleSlot, setSelectedStyleSlot] = useState<StyleLoadoutSlot | null>(null);

  const loadoutKey = tileSlots.map((slot) => economy.loadout[slot.key] ?? "default").join(":");
  useEffect(() => {
    setDraftLoadout({ ...economy.loadout });
  }, [loadoutKey]);

  useEffect(() => {
    if (!editorOpen || !window.matchMedia("(max-width: 720px)").matches) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditorOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [editorOpen]);

  const filteredOwnedTiles = filterOwnedTileItems(ownedTiles, locale, tileQuery, tileRarity);
  const draftChanged = !tileLoadoutsEqual(draftLoadout, economy.loadout);

  const applyEconomy = (next: EconomyOverview) => {
    onEconomyChange(next);
    window.dispatchEvent(new CustomEvent(loadoutChangedEvent, { detail: next }));
  };

  const runAction = async (action: PendingAction, allowSimilar = false) => {
    setBusy(action.kind === "equip" ? "equip-palette" : `save-palette:${action.slotIndex}`);
    setMessage(null);
    try {
      const next = action.kind === "equip"
        ? await equipTileLoadout(action.loadout, allowSimilar)
        : await saveTilePalette(
            action.slotIndex,
            action.name,
            action.loadout,
            allowSimilar,
          );
      applyEconomy(next);
      setPendingAction(null);
      setSimilarityConflicts([]);
      setSavePickerOpen(false);
      if (action.kind === "equip") {
        setDraftLoadout({ ...next.loadout });
        setEditorOpen(false);
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "TILE_COLORS_TOO_SIMILAR" && !allowSimilar) {
        setPendingAction(action);
        setSimilarityConflicts(tileColorConflictsFromDetails(error.details));
      } else {
        setMessage(error instanceof ApiError ? error.code : "팔레트를 저장하지 못했습니다.");
      }
    } finally {
      setBusy(null);
    }
  };

  const saveDraft = (slotIndex: number) => {
    const existing = economy.tilePalettes.find((palette) => palette.slotIndex === slotIndex);
    void runAction({
      kind: "save",
      loadout: { ...draftLoadout },
      slotIndex,
      name: existing?.name ?? null,
    });
  };

  const requestSaveDraft = () => {
    const emptySlot = firstEmptyPaletteSlot(economy.tilePalettes);
    if (emptySlot !== null) {
      saveDraft(emptySlot);
      return;
    }
    setSavePickerOpen(true);
  };

  const renamePalette = async (palette: TilePalettePreset) => {
    const normalized = paletteName.trim();
    if (normalized === "") return;
    await runAction({
      kind: "save",
      loadout: palette.loadout,
      slotIndex: palette.slotIndex,
      name: normalized,
    });
    setEditingNameSlot(null);
    setPaletteName("");
  };

  const removePalette = async (slotIndex: number) => {
    if (!window.confirm(t("이 팔레트를 삭제할까요?"))) return;
    setBusy(`delete-palette:${slotIndex}`);
    setMessage(null);
    try {
      onEconomyChange(await deleteTilePalette(slotIndex));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "팔레트를 삭제하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const selectDraftItem = (item: CosmeticItem) => {
    setDraftLoadout((current) => ({ ...current, [selectedSlot]: item.id }));
  };

  const restoreDraftDefault = () => {
    setDraftLoadout((current) => {
      const next = { ...current };
      delete next[selectedSlot];
      return next;
    });
  };

  const paletteNameFor = (palette: TilePalettePreset) =>
    palette.name ?? t("내 팔레트 {number}", { number: palette.slotIndex });

  const openEditor = () => {
    setEditorOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById("tile-palette-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const equipStyle = async (slot: StyleLoadoutSlot, cosmeticId: string | null) => {
    setBusy(`style:${slot}`);
    setMessage(null);
    try {
      const next = await equipStyleCosmetic(slot, cosmeticId);
      applyEconomy(next);
      setSelectedStyleSlot(null);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.code : "꾸미기를 장착하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="tile-palette-panel">
      <div className="economy-account-heading palette-panel-heading">
        <div>
          <p className="eyebrow">TILE PALETTE</p>
          <h3>{t("세 가지 타일을 팔레트로 한 번에 관리하세요")}</h3>
        </div>
        <strong className="mini-chip-balance">◆ {formatNumber(economy.wallet.colorChips)}</strong>
      </div>

      <section className="current-palette-card">
        <div>
          <p className="eyebrow">CURRENT PALETTE</p>
          <h3>{t("현재 팔레트")}</h3>
          <p>{t("게임에 적용되는 세 가지 타일입니다.")}</p>
        </div>
        <PaletteTileStrip inventory={ownedTiles} loadout={economy.loadout} label={t("현재 팔레트")} />
        <button className="secondary-action palette-edit-trigger" type="button" onClick={openEditor}>
          {t("직접 조합하기")}
        </button>
      </section>

      <div className="saved-palette-heading">
        <div>
          <h3>{t("저장 팔레트")}</h3>
          <p>{t("원하는 조합을 한 번에 장착하세요.")}</p>
        </div>
        <small>{t("사용자 팔레트 {count}/3", { count: economy.tilePalettes.length })}</small>
      </div>

      <div className="saved-palette-grid">
        <article className={tileLoadoutsEqual(economy.loadout, {}) ? "active" : ""}>
          <div className="saved-palette-title">
            <div>
              <small>{t("기본 조합")}</small>
              <strong>{t("기본 팔레트")}</strong>
            </div>
            {tileLoadoutsEqual(economy.loadout, {}) && <span>{t("장착 중")}</span>}
          </div>
          <PaletteTileStrip inventory={ownedTiles} loadout={{}} label={t("기본 팔레트")} />
          <button
            className="primary-action"
            type="button"
            disabled={busy !== null || tileLoadoutsEqual(economy.loadout, {})}
            onClick={() => void runAction({ kind: "equip", loadout: {} })}
          >
            {tileLoadoutsEqual(economy.loadout, {}) ? t("장착 중") : t("한 번에 장착")}
          </button>
        </article>

        {[1, 2, 3].map((slotIndex) => {
          const palette = economy.tilePalettes.find((entry) => entry.slotIndex === slotIndex);
          if (palette === undefined) {
            return (
              <article className="empty" key={slotIndex}>
                <div className="empty-palette-mark" aria-hidden="true">+</div>
                <strong>{t("내 팔레트 {number}", { number: slotIndex })}</strong>
                <p>{t("현재 조합을 이곳에 저장할 수 있습니다.")}</p>
                <button
                  className="secondary-action"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void runAction({
                    kind: "save",
                    loadout: { ...economy.loadout },
                    slotIndex,
                    name: null,
                  })}
                >
                  {t("현재 조합 저장")}
                </button>
              </article>
            );
          }
          const isActive = tileLoadoutsEqual(economy.loadout, palette.loadout);
          return (
            <article className={isActive ? "active" : ""} key={slotIndex}>
              <div className="saved-palette-title">
                <div>
                  <small>{t("사용자 팔레트")}</small>
                  <strong>{paletteNameFor(palette)}</strong>
                </div>
                {isActive && <span>{t("장착 중")}</span>}
              </div>
              <PaletteTileStrip inventory={ownedTiles} loadout={palette.loadout} label={paletteNameFor(palette)} />
              <div className="saved-palette-actions">
                <button
                  className="primary-action"
                  type="button"
                  disabled={busy !== null || isActive}
                  onClick={() => void runAction({ kind: "equip", loadout: palette.loadout })}
                >
                  {isActive ? t("장착 중") : t("한 번에 장착")}
                </button>
                <details className="palette-card-menu">
                  <summary aria-label={t("팔레트 편집")}>⋯</summary>
                  <div>
                    {editingNameSlot === slotIndex ? (
                      <form onSubmit={(event) => { event.preventDefault(); void renamePalette(palette); }}>
                        <input
                          autoFocus
                          maxLength={24}
                          value={paletteName}
                          aria-label={t("팔레트 이름")}
                          onChange={(event) => setPaletteName(event.target.value)}
                        />
                        <button type="submit">{t("저장")}</button>
                      </form>
                    ) : (
                      <button type="button" onClick={() => {
                        setEditingNameSlot(slotIndex);
                        setPaletteName(paletteNameFor(palette));
                      }}>{t("이름 변경")}</button>
                    )}
                    <button type="button" onClick={() => void runAction({
                      kind: "save",
                      loadout: { ...economy.loadout },
                      slotIndex,
                      name: palette.name,
                    })}>{t("현재 조합으로 덮어쓰기")}</button>
                    <button className="danger" type="button" onClick={() => void removePalette(slotIndex)}>{t("삭제")}</button>
                  </div>
                </details>
              </div>
            </article>
          );
        })}
      </div>

      <section className="style-loadout-panel" aria-labelledby="style-loadout-title">
        <div className="saved-palette-heading">
          <div>
            <p className="eyebrow">GAME STYLE</p>
            <h3 id="style-loadout-title">{t("게임 스타일")}</h3>
            <p>{t("게임판과 효과를 슬롯별로 장착하세요.")}</p>
          </div>
        </div>
        <div className="style-loadout-grid">
          {styleSlots.map((slot) => {
            const equippedId = economy.styleLoadout?.[slot.key];
            const equipped = economy.inventory.find((item) => item.id === equippedId);
            return (
              <article key={slot.key} className={equipped === undefined ? "default" : "equipped"}>
                <small>{t(slot.label)}</small>
                {equipped === undefined ? (
                  <span className={`style-default-preview style-default-${slot.category}`} aria-hidden="true">T</span>
                ) : (
                  <CosmeticPreview item={equipped} label={localizedCosmeticName(equipped, locale)} />
                )}
                <strong>{equipped === undefined ? t(slot.defaultName) : localizedCosmeticName(equipped, locale)}</strong>
                <button
                  className="secondary-action"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setSelectedStyleSlot((current) => current === slot.key ? null : slot.key)}
                >
                  {t(selectedStyleSlot === slot.key ? "닫기" : "변경")}
                </button>
              </article>
            );
          })}
        </div>
        {selectedStyleSlot !== null && (() => {
          const slot = styleSlots.find((entry) => entry.key === selectedStyleSlot);
          if (slot === undefined) return null;
          const items = economy.inventory.filter((item) => item.category === slot.category);
          return (
            <div className="style-inventory-panel">
              <div className="style-inventory-heading">
                <div>
                  <small>{t(slot.label)}</small>
                  <h4>{t("보유 꾸미기 선택")}</h4>
                </div>
                <button
                  className="secondary-action"
                  type="button"
                  disabled={busy !== null || economy.styleLoadout?.[slot.key] === undefined}
                  onClick={() => void equipStyle(slot.key, null)}
                >
                  {t("기본으로 복원")}
                </button>
              </div>
              {items.length === 0 ? (
                <p className="online-message">{t("이 슬롯에 장착할 보유 꾸미기가 없습니다.")}</p>
              ) : (
                <div className="style-inventory-grid">
                  {items.map((item) => {
                    const equipped = economy.styleLoadout?.[slot.key] === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={equipped ? "selected" : ""}
                        disabled={busy !== null || equipped}
                        onClick={() => void equipStyle(slot.key, item.id)}
                      >
                        <CosmeticPreview item={item} label={localizedCosmeticName(item, locale)} />
                        <span><strong>{localizedCosmeticName(item, locale)}</strong><small>{t(item.rarity)}</small></span>
                        {equipped && <b>✓</b>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </section>

      <section id="tile-palette-editor" className={`palette-editor${editorOpen ? " open" : ""}`} aria-label={t("직접 조합하기")}>
        <div className="palette-editor-header">
          <div>
            <p className="eyebrow">CUSTOM PALETTE</p>
            <h3>{t("직접 조합하기")}</h3>
          </div>
          <button className="palette-editor-close" type="button" onClick={() => setEditorOpen(false)} aria-label={t("닫기")}>×</button>
        </div>

        <div className="palette-editor-layout">
          <div className="palette-draft-column">
            <div className="palette-draft-slots">
              {tileSlots.map((slot) => {
                const item = itemForSlot(ownedTiles, draftLoadout, slot.key);
                return (
                  <button
                    className={selectedSlot === slot.key ? "selected" : ""}
                    type="button"
                    key={slot.key}
                    onClick={() => setSelectedSlot(slot.key)}
                  >
                    <TileSkinPreview
                      {...(item ? { item } : {})}
                      defaultSlot={slot.key}
                      label={item ? localizedCosmeticName(item, locale) : t(slot.defaultName)}
                    />
                    <span>
                      <small>{t(slot.label)}</small>
                      <strong>{item ? localizedCosmeticName(item, locale) : t(slot.defaultName)}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              className="loadout-reset"
              type="button"
              disabled={draftLoadout[selectedSlot] === undefined}
              onClick={restoreDraftDefault}
            >
              {t("선택 슬롯을 기본으로 복원")}
            </button>
          </div>

          <div className="palette-inventory-column">
            <div className="owned-tile-tools">
              <label className="owned-tile-search">
                <span>{t("타일 이름 검색")}</span>
                <input
                  type="search"
                  value={tileQuery}
                  placeholder={t("이름으로 검색")}
                  onChange={(event) => setTileQuery(event.target.value)}
                />
              </label>
              <div className="owned-tile-rarity-filter" role="group" aria-label={t("보유 타일 등급 필터")}>
                <button type="button" className={tileRarity === "all" ? "active" : ""} onClick={() => setTileRarity("all")}>
                  {t("모두")} <small>{ownedTiles.length}</small>
                </button>
                {rarities.map((rarity) => (
                  <button type="button" key={rarity} className={tileRarity === rarity ? "active" : ""} onClick={() => setTileRarity(rarity)}>
                    {t(rarity)} <small>{ownedTiles.filter((item) => item.rarity === rarity).length}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="palette-owned-tile-grid">
              {filteredOwnedTiles.map((item) => {
                const selectedHere = draftLoadout[selectedSlot] === item.id;
                const usedElsewhere = tileSlots.some(
                  (slot) => slot.key !== selectedSlot && draftLoadout[slot.key] === item.id,
                );
                return (
                  <button
                    className={selectedHere ? "selected" : ""}
                    type="button"
                    key={item.id}
                    disabled={usedElsewhere}
                    onClick={() => selectDraftItem(item)}
                  >
                    <TileSkinPreview item={item} label={localizedCosmeticName(item, locale)} />
                    <span>
                      <strong>{localizedCosmeticName(item, locale)}</strong>
                      <small>{t(item.rarity)}</small>
                    </span>
                    {item.isNew && <i title={t("새로 획득한 스킨")}>!</i>}
                    {selectedHere && <b aria-hidden="true">✓</b>}
                  </button>
                );
              })}
            </div>
            {filteredOwnedTiles.length === 0 && <p className="online-message">{t("검색 조건에 맞는 보유 타일이 없습니다.")}</p>}
          </div>
        </div>

        <div className="palette-editor-actions">
          <button className="secondary-action" type="button" disabled={!draftChanged || busy !== null} onClick={() => setDraftLoadout({ ...economy.loadout })}>{t("변경 취소")}</button>
          <button className="secondary-action" type="button" disabled={busy !== null} onClick={requestSaveDraft}>{t("팔레트로 저장")}</button>
          <button className="primary-action" type="button" disabled={!draftChanged || busy !== null} onClick={() => void runAction({ kind: "equip", loadout: { ...draftLoadout } })}>{t("한 번에 장착")}</button>
        </div>
      </section>

      {message && <p className="online-message">{t(message)}</p>}

      {savePickerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSavePickerOpen(false)}>
          <section className="confirm-panel palette-save-picker" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">SAVE PALETTE</p>
            <h2>{t("저장할 팔레트를 선택하세요")}</h2>
            <p>{t("선택한 팔레트의 기존 조합은 덮어씁니다.")}</p>
            <div>
              {economy.tilePalettes.map((palette) => (
                <button type="button" key={palette.slotIndex} onClick={() => saveDraft(palette.slotIndex)}>
                  <PaletteTileStrip inventory={ownedTiles} loadout={palette.loadout} label={paletteNameFor(palette)} />
                  <strong>{paletteNameFor(palette)}</strong>
                </button>
              ))}
            </div>
            <button className="secondary-action" type="button" onClick={() => setSavePickerOpen(false)}>{t("취소")}</button>
          </section>
        </div>
      )}

      {pendingAction && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => { setPendingAction(null); setSimilarityConflicts([]); }}>
          <section className="confirm-panel tile-similarity-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">COLOR WARNING</p>
            <PaletteTileStrip
              inventory={ownedTiles}
              loadout={pendingAction.loadout}
              label={t("선택한 팔레트")}
              conflictSlots={new Set(similarityConflicts.flatMap((conflict) => conflict.slots))}
            />
            <h2>{t("다른 슬롯과 구분하기 어려운 색입니다.")}</h2>
            <p>{t("최종 팔레트의 세 타일을 서로 비교한 결과입니다. 게임 중 헷갈릴 수 있습니다.")}</p>
            {similarityConflicts.length > 0 && (
              <ul className="palette-conflict-list">
                {similarityConflicts.map((conflict) => (
                  <li key={conflict.slots.join(":")}>
                    {t(tileSlots.find((slot) => slot.key === conflict.slots[0])?.label ?? conflict.slots[0])}
                    <span aria-hidden="true">↔</span>
                    {t(tileSlots.find((slot) => slot.key === conflict.slots[1])?.label ?? conflict.slots[1])}
                  </li>
                ))}
              </ul>
            )}
            <p>{t("색각 보조 도형은 유지됩니다. 그래도 이 조합을 사용하시겠어요?")}</p>
            <div className="confirm-actions">
              <button className="secondary-action" type="button" onClick={() => { setPendingAction(null); setSimilarityConflicts([]); }}>{t("취소")}</button>
              <button className="primary-action" type="button" onClick={() => void runAction(pendingAction, true)}>{pendingAction.kind === "equip" ? t("그래도 장착") : t("그래도 저장")}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
