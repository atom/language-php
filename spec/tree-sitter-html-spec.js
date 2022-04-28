const dedent = require("dedent");
const {expectTokensToEqual, toHaveScopesAtPosition, nextHighlightingUpdate} = require('./tree-sitter-helpers')

describe("Tree-sitter PHP grammar", () => {
  var editor;

  beforeEach(async () => {
    atom.config.set("core.useTreeSitterParsers", true);
    await atom.packages.activatePackage("language-php");
    await atom.packages.activatePackage("language-html");
    editor = await atom.workspace.open("foo.php");
  });

  beforeEach(function () {
    this.addMatchers({ toHaveScopesAtPosition });
  });

  describe("loading the grammar", () => {
    it('loads the wrapper HTML grammar', () => {
      embeddingGrammar = atom.grammars.grammarForScopeName("text.html.php");
      expect(embeddingGrammar).toBeTruthy();
      expect(embeddingGrammar.scopeName).toBe("text.html.php");
      expect(embeddingGrammar.constructor.name).toBe("TreeSitterGrammar");
      // FIXME how to test that all selectors were loaded correctly? Invalid
      // selectors may generate errors and it would be great to catch those here.

      // injections
      expect(embeddingGrammar.injectionPointsByType.template).toBeTruthy();
      expect(embeddingGrammar.injectionPointsByType.php).toBeTruthy();
    })
  });

  describe("shebang", () => {
    it("recognises shebang on the first line of document", () => {
      editor.setText(dedent`
                  #!/usr/bin/env php
                  <?php echo "test"; ?>
                `);

      // expect(editor).toHaveScopesAtPosition([0, 0], "#!",               ["text.html.php", "comment.line.shebang.php", "punctuation.definition.comment.php"], true);
      expect(editor).toHaveScopesAtPosition([0, 1], "#!",               ["text.html.php", "comment.line.shebang.php",
        // FIXME following scopes differ from TM
        'source.html'
      ], true);
      expect(editor).toHaveScopesAtPosition([0, 2], "/usr/bin/env php", ["text.html.php", "comment.line.shebang.php",
        // FIXME following scopes differ from TM
        'source.html'
      ], true);
      expect(editor).toHaveScopesAtPosition([1, 0], "<?php",            ["text.html.php",
        // "meta.embedded.line.php", "punctuation.section.embedded.begin.php"
      ], true);
      expect(editor).toHaveScopesAtPosition([1, 1], "<?php",            ["text.html.php", "meta.embedded.line.php", "punctuation.section.embedded.begin.php",
        // FIXME following scopes differ from TM
        'source.php'
      ], true);
    });

    it("does not recognize shebang on any of the other lines", () => {
      editor.setText(dedent`

                  #!/usr/bin/env php
                  <?php echo "test"; ?>
                `);

      expect(editor).toHaveScopesAtPosition([1, 0], "#!", ["text.html.php"], true);
      expect(editor).toHaveScopesAtPosition([1, 1], "#!", ["text.html.php",
        // FIXME following scopes differ from TM
        'meta.embedded.line.php',
        'source.php',
        'punctuation.section.embedded.begin.php'
      ], true);
    });
  });
});
