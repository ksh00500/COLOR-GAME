import type { CosmeticOutcome } from "../api";
import { localizedCosmeticName } from "../cosmetic-localization";
import { useI18n } from "../i18n";
import { CosmeticPreview } from "./CosmeticPreview";

export function CosmeticOutcomeModal({
  outcome,
  source,
  onClose,
  onAgain,
  againDisabled = false,
}: {
  outcome: CosmeticOutcome;
  source: "box" | "combine";
  onClose: () => void;
  onAgain?: () => void;
  againDisabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const cosmeticName = outcome.cosmetic
    ? localizedCosmeticName(outcome.cosmetic, locale)
    : null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="box-result-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cosmetic-outcome-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">{source === "box" ? "PALETTE BOX OPEN" : "FRAGMENT CRAFT"}</p>
        {outcome.cosmetic ? (
          <CosmeticPreview
            item={outcome.cosmetic}
            className="box-result-skin"
            label={cosmeticName ?? outcome.cosmetic.nameKo}
          />
        ) : (
          <div className={`box-result-gem rarity-${outcome.rarity}`}>◆</div>
        )}
        <h2 id="cosmetic-outcome-title">
          {cosmeticName ?? t("{rarity} 파편 1개", { rarity: t(outcome.rarity) })}
        </h2>
        <p>
          {outcome.cosmetic
            ? t(source === "combine" ? "파편을 합성해 새로운 스킨을 완성했습니다." : "새로운 스킨을 획득했습니다.")
            : t("같은 등급 파편 4개를 모아 스킨을 합성하세요.")}
        </p>
        <div className="box-result-actions">
          <button className="secondary-action" type="button" onClick={onClose}>{t("확인했어요")}</button>
          {onAgain && (
            <button className="primary-action" type="button" disabled={againDisabled} onClick={onAgain}>
              {t("다시 뽑기")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
