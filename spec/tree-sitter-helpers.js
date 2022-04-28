const dedent = require("dedent");

module.exports = {
  // https://github.com/atom/atom/blob/b3d3a52d9e4eb41f33df7b91ad1f8a2657a04487/spec/tree-sitter-language-mode-spec.js#L47-L55
  expectTokensToEqual(editor, expectedTokenLines, startingRow = 1) {
    const lastRow = editor.getLastScreenRow();

    for (let row = startingRow; row <= lastRow - startingRow; row++) {
      const tokenLine = editor
        .tokensForScreenRow(row)
        .map(({ text, scopes }) => ({
          text,
          scopes: scopes.map((scope) =>
            scope
              .split(" ")
              .map((className) => className.replace("syntax--", ""))
              .join(".")
          ),
        }));

      const expectedTokenLine = expectedTokenLines[row - startingRow];

      expect(tokenLine.length).toEqual(expectedTokenLine.length);
      for (let i = 0; i < tokenLine.length; i++) {
        expect(tokenLine[i].text).toEqual(
          expectedTokenLine[i].text,
          `Token ${i}, row: ${row}`
        );
        expect(tokenLine[i].scopes).toEqual(
          expectedTokenLine[i].scopes,
          `Token ${i}, row: ${row}, token: '${tokenLine[i].text}'`
        );
      }
    }
  },

  toHaveScopesAtPosition(posn, token, expected, includeEmbeddedScopes = false) {
    if (expected === undefined) {
      expected = token;
    }
    if (token === undefined) {
      expected = [];
    }

    // token is not used at this time; it's just a way to keep note where we are
    // in the line

    let filterEmbeddedScopes = (scope) =>
      includeEmbeddedScopes ||
      (scope !== "text.html.php" &&
        scope !== "meta.embedded.block.php" &&
        scope !== "meta.embedded.line.php");

    let actual = this.actual
      .scopeDescriptorForBufferPosition(posn)
      .scopes.filter(filterEmbeddedScopes);

    let notExpected = actual.filter((scope) => !expected.includes(scope));
    let notReceived = expected.filter((scope) => !actual.includes(scope));

    let pass = notExpected.length === 0 && notReceived.length === 0;

    if (pass) {
      this.message = () => "Scopes matched";
    } else {
      let line = this.actual.getBuffer().lineForRow(posn[0]);
      let caret = " ".repeat(posn[1]) + "^";

      this.message = () =>
        `Failure:
  Scopes did not match at position [${posn.join(", ")}]:
${line}
${caret}
  These scopes were expected but not received:
      ${notReceived.join(", ")}
  These scopes were received but not expected:
      ${notExpected.join(", ")}
      `;
    }

    return pass;
  },

  setPhpText(content) {
    this.setText(`<?php
${dedent(content)}
`);
  },

  nextHighlightingUpdate(editor) {
    return new Promise((resolve) => {
      const subscription = editor
        .getBuffer()
        .getLanguageMode()
        .onDidChangeHighlighting(() => {
          subscription.dispose();
          resolve();
        });
    });
  },
};
