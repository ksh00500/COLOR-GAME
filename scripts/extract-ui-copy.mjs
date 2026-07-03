import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const webSource = path.join(root, "apps", "web", "src");
const i18nPath = path.join(webSource, "i18n.ts");
const outputPath = path.join(root, "docs", "ui-text-review.md");

const relative = (filePath) => path.relative(root, filePath).replaceAll("\\", "/");
const lineOf = (sourceFile, node) =>
  sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
const sourceLink = (filePath, line) => `${relative(filePath)}:${line}`;
const escapeMarkdown = (value) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r", "")
    .replaceAll("\n", " ↵ ")
    .replaceAll("|", "\\|")
    .trim();

const walkFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) return [];
    return [fullPath];
  });

const parseFile = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
};

const i18nSource = parseFile(i18nPath);
const messages = [];

const readPropertyName = (name) => {
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isIdentifier(name)) {
    return name.text;
  }
  return null;
};

const readStringValue = (node) => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
};

const collectMessages = (node) => {
  if (
    ts.isVariableDeclaration(node)
    && ts.isIdentifier(node.name)
    && node.name.text === "messages"
    && node.initializer
    && ts.isObjectLiteralExpression(node.initializer)
  ) {
    for (const property of node.initializer.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const ko = readPropertyName(property.name);
      if (ko === null || !ts.isObjectLiteralExpression(property.initializer)) continue;
      const translations = {};
      for (const translation of property.initializer.properties) {
        if (!ts.isPropertyAssignment(translation)) continue;
        const locale = readPropertyName(translation.name);
        const value = readStringValue(translation.initializer);
        if (locale && value !== null) translations[locale] = value;
      }
      messages.push({
        ko,
        translations,
        line: lineOf(i18nSource, property),
        usages: [],
      });
    }
  }
  ts.forEachChild(node, collectMessages);
};
collectMessages(i18nSource);

const messageByKey = new Map(messages.map((message) => [message.ko, message]));
const hardcoded = [];
const hardcodedKeys = new Set();
const dynamic = [];
const dynamicKeys = new Set();
const missingTranslations = [];
const missingTranslationKeys = new Set();

const addHardcoded = (text, filePath, line, kind) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized === "" || !/[A-Za-z가-힣]/.test(normalized)) return;
  const key = `${normalized}|${relative(filePath)}|${line}|${kind}`;
  if (hardcodedKeys.has(key)) return;
  hardcodedKeys.add(key);
  hardcoded.push({ text: normalized, filePath, line, kind });
};

const addDynamic = (text, filePath, line, kind) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized === "" || !/[A-Za-z가-힣]/.test(normalized)) return;
  const key = `${normalized}|${relative(filePath)}|${line}|${kind}`;
  if (dynamicKeys.has(key)) return;
  dynamicKeys.add(key);
  dynamic.push({ text: normalized, filePath, line, kind });
};

const isInVisibleJsxExpression = (node) => {
  let current = node.parent;
  let foundExpression = false;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isJsxAttribute(current)) return false;
    if (ts.isJsxExpression(current)) foundExpression = true;
    current = current.parent;
  }
  return foundExpression;
};

