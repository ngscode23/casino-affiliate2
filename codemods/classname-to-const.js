/**
 * Codemod: replace hardcoded className strings with named constants.
 *
 * Usage example:
 *   npx jscodeshift -t codemods/classname-to-const.js apps/web-next/app --extensions=tsx --parser=tsx
 *
 * Before running:
 *   1. Edit CLASSNAME_MAP below – add pairs "class string" -> "constantName".
 *   2. Create / update src/styles/classnames.ts to export these constants.
 *
 * This codemod intentionally работает только с точными совпадениями строк,
 * чтобы не трогать динамические или уникальные классы.
 */

const path = require("path");

const CLASSNAME_MAP = new Map([
  // Общие текстовые паттерны
  ["text-xs uppercase tracking-[0.3em] text-slate-500", "overlineLight"],
  ["text-xs uppercase tracking-widest text-white/40", "overlineDark"],
  ["text-sm font-medium text-admin-text", "adminFieldLabel"],
  ["text-xs text-muted-foreground", "mutedTextXs"],
  ["text-sm text-muted-foreground", "mutedTextSm"],
  ["text-sm text-muted", "mutedTextSmLegacy"],
  ["text-xl font-semibold text-fg", "sectionTitle"],
  ["mb-1 block text-sm", "labelTextSm"],
  ["h-4 w-4", "iconSm"],
  ["text-lg font-semibold text-white", "headingLgOnDark"],
]);

// Откуда импортировать константы (можешь поменять под свой путь)
const IMPORT_SOURCE = "@/styles/classnames";

/** @type {import('jscodeshift').Transform} */
module.exports = function transformer(fileInfo, api, options) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Разбираем только .tsx / .jsx файлы
  const fileExt = path.extname(fileInfo.path);
  if (![".tsx", ".jsx"].includes(fileExt)) {
    return fileInfo.source;
  }

  if (CLASSNAME_MAP.size === 0) {
    // Нечего менять
    return fileInfo.source;
  }

  const usedConstants = new Set();

  root
    .find(j.JSXAttribute, { name: { name: "className" } })
    .forEach((attrPath) => {
      const attr = attrPath.node;
      if (!attr.value) return;

      let literal = null;
      if (attr.value.type === "StringLiteral") {
        literal = attr.value;
      } else if (
        attr.value.type === "JSXExpressionContainer" &&
        attr.value.expression.type === "StringLiteral"
      ) {
        literal = attr.value.expression;
      }

      if (!literal) return;

      const raw = literal.value.trim();
      const mappedName = CLASSNAME_MAP.get(raw);
      if (!mappedName) return;

      usedConstants.add(mappedName);

      // Заменяем значение на {CONST_NAME}
      attr.value = j.jsxExpressionContainer(j.identifier(mappedName));
    });

  if (usedConstants.size === 0) {
    return fileInfo.source;
  }

  // Добавляем / дополняем import { ... } from IMPORT_SOURCE
  const importCollection = root
    .find(j.ImportDeclaration)
    .filter((p) => p.node.source.value === IMPORT_SOURCE);

  if (importCollection.size() > 0) {
    const existingImport = importCollection.get(0);
    const specifiers = existingImport.node.specifiers || [];
    const existingNames = new Set(
      specifiers
        .filter((s) => s.type === "ImportSpecifier" && s.imported.type === "Identifier")
        .map((s) => s.imported.name),
    );

    usedConstants.forEach((name) => {
      if (!existingNames.has(name)) {
        specifiers.push(j.importSpecifier(j.identifier(name)));
      }
    });
  } else {
    const importDecl = j.importDeclaration(
      Array.from(usedConstants).map((name) => j.importSpecifier(j.identifier(name))),
      j.stringLiteral(IMPORT_SOURCE),
    );
    const body = root.get().node.program.body;
    body.unshift(importDecl);
  }

  return root.toSource(options.printOptions || { quote: "double" });
};
