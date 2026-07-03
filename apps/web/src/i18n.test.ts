import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { questLabels } from "./components/EconomyQuestGrid";
import { paletteSteps } from "./components/RankBadge";
import { patchNoteReleases } from "./components/PatchNotesPanel";
import { tutorialSteps } from "./components/TutorialPanel";
import { hasTranslation, translateMessage } from "./i18n";
import { matchModeLabels, matchResultLabels } from "./pages/AccountPage";

describe("localization catalog", () => {
  it.each([
    "Tango 초대",
    "Tango 관전",
    "Tango 리플레이",
    "처음부터 재생",
    "재생 속도",
    "득점 연결",
    "전체 순위",
    "초대 링크로 대전에 참가하세요.",
    "진행 중인 대전을 함께 보세요.",
    "현재 수의 공유 링크를 복사했습니다.",
    "관전 서버에 연결하지 못했습니다.",
    "온라인 대전 정보",
    "REPLAY_NOT_FOUND",
    "TURN_TIME_EXPIRED",
    "개인정보 처리방침",
    "계정 삭제",
    "INVALID_PASSWORD",
    "ACCOUNT_IN_ACTIVE_MATCH",
    "스킨 도감",
    "타일 스킨 36종과 스킨 도감",
    "로그인 출석 팝업",
  ])("contains every critical user-facing translation: %s", (key) => {
    expect(hasTranslation(key)).toBe(true);
  });

  const computedTranslationKeys = [
    ...Object.values(questLabels),
    ...Object.values(matchModeLabels),
    ...Object.values(matchResultLabels),
    ...paletteSteps.map((step) => step.label),
    "무지개",
    "빈 팔레트",
    ...tutorialSteps.flatMap((step) => [step.title, step.body, ...step.points]),
    ...patchNoteReleases.flatMap((release) => [
      release.title,
      release.summary,
      ...release.entries.flatMap((entry) => [entry.title, entry.body]),
    ]),
  ];

  it.each([...new Set(computedTranslationKeys)])(
    "contains computed user-facing translation: %s",
    (key) => {
      expect(hasTranslation(key)).toBe(true);
    },
  );

  it("contains every literal passed directly to t()", () => {
    const sourceRoot = fileURLToPath(new URL(".", import.meta.url));
    const sourceFiles = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const filePath = path.join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(filePath);
        if (!/\.(ts|tsx)$/.test(entry.name) || /\.(test|spec)\.(ts|tsx)$/.test(entry.name)) return [];
        return [filePath];
      });

    const missing: string[] = [];
    for (const filePath of sourceFiles(sourceRoot)) {
      const source = readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node)
          && ts.isIdentifier(node.expression)
          && node.expression.text === "t"
          && node.arguments[0]
          && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
          && !hasTranslation(node.arguments[0].text)
        ) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          missing.push(`${node.arguments[0].text} (${path.relative(sourceRoot, filePath)}:${line})`);
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    expect(missing).toEqual([]);
  });

  it("renders recent quest and patch copy in every supported foreign language", () => {
    const recentKeys = [
      "퀘스트 기간",
      "주간",
      ...Object.values(questLabels),
      patchNoteReleases[0]!.title,
      patchNoteReleases[0]!.summary,
      ...patchNoteReleases[0]!.entries.flatMap((entry) => [entry.title, entry.body]),
      "Google로 로그인",
      "구매 확정",
      "전적 모드",
      ...Object.values(matchResultLabels),
    ];

    for (const locale of ["en", "ja", "es", "pt-BR"] as const) {
      for (const key of recentKeys) {
        expect(translateMessage(key, locale), `${locale}: ${key}`).not.toBe(key);
      }
    }
  });
});