const files = walkFiles(webSource);
for (const filePath of files) {
  const sourceFile = parseFile(filePath);
  const visit = (node) => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "t"
      && node.arguments[0]
      && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
    ) {
      const key = node.arguments[0].text;
      const message = messageByKey.get(key);
      if (message) message.usages.push(sourceLink(filePath, lineOf(sourceFile, node)));
      else {
        const location = sourceLink(filePath, lineOf(sourceFile, node));
        const missingKey = `${key}|${location}`;
        if (!missingTranslationKeys.has(missingKey)) {
          missingTranslationKeys.add(missingKey);
          missingTranslations.push({ key, location });
        }
      }
    }

    if (ts.isJsxText(node)) {
      addHardcoded(node.text, filePath, lineOf(sourceFile, node), "JSX 본문");
    }

    if (
      ts.isJsxAttribute(node)
      && ["aria-label", "placeholder", "title", "alt"].includes(node.name.text)
      && node.initializer
      && ts.isStringLiteral(node.initializer)
    ) {
      addHardcoded(
        node.initializer.text,
        filePath,
        lineOf(sourceFile, node),
        `${node.name.text} 속성`,
      );
    }

    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && ["setMessage", "setError", "setStatus"].includes(node.expression.text)
      && node.arguments[0]
    ) {
      const argument = node.arguments[0];
      if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
        addHardcoded(
          argument.text,
          filePath,
          lineOf(sourceFile, argument),
          `${node.expression.text} 상태 문구`,
        );
      } else if (ts.isTemplateExpression(argument)) {
        addDynamic(
          argument.getText(sourceFile),
          filePath,
          lineOf(sourceFile, argument),
          `${node.expression.text} 동적 문구`,
        );
      }
    }

    if (
      (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node))
      && isInVisibleJsxExpression(node)
    ) {
      addDynamic(node.getText(sourceFile), filePath, lineOf(sourceFile, node), "JSX 동적 문구");
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

const uniqueUsages = (usages) => [...new Set(usages)].slice(0, 8);
const lines = [
  "# Tango UI 문구 전체 검토본",
  "",
  "- 다시 생성: `node scripts/extract-ui-copy.mjs`",
  `- 번역 원문: ${messages.length}개`,
  `- 코드 직접 표시 문구: ${hardcoded.length}개`,
  `- 동적 조합 문구 후보: ${dynamic.length}개`,
  `- 번역 사전 누락 호출: ${missingTranslations.length}개`,
  "- 검토 방법: 각 항목의 `수정안:` 뒤에 원하는 문구를 적거나, 유지할 항목에는 `유지`라고 적어 주세요.",
  "- 이 파일은 검토용 자동 생성물입니다. 앱 코드는 이 파일을 직접 읽지 않습니다.",
  "",
  "## 1. 우선 확인이 필요한 동적 문구",
  "",
  "### R-001 리플레이 수 표시",
  "",
  "- 현재 형식: `{{turn}} TURN · +{{earnedScore}} PT{{removalLabel}}`",
  "- 현재 제거 라벨: 제거 대기 상태이면 항상 ` · 득점 연결`",
  "- 문제 재현: 보드가 가득 차 마지막 색을 제거하는 0점 수에도 `+0 PT · 득점 연결`로 표시됨",
  "- 코드 위치: `apps/web/src/pages/ReplayPage.tsx:194`",
  "- 수정안:",
  "",
  "### R-002 리플레이 시작 위치",
  "",
  "- 현재 형식: `{{turn}} TURN · 시작 위치`",
  "- 코드 위치: `apps/web/src/pages/ReplayPage.tsx:192`",
  "- 수정안:",
  "",
  "### R-003 리플레이 종료 위치",
  "",
  "- 현재 형식: `대전 종료`",
  "- 조건: 마지막 수 이후",
  "- 코드 위치: `apps/web/src/pages/ReplayPage.tsx:154`",
  "- 수정안:",
  "",
  "## 2. 번역 사전의 한국어 원문",
  "",
  "아래 항목은 웹과 Android 앱이 함께 사용하는 한국어 기준 문구입니다. `사용 위치 없음`은 동적 오류 코드이거나 현재 화면에서 직접 호출되지 않는 항목일 수 있습니다.",
  "",
];

messages.forEach((message, index) => {
  const id = `T-${String(index + 1).padStart(4, "0")}`;
  const usages = uniqueUsages(message.usages);
  lines.push(
    `### ${id}`,
    "",
    `- 현재: ${escapeMarkdown(message.ko)}`,
    `- 위치: \`apps/web/src/i18n.ts:${message.line}\``,
    `- 사용: ${usages.length > 0 ? usages.map((usage) => `\`${usage}\``).join(", ") : "사용 위치 없음"}`,
    "- 수정안:",
    "",
  );
});

lines.push(
  "## 3. 번역 함수를 거치지 않는 코드 직접 표시 문구",
  "",
  "영문 눈썹 제목, 관리자 화면, 접근성 라벨과 일부 상태 문구가 포함됩니다.",
  "",
);

hardcoded
  .sort((a, b) => relative(a.filePath).localeCompare(relative(b.filePath)) || a.line - b.line)
  .forEach((entry, index) => {
    const id = `H-${String(index + 1).padStart(4, "0")}`;
    lines.push(
      `### ${id}`,
      "",
      `- 현재: ${escapeMarkdown(entry.text)}`,
      `- 종류: ${entry.kind}`,
      `- 위치: \`${sourceLink(entry.filePath, entry.line)}\``,
      "- 수정안:",
      "",
    );
  });

lines.push(
  "## 4. 코드에서 조합되는 동적 문구 후보",
  "",
  "변수 값과 함께 화면에 조합되는 문구입니다. 실제 의미는 위치의 조건문도 함께 확인해야 합니다.",
  "",
);

dynamic
  .sort((a, b) => relative(a.filePath).localeCompare(relative(b.filePath)) || a.line - b.line)
  .forEach((entry, index) => {
    const id = `D-${String(index + 1).padStart(4, "0")}`;
    lines.push(
      `### ${id}`,
      "",
      `- 현재 코드: \`${escapeMarkdown(entry.text)}\``,
      `- 종류: ${entry.kind}`,
      `- 위치: \`${sourceLink(entry.filePath, entry.line)}\``,
      "- 수정안:",
      "",
    );
  });

lines.push(
  "## 5. 번역 사전에 없는 `t(...)` 호출",
  "",
  "이 항목이 남아 있으면 한국어 외 언어에서도 한국어 원문이 그대로 표시될 수 있습니다.",
  "",
);

missingTranslations
  .sort((a, b) => a.key.localeCompare(b.key) || a.location.localeCompare(b.location))
  .forEach((entry, index) => {
    const id = `M-${String(index + 1).padStart(4, "0")}`;
    lines.push(
      `### ${id}`,
      "",
      `- 누락 문구: ${escapeMarkdown(entry.key)}`,
      `- 사용 위치: \`${entry.location}\``,
      "- 수정안:",
      "",
    );
  });

while (lines.at(-1) === "") lines.pop();
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(
  `Wrote ${relative(outputPath)} with ${messages.length + hardcoded.length + dynamic.length} entries and ${missingTranslations.length} missing translations.`,
);
