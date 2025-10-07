import { Project, SyntaxKind, BinaryExpression, CallExpression } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "apps/web-next/tsconfig.json"
});

const sourceFiles = project.addSourceFilesAtPaths([
  "apps/web-next/**/*.ts",
  "apps/web-next/**/*.tsx"
]);

let count = 0;

for (const sf of sourceFiles) {
  const binaries = sf.getDescendantsOfKind(SyntaxKind.BinaryExpression);
  for (const be of binaries) {
    if (be.getOperatorToken().getText() !== "&&") continue;

    const right = be.getRight();
    if (!right || right.getKind() !== SyntaxKind.CallExpression) continue;

    // Не трогаем, если слева тоже есть &&
    const leftText = be.getLeft().getText();
    if (leftText.includes("&&") || leftText.includes("?")) continue;

    const call = right as CallExpression;
    const condText = leftText.trim();
    const callText = call.getText().trim();

    // Заменяем весь expression statement
    const stmt = be.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
    if (stmt) {
      stmt.replaceWithText(`if (${condText}) { ${callText}; }`);
      count++;
    }
  }
}

project.saveSync();
console.log(`Rewritten: ${count}`);