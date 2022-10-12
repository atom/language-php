const dedent = require("dedent");
const {expectTokensToEqual, toHaveScopesAtPosition, setPhpText, nextHighlightingUpdate} = require('./tree-sitter-helpers')

describe("Tree-sitter PHP grammar", () => {
  var editor;

  beforeEach(async () => {
    atom.config.set("core.useTreeSitterParsers", true);
    await atom.packages.activatePackage("language-php");
    editor = await atom.workspace.open("foo.php");
    editor.setPhpText = setPhpText;
  });

  beforeEach(function () {
    this.addMatchers({toHaveScopesAtPosition});
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

    it('loads the PHP grammar', () => {
      embeddedGrammar = atom.grammars.grammarForScopeName("source.php");
      expect(embeddedGrammar).toBeTruthy();
      expect(embeddedGrammar.scopeName).toBe("source.php");
      expect(embeddedGrammar.constructor.name).toBe("TreeSitterGrammar");
      // FIXME how to test that all selectors were loaded correctly? Invalid
      // selectors may generate errors and it would be great to catch those here.

      // injections
      expect(embeddedGrammar.injectionPointsByType.comment).toBeTruthy();
    });
  });

  describe("html embedding", () => {

    beforeEach(async () => await atom.packages.activatePackage("language-html"));

    it("handles php wrapped in html", () => {
      editor.setText(dedent `
        <div>
        <?php echo $foo; ?>
        </div>
        `);

      let includingEmbeddedScopes = true

      // FIXME following scopes differ from TM
      // BUT this appears to *also* be the case w/ the ERB grammar
      // adding a single space before the `<` will correct this
      expect(editor).toHaveScopesAtPosition([0, 0], '<',   ['text.html.php'],                                                  includingEmbeddedScopes)
      expect(editor).toHaveScopesAtPosition([0, 1], 'div', ['text.html.php', 'source.html', 'entity.name.tag'],                includingEmbeddedScopes)
      expect(editor).toHaveScopesAtPosition([0, 4], '>',   ['text.html.php', 'source.html', 'punctuation.definition.tag.end'], includingEmbeddedScopes)

      // FIXME checking posn 0 doesn't work, posn 1 *does*
      // again, this mostly matches the ERB grammar
      // expect(editor).toHaveScopesAtPosition([1, 0], '<?php', ['source.html'])
      expect(editor).toHaveScopesAtPosition([1, 1], '<?php', ['source.html', 'source.php', 'punctuation.section.embedded.begin.php'])
      expect(editor).toHaveScopesAtPosition([1, 6], 'echo',  ['source.html', 'source.php', 'support.function.construct.output.php'])
      expect(editor).toHaveScopesAtPosition([1, 17], '?>',   ['source.html', 'source.php', 'punctuation.section.embedded.end.php'])

      // FIXME checking posn 0 doesn't work, posn 1 *does*
      // expect(editor).toHaveScopesAtPosition([2, 0], '</',  ['source.html', 'punctuation.definition.tag.begin'])
      expect(editor).toHaveScopesAtPosition([2, 1], '</',  ['source.html', 'punctuation.definition.tag.begin'])
      expect(editor).toHaveScopesAtPosition([2, 2], 'div', ['source.html', 'entity.name.tag'])
      expect(editor).toHaveScopesAtPosition([2, 5], '>',   ['source.html', 'punctuation.definition.tag.end'])
    })

    it("handles php with only leading html", () => {
      editor.setText(dedent `
         <div>
        <?php echo $foo;
        `);

      let includingEmbeddedScopes = true

      expect(editor).toHaveScopesAtPosition([0, 0], '<',   ['text.html.php'],                                                  includingEmbeddedScopes)
      expect(editor).toHaveScopesAtPosition([0, 1], 'div', ['text.html.php', 'source.html', 'entity.name.tag'],                includingEmbeddedScopes)
      expect(editor).toHaveScopesAtPosition([0, 4], '>',   ['text.html.php', 'source.html', 'punctuation.definition.tag.end'], includingEmbeddedScopes)

      // FIXME checking posn 0 doesn't work, posn 1 *does*
      // expect(editor).toHaveScopesAtPosition([1, 0], '<?php', ['source.php', 'punctuation.section.embedded.begin.php'])
      expect(editor).toHaveScopesAtPosition([1, 1], '<?php', ['source.php', 'punctuation.section.embedded.begin.php'])
      expect(editor).toHaveScopesAtPosition([1, 5], ' ',     ['source.php'])
      expect(editor).toHaveScopesAtPosition([1, 6], 'echo',  ['source.php', 'support.function.construct.output.php'])
      expect(editor).toHaveScopesAtPosition([1, 10], ' ',    ['source.php'])
      expect(editor).toHaveScopesAtPosition([1, 11], '$',    ['source.php', 'variable.other.php', 'punctuation.definition.variable.php'])
      expect(editor).toHaveScopesAtPosition([1, 12], 'foo',  ['source.php', 'variable.other.php'])
      expect(editor).toHaveScopesAtPosition([1, 15], ';',    ['source.php', 'punctuation.terminator.expression.php'])
    })
  })

  describe("operators", () => {
    it("should tokenize = correctly", () => {
      editor.setPhpText('$test = 1;');

      expect(editor).toHaveScopesAtPosition([1, 0], '$', ["source.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], ' ', ["source.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], '=', ["source.php", "keyword.operator.assignment.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], '1', ["source.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ';', ["source.php", "punctuation.terminator.expression.php"]);
    });

    it("should tokenize + correctly", () => {
      editor.setPhpText('1 + 2;');

      expect(editor).toHaveScopesAtPosition([1, 0], '1', ["source.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 2], '+', ["source.php", "keyword.operator.arithmetic.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], '2', ["source.php", "constant.numeric.decimal.php"]);
    });

    it("should tokenize - correctly", () => {
      editor.setPhpText('1 - 2;');

      expect(editor).toHaveScopesAtPosition([1, 0], '1', ["source.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 2], '-', ["source.php", "keyword.operator.arithmetic.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], '2', ["source.php", "constant.numeric.decimal.php"]);
    });

    it("should tokenize * correctly", () => {
      editor.setPhpText('1 * 2;');

      expect(editor).toHaveScopesAtPosition([1, 0], '1', ["source.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 2], '*', ["source.php", "keyword.operator.arithmetic.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], '2', ["source.php", "constant.numeric.decimal.php"]);
    });

    it("should tokenize / correctly", () => {
      editor.setPhpText('1 / 2;');

      expect(editor).toHaveScopesAtPosition([1, 0], '1', ["source.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 2], '/', ["source.php", "keyword.operator.arithmetic.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], '2', ["source.php", "constant.numeric.decimal.php"]);
    });

    it("should tokenize % correctly", () => {
      editor.setPhpText('1 % 2;');

      expect(editor).toHaveScopesAtPosition([1, 0], '1', ["source.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 2], '%', ["source.php", "keyword.operator.arithmetic.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], '2', ["source.php", "constant.numeric.decimal.php"]);
    });

    it("should tokenize ** correctly", () => {
      editor.setPhpText('1 ** 2;');

      expect(editor).toHaveScopesAtPosition([1, 0], '1',  ["source.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 2], '**', ["source.php", "keyword.operator.arithmetic.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], '2',  ["source.php", "constant.numeric.decimal.php"]);
    });

    // TODO is this case insensitive?
    it("should tokenize instanceof correctly", () => {
      editor.setText(dedent`
        <?php
        $x instanceof Foo
        `);

      expect(editor).toHaveScopesAtPosition([1, 0], ["source.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 1], ['source.php', "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 3], ['source.php', "keyword.operator.type.php"]);
      expect(editor).toHaveScopesAtPosition([1, 14], ['source.php', "support.class.php"]);
    });

    describe("combined operators", () => {
      it("should tokenize === correctly", () => {
        editor.setText(dedent`
          <?php
          $test === 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.comparison.php"]);
      });

      it("should tokenize += correctly", () => {
        editor.setText(dedent`
          <?php
          $test += 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize -= correctly", () => {
        editor.setText(dedent`
          <?php
          $test -= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize *= correctly", () => {
        editor.setText(dedent`
          <?php
          $test *= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize /= correctly", () => {
        editor.setText(dedent`
          <?php
          $test /= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize %= correctly", () => {
        editor.setText(dedent`
          <?php
          $test %= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize .= correctly", () => {
        editor.setText(dedent`
          <?php
          $test .= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.string.php"]);
      });

      it("should tokenize &= correctly", () => {
        editor.setText(dedent`
          <?php
          $test &= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize |= correctly", () => {
        editor.setText(dedent`
          <?php
          $test |= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize ^= correctly", () => {
        editor.setText(dedent`
          <?php
          $test ^= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize <<= correctly", () => {
        editor.setText(dedent`
          <?php
          $test <<= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize >>= correctly", () => {
        editor.setText(dedent`
          <?php
          $test >>= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize **= correctly", () => {
        editor.setText(dedent`
          <?php
          $test **= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize ?? correctly", () => {
        editor.setText(dedent`
                <?php
                $foo = $bar ?? 'bar';
                `);

        expect(editor).toHaveScopesAtPosition([1, 12], ['source.php', "keyword.operator.null-coalescing.php"]);
      });

      it("should tokenize ??= correctly", () => {
        editor.setText(dedent`
          <?php
          $test ??= 2;
          `);

        expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "keyword.operator.assignment.php"]);
      });

      it("should tokenize ... correctly", async () => {
        editor.setPhpText('[0,...$b,2]')

        expect(editor).toHaveScopesAtPosition([1, 0], '[',   ['source.php', "punctuation.section.array.begin.php",
          // FIXME following scopes differ from TM
          'meta.array.php'
        ]);
        expect(editor).toHaveScopesAtPosition([1, 3], '...', ['source.php', "keyword.operator.spread.php",
          // FIXME following scopes differ from TM
          'meta.array.php'
        ]);
        expect(editor).toHaveScopesAtPosition([1, 6], '$',   ["source.php", "variable.other.php", "punctuation.definition.variable.php",
          // FIXME following scopes differ from TM
          'meta.array.php'
        ]);
        expect(editor).toHaveScopesAtPosition([1, 7], 'b',   ['source.php', "variable.other.php",
          // FIXME following scopes differ from TM
          'meta.array.php'
        ]);
        expect(editor).toHaveScopesAtPosition([1, 10],']',   ['source.php', "punctuation.section.array.end.php",
          // FIXME following scopes differ from TM
          'meta.array.php'
        ]);

        editor.setPhpText('test($a, ...$b)');
        await nextHighlightingUpdate(editor)

        expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.function-call.php", "entity.name.function.php"]);
        expect(editor).toHaveScopesAtPosition([1, 4], ["source.php", "meta.function-call.php", "punctuation.definition.arguments.begin.bracket.round.php"]);
        expect(editor).toHaveScopesAtPosition([1, 9], ["source.php", "meta.function-call.php", "keyword.operator.spread.php"]);
        expect(editor).toHaveScopesAtPosition([1, 12], ["source.php", "meta.function-call.php", "variable.other.php", "punctuation.definition.variable.php"]);
        expect(editor).toHaveScopesAtPosition([1, 13], ['source.php', "meta.function-call.php", "variable.other.php"]);
        expect(editor).toHaveScopesAtPosition([1, 14], ["source.php", "meta.function-call.php", "punctuation.definition.arguments.end.bracket.round.php"]);
      });
    });

    describe("ternaries", () => {
      it("should tokenize ternary expressions", async () => {
        editor.setText(dedent`
          <?php
          $foo = 1 == 3 ? true : false;
          `);

        expect(editor).toHaveScopesAtPosition([1, 14], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([1, 21], ['source.php', "keyword.operator.ternary.php"]);

        editor.setText(dedent`
          <?php
          $foo = 1 == 3
          ? true
          : false;
          `);
        await nextHighlightingUpdate(editor)

        expect(editor).toHaveScopesAtPosition([2, 0], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([3, 0], ['source.php', "keyword.operator.ternary.php"]);

        editor.setText(dedent`
          <?php
          $foo=1==3?true:false;
          `);
        await nextHighlightingUpdate(editor)

        expect(editor).toHaveScopesAtPosition([1, 9], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([1, 14], ['source.php', "keyword.operator.ternary.php"]);
      });

      it("should tokenize shorthand ternaries", () => {
        editor.setText(dedent`
          <?php
          $foo = false ?: false ?: true ?: false;
          `);

        expect(editor).toHaveScopesAtPosition([1, 13], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([1, 22], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([1, 30], ['source.php', "keyword.operator.ternary.php"]);
      });

      it("should tokenize a combination of ternaries", () => {
        editor.setText(dedent`
          <?php
          $foo = false ?: true == 1
          ? true : false ?: false;
          `);

        expect(editor).toHaveScopesAtPosition([1, 13], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([2, 0], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([2, 7], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([2, 15], ['source.php', "keyword.operator.ternary.php"]);
      });

      it("should tokenize ternaries with double colons", () => {
        editor.setText(dedent`
          <?php
          true ? A::$a : B::$b
          `);

        expect(editor).toHaveScopesAtPosition([1, 5], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([1, 8], ['source.php', "keyword.operator.class.php"]);
        expect(editor).toHaveScopesAtPosition([1, 13], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([1, 16], ['source.php', "keyword.operator.class.php"]);
      });

      it("should NOT tokenize a ternary statement as a goto label", () => {
        // See https://github.com/atom/language-php/issues/386
        editor.setText(dedent`
          <?php
          $a ?
            null :
            $b
          `);

        expect(editor).toHaveScopesAtPosition([1, 0], ["source.php", "variable.other.php", "punctuation.definition.variable.php"]);
        expect(editor).toHaveScopesAtPosition([1, 1], ['source.php', "variable.other.php"]);
        expect(editor).toHaveScopesAtPosition([1, 3], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([2, 2], ['source.php', "constant.language.php"]);
        expect(editor).toHaveScopesAtPosition([2, 7], ['source.php', "keyword.operator.ternary.php"]);
        expect(editor).toHaveScopesAtPosition([3, 2], ["source.php", "variable.other.php", "punctuation.definition.variable.php"]);
        expect(editor).toHaveScopesAtPosition([3, 3], ['source.php', "variable.other.php"]);
      });
    });
  });

  // SKIP these b/c this is handled by tree-sitter-php, not this grammar
  // describe("identifiers", () => {})

  it("should tokenize $this", async () => {
    editor.setPhpText("$this;");

    expect(editor).toHaveScopesAtPosition([1, 0], ["source.php", "variable.language.this.php", "punctuation.definition.variable.php"]);
    expect(editor).toHaveScopesAtPosition([1, 1], ['source.php', "variable.language.this.php"]);

    editor.setPhpText("$thistles;");
    await nextHighlightingUpdate(editor);

    expect(editor).toHaveScopesAtPosition([1, 0], ["source.php", "variable.other.php", "punctuation.definition.variable.php"]);
    expect(editor).toHaveScopesAtPosition([1, 1], ['source.php', "variable.other.php"]);
  });

  describe("include", () => {
    it("should tokenize include and require correctly", async () => {
      editor.setPhpText('include "foo.php";');

      expect(editor).toHaveScopesAtPosition([1, 0], 'include', ['source.php', "meta.include.php", "keyword.control.import.include.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], '"', ["source.php", "meta.include.php", "string.quoted.double.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.begin.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 9], 'foo.php', ['source.php', "meta.include.php", "string.quoted.double.php"]);
      expect(editor).toHaveScopesAtPosition([1, 16], '"', ["source.php", "meta.include.php", "string.quoted.double.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.end.php"
      ]);

      editor.setPhpText('require "foo.php";');
      await nextHighlightingUpdate(editor);

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.include.php", "keyword.control.import.include.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ["source.php", "meta.include.php", "string.quoted.double.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.begin.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 9], ['source.php', "meta.include.php", "string.quoted.double.php"]);
      expect(editor).toHaveScopesAtPosition([1, 16], ["source.php", "meta.include.php", "string.quoted.double.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.end.php"
      ]);
    });

    it("should tokenize include_once correctly", () => {
      editor.setPhpText('include_once "foo.php";');

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.include.php", "keyword.control.import.include.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], ["source.php", "meta.include.php", "string.quoted.double.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.begin.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 14], ['source.php', "meta.include.php", "string.quoted.double.php"]);
      expect(editor).toHaveScopesAtPosition([1, 21], ["source.php", "meta.include.php", "string.quoted.double.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.end.php"
      ]);
    });

    it("should tokenize parentheses correctly", () => {
      editor.setPhpText('include("foo.php");');

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.include.php", "keyword.control.import.include.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], ["source.php", "meta.include.php", "punctuation.definition.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ["source.php", "meta.include.php", "string.quoted.double.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.begin.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 9], ['source.php', "meta.include.php", "string.quoted.double.php"]);
      expect(editor).toHaveScopesAtPosition([1, 16], ["source.php", "meta.include.php", "string.quoted.double.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.end.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 17], ["source.php", "meta.include.php", "punctuation.definition.end.bracket.round.php"]);
    });
  });

  describe("declaring namespaces", () => {
    it("tokenizes namespaces", () => {
      editor.setPhpText("namespace Test;");

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.namespace.php", "keyword.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ['source.php', "meta.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], ['source.php', "meta.namespace.php", "entity.name.type.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 14], ['source.php', "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.namespace.php"
      ]);
    });

    it("tokenizes sub-namespaces", () => {
      editor.setPhpText("namespace One\\Two\\Three;");

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.namespace.php", "keyword.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ['source.php', "meta.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], ['source.php', "meta.namespace.php", "entity.name.type.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], ["source.php", "meta.namespace.php", "entity.name.type.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 14], ['source.php', "meta.namespace.php", "entity.name.type.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], ["source.php", "meta.namespace.php", "entity.name.type.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 18], ['source.php', "meta.namespace.php", "entity.name.type.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 23], ['source.php', "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.namespace.php"
      ]);
    });

    // SKIP this is covered by tree-sitter-php, not this grammar
    // it("tokenizes namespace with emojis", () => {})

    it("tokenizes bracketed namespaces", async () => {
      editor.setPhpText(`
          namespace Test {
              // code
          }
          `);

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.namespace.php", "keyword.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ['source.php', "meta.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], ['source.php', "meta.namespace.php", "entity.name.type.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 14], ['source.php', "meta.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 15], ["source.php", "meta.namespace.php", "punctuation.definition.namespace.begin.bracket.curly.php"]);
      expect(editor).toHaveScopesAtPosition([2, 4], ["source.php", "meta.namespace.php", "comment.line.double-slash.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.comment.php"
      ]);
      expect(editor).toHaveScopesAtPosition([3, 0], ["source.php", "meta.namespace.php", "punctuation.definition.namespace.end.bracket.curly.php"]);

      editor.setPhpText(`
        namespace One\\Two\\Three {
            // code
        }
        `);
      await nextHighlightingUpdate(editor);

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.namespace.php", "keyword.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ['source.php', "meta.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], ['source.php', "meta.namespace.php", "entity.name.type.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], ["source.php", "meta.namespace.php", "entity.name.type.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 14], ['source.php', "meta.namespace.php", "entity.name.type.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], ["source.php", "meta.namespace.php", "entity.name.type.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 18], ['source.php', "meta.namespace.php", "entity.name.type.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 23], ['source.php', "meta.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 24], ["source.php", "meta.namespace.php", "punctuation.definition.namespace.begin.bracket.curly.php"]);
      expect(editor).toHaveScopesAtPosition([3, 0], ["source.php", "meta.namespace.php", "punctuation.definition.namespace.end.bracket.curly.php"]);
    });

    it("tokenizes global namespaces", () => {
      editor.setPhpText(`
        namespace {
            // code
        }
        `);

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.namespace.php", "keyword.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ['source.php', "meta.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], ["source.php", "meta.namespace.php", "punctuation.definition.namespace.begin.bracket.curly.php"]);
      expect(editor).toHaveScopesAtPosition([3, 0], ["source.php", "meta.namespace.php", "punctuation.definition.namespace.end.bracket.curly.php"]);
    });
  });

  describe("use declarations", () => {
    it("tokenizes basic use statements", async () => {
      editor.setPhpText("use ArrayObject;");

      expect(editor).toHaveScopesAtPosition([1, 0], 'use', ['source.php', "meta.use.php", "keyword.other.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 3], " ", ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], 'ArrayObject', ["source.php", "meta.use.php", "support.class.builtin.php"]);
      expect(editor).toHaveScopesAtPosition([1, 15], ';', ['source.php', "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.use.php"
      ]);

      editor.setPhpText("use My\\Full\\NSname;");
      await nextHighlightingUpdate(editor);

      expect(editor).toHaveScopesAtPosition([1, 0], 'use', ['source.php', "meta.use.php", "keyword.other.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], 'My', ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], '\\', ["source.php", "meta.use.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 7], 'Full', ['source.php', "meta.use.php", "support.other.namespace.php"]);
        expect(editor).toHaveScopesAtPosition([1, 11], '\\', ["source.php", "meta.use.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 12], 'NSname', ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], ';', ['source.php', "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.use.php"
      ]);
    });

    // SKIP this is covered by TS-php, not this grammar
    // it("tokenizes use statement with emojis", () => {})

    it("tokenizes multiline use statements", () => {
      editor.setPhpText(`
        use One\\Two,
            Three\\Four;
        `);

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.use.php", "keyword.other.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], 'One', ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], '\\', ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 8], 'Two', ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], ',', ['source.php', "meta.use.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([2, 4], 'Three', ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([2, 9], '\\', ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([2, 10], 'Four', ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([2, 14], ';', ['source.php', "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.use.php"
      ]);
    });

    it("tokenizes use function statements", () => {
      editor.setPhpText("use function My\\Full\\functionName;");

      expect(editor).toHaveScopesAtPosition([1, 0], 'use',      ['source.php', "meta.use.php", "keyword.other.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], 'function', ['source.php', "meta.use.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], ' ',    ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], 'My', ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 15], '\\', ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 16], 'Full', ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 20], '\\', ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 21], 'functionName', ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 33], ';', ['source.php', "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.use.php"
      ]);
    });

    it("tokenizes use const statements", () => {
      editor.setPhpText("use const My\\Full\\CONSTANT;");

      expect(editor).toHaveScopesAtPosition([1, 0], 'use',   ['source.php', "meta.use.php", "keyword.other.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], 'const', ['source.php', "meta.use.php", "storage.type.const.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ' ',     ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], 'My',   ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], '\\',   ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 13], 'Full', ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], '\\',   ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 18], 'CONSTANT', ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 26], ';', ['source.php', "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.use.php"
      ]);
    });

    it("tokenizes use-as statements", () => {
      editor.setPhpText("use My\\Full\\Classname as Another;");

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.use.php", "keyword.other.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 7], ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 12], ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 21], ' ', ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 22], 'as', ['source.php', "meta.use.php", "keyword.other.use-as.php"]);
      expect(editor).toHaveScopesAtPosition([1, 24], ' ', ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 25], 'Another', ['source.php', "meta.use.php", "entity.other.alias.php"]);
      expect(editor).toHaveScopesAtPosition([1, 32], ';', ['source.php', "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.use.php"
      ]);
    });

    it("should tokenize use function as correctly", () => {
      editor.setPhpText("use function A\\B\\fun as func;");

      expect(editor).toHaveScopesAtPosition([1, 0], 'use', ['source.php', "meta.use.php", "keyword.other.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], 'fun', ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 20], ' ', ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 21], 'as', ['source.php', "meta.use.php", "keyword.other.use-as.php"]);
      expect(editor).toHaveScopesAtPosition([1, 23], ' ', ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 24], 'func', ['source.php', "meta.use.php", "entity.other.alias.php"]);
    });

    it("tokenizes multiple combined use statements", () => {
      editor.setPhpText(
        "use My\\Full\\Classname as Another, My\\Full\\NSname;"
      );

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.use.php", "keyword.other.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 7], ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 12], ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 21], ' ', ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 22], 'as', ['source.php', "meta.use.php", "keyword.other.use-as.php"]);
      expect(editor).toHaveScopesAtPosition([1, 24], ' ', ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 25], 'Another', ['source.php', "meta.use.php", "entity.other.alias.php"]);
      expect(editor).toHaveScopesAtPosition([1, 32], ',', ['source.php', "meta.use.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 33], ' ', ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 34], 'My', ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 36], '\\', ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 37], 'Full', ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 41], '\\', ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 42], 'NSname', ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 48], ['source.php', "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.use.php"
      ]);
    });

    it("tokenizes grouped use statements", () => {
      editor.setPhpText(`
        use some\\Namespace\\{
          ClassA,
          ClassB,
          ClassC as C
        };
        `);

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.use.php", "keyword.other.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ["source.php", "meta.use.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 9], ['source.php', "meta.use.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], ["source.php", "meta.use.php",
          // FIXME following scopes differ from TM
          // "support.other.namespace.php",
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 19], '{', ["source.php", "meta.use.php", "punctuation.definition.use.begin.bracket.curly.php"]);
      expect(editor).toHaveScopesAtPosition([2, 2], ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([2, 8], ['source.php', "meta.use.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([3, 2], ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([3, 8], ['source.php', "meta.use.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([4, 2], ['source.php', "meta.use.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([4, 8], ' ', ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([4, 9], 'as', ['source.php', "meta.use.php", "keyword.other.use-as.php"]);
      expect(editor).toHaveScopesAtPosition([4, 11], ' ', ['source.php', "meta.use.php"]);
      expect(editor).toHaveScopesAtPosition([4, 12], 'C', ['source.php', "meta.use.php", "entity.other.alias.php"]);
      expect(editor).toHaveScopesAtPosition([5, 0], '}', ["source.php", "meta.use.php", "punctuation.definition.use.end.bracket.curly.php"]);
      expect(editor).toHaveScopesAtPosition([5, 1], ['source.php', "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.use.php"
      ]);
    });

    // SKIP this is covered by tree-sitter-php, not this grammar
    // it("tokenizes trailing comma in use statements", () => {});
  });

  describe("classes", () => {
    it("tokenizes class declarations", () => {
      editor.setPhpText("class Test { /* stuff */ }");

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.class.php", "storage.type.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], ['source.php', "meta.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "meta.class.php", "entity.name.type.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], ['source.php', "meta.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], ["source.php", "meta.class.php",
        // FIXME following scopes differ from TM
        "meta.class.body.php",
        "punctuation.definition.class.begin.bracket.curly.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 12], ['source.php', "meta.class.php", "meta.class.body.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], '/*', ["source.php", "meta.class.php", "meta.class.body.php", "comment.block.php",
        // FIXME following scopes differ from TM
        // "punctuation.definition.comment.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 25], ["source.php", "meta.class.php",
        // FIXME following scopes differ from TM
        "meta.class.body.php",
        "punctuation.definition.class.end.bracket.curly.php"
      ]);
    });

    it("tokenizes class instantiation", () => {
      editor.setPhpText("$a = new ClassName();");

      expect(editor).toHaveScopesAtPosition([1, 5], 'new', ['source.php', "keyword.other.new.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ' ', ['source.php']);
      expect(editor).toHaveScopesAtPosition([1, 9], 'ClassName', ['source.php', "support.class.php"]);
      // FIXME I wonder if punctuation.definition.arguments.begin.bracket.round.php
      // would be more correct: these are surrounding arguments to a new instance
      expect(editor).toHaveScopesAtPosition([1, 18], '(', ['source.php', "punctuation.definition.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], ')', ['source.php', "punctuation.definition.end.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 20], ';', ['source.php', "punctuation.terminator.expression.php"]);
    });

    it("tokenizes class modifiers", async () => {
      editor.setPhpText("abstract class Test {}");

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.class.php", "storage.modifier.abstract.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ['source.php', "meta.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ['source.php', "meta.class.php", "storage.type.class.php"]);

      editor.setPhpText("final class Test {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "meta.class.php", "storage.modifier.final.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], ['source.php', "meta.class.php", "storage.type.class.php"]);
    });

    // SKIP TS-php handles this
    // it('tokenizes classes declared immediately after another class ends', () => {})

    describe("properties", () => {
      it("tokenizes types", () => {
        editor.setPhpText(`
          class A {
            public int $a = 1;
          }
          `);

        expect(editor).toHaveScopesAtPosition([2, 2], 'public', ["source.php", "meta.class.php", "meta.class.body.php", "storage.modifier.php"]);
        expect(editor).toHaveScopesAtPosition([2, 9], 'int', ["source.php", "meta.class.php", "meta.class.body.php", "keyword.other.type.php"]);
        expect(editor).toHaveScopesAtPosition([2, 13], '$', ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php", "punctuation.definition.variable.php"]);
        expect(editor).toHaveScopesAtPosition([2, 14], 'a', ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php"]);
      });

      it("tokenizes nullable types", async () => {
        editor.setPhpText(`
          class A {
            static ?string $b = 'Bee';
          }
          `)

        expect(editor).toHaveScopesAtPosition([2, 2], 'static',  ["source.php", "meta.class.php", "meta.class.body.php", "storage.modifier.php"])
        expect(editor).toHaveScopesAtPosition([2, 9], '?',       ["source.php", "meta.class.php", "meta.class.body.php", "keyword.operator.nullable-type.php"])
        expect(editor).toHaveScopesAtPosition([2, 10], 'string', ["source.php", "meta.class.php", "meta.class.body.php", "keyword.other.type.php"])
        expect(editor).toHaveScopesAtPosition([2, 17], '$',      ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php", "punctuation.definition.variable.php"])
        expect(editor).toHaveScopesAtPosition([2, 18], 'b',      ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php"])

        editor.setPhpText(`
          class A {
            static? string $b;
          }
          `)
        await nextHighlightingUpdate(editor)

        expect(editor).toHaveScopesAtPosition([2, 2], 'static',  ["source.php", "meta.class.php", "meta.class.body.php", "storage.modifier.php"])
        expect(editor).toHaveScopesAtPosition([2, 8], '?',       ["source.php", "meta.class.php", "meta.class.body.php", "keyword.operator.nullable-type.php"])
        expect(editor).toHaveScopesAtPosition([2, 10], 'string', ["source.php", "meta.class.php", "meta.class.body.php", "keyword.other.type.php"])

      })

      it("tokenizes union types", () => {
        editor.setPhpText(`
          class A {
            public int|string $id;
          }
          `)

        expect(editor).toHaveScopesAtPosition([2, 2], 'public',  ['source.php', 'meta.class.php', 'meta.class.body.php', 'storage.modifier.php'])
        expect(editor).toHaveScopesAtPosition([2, 9], 'int',     ['source.php', 'meta.class.php', 'meta.class.body.php', 'keyword.other.type.php'])
        expect(editor).toHaveScopesAtPosition([2, 12], '|',      ['source.php', 'meta.class.php', 'meta.class.body.php', 'punctuation.separator.delimiter.php'])
        expect(editor).toHaveScopesAtPosition([2, 13], 'string', ['source.php', 'meta.class.php', 'meta.class.body.php', 'keyword.other.type.php'])
        expect(editor).toHaveScopesAtPosition([2, 20], '$',      ['source.php', 'meta.class.php', 'meta.class.body.php', 'variable.other.php', 'punctuation.definition.variable.php'])
        expect(editor).toHaveScopesAtPosition([2, 21], 'id',     ['source.php', 'meta.class.php', 'meta.class.body.php', 'variable.other.php'])

      })

      // FIXME TS-php doesn't support intersection types yet
      xit("tokenizes intersection types", () => {
        editor.setPhpText(`
          class A {
            public FooInterface & BarInterface $foobar;
          }
          `)

        expect(editor).toHaveScopesAtPosition([2, 2], 'public',        ['source.php', 'meta.class.php', 'meta.class.body.php', 'storage.modifier.php'])
        expect(editor).toHaveScopesAtPosition([2, 9], 'FooInterface',  ['source.php', 'meta.class.php', 'meta.class.body.php', 'support.class.php'])
        expect(editor).toHaveScopesAtPosition([2, 22], '&',            ['source.php', 'meta.class.php', 'meta.class.body.php', 'punctuation.separator.delimiter.php'])
        expect(editor).toHaveScopesAtPosition([2, 24], 'BarInterface', ['source.php', 'meta.class.php', 'meta.class.body.php', 'support.class.php'])
        expect(editor).toHaveScopesAtPosition([2, 37], '$',            ['source.php', 'meta.class.php', 'meta.class.body.php', 'variable.other.php', 'punctuation.definition.variable.php'])
        expect(editor).toHaveScopesAtPosition([2, 38], 'foobar',       ['source.php', 'meta.class.php', 'meta.class.body.php', 'variable.other.php'])

      })

      it("tokenizes 2 modifiers correctly", () => {
        editor.setPhpText(`
          class Foo {
            public static $bar = 'baz';
          }
          `);

        expect(editor).toHaveScopesAtPosition([2, 2], 'public', ["source.php", "meta.class.php", "meta.class.body.php", "storage.modifier.php"]);
        expect(editor).toHaveScopesAtPosition([2, 9], 'static', ["source.php", "meta.class.php", "meta.class.body.php", "storage.modifier.php"]);
        expect(editor).toHaveScopesAtPosition([2, 16], '$', ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php", "punctuation.definition.variable.php"]);
        expect(editor).toHaveScopesAtPosition([2, 17], 'bar', ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php"]);
      });

      it('tokenizes namespaces', () => {
        editor.setPhpText(`
          class A {
            public ?\\Space\\Test $c;
          }
          `)

        expect(editor).toHaveScopesAtPosition([2, 2], 'public', ["source.php", "meta.class.php", "meta.class.body.php", "storage.modifier.php"])
        expect(editor).toHaveScopesAtPosition([2, 9], '?',      ["source.php", "meta.class.php", "meta.class.body.php", "keyword.operator.nullable-type.php"])
        expect(editor).toHaveScopesAtPosition([2, 10], '\\',    ["source.php", "meta.class.php", "meta.class.body.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
        ])
        expect(editor).toHaveScopesAtPosition([2, 11], 'Space', ["source.php", "meta.class.php", "meta.class.body.php", "support.other.namespace.php"])
          expect(editor).toHaveScopesAtPosition([2, 16], '\\',    ["source.php", "meta.class.php", "meta.class.body.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
        ])
        expect(editor).toHaveScopesAtPosition([2, 17], 'Test',  ["source.php", "meta.class.php", "meta.class.body.php", "support.class.php"])
        expect(editor).toHaveScopesAtPosition([2, 22], '$',     ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php", "punctuation.definition.variable.php"])
        expect(editor).toHaveScopesAtPosition([2, 23], 'c',     ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php"])

      });

      it("tokenizes multiple properties", () => {
        editor.setPhpText(`
          class A {
            static int $a = 1;
            public \\Other\\Type $b;
            private static ? array $c1, $c2;
          }
          `);

        expect(editor).toHaveScopesAtPosition([2, 2], 'static', ["source.php", "meta.class.php", "meta.class.body.php", "storage.modifier.php"])
        expect(editor).toHaveScopesAtPosition([2, 9], 'int',    ["source.php", "meta.class.php", "meta.class.body.php", "keyword.other.type.php"])
        expect(editor).toHaveScopesAtPosition([2, 13], '$',     ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php", "punctuation.definition.variable.php"])
        expect(editor).toHaveScopesAtPosition([2, 14], 'a',     ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php"])

        expect(editor).toHaveScopesAtPosition([3, 2], 'public', ["source.php", "meta.class.php", "meta.class.body.php", "storage.modifier.php"])
        expect(editor).toHaveScopesAtPosition([3, 9], '\\',     ["source.php", "meta.class.php", "meta.class.body.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
        ])
        expect(editor).toHaveScopesAtPosition([3, 10], 'Other', ["source.php", "meta.class.php", "meta.class.body.php", "support.other.namespace.php"])
        expect(editor).toHaveScopesAtPosition([3, 15], '\\',    ["source.php", "meta.class.php", "meta.class.body.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
        ])
        expect(editor).toHaveScopesAtPosition([3, 16], 'Type',  ["source.php", "meta.class.php", "meta.class.body.php", "support.class.php"])
        expect(editor).toHaveScopesAtPosition([3, 21], '$',     ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php", "punctuation.definition.variable.php"])
        expect(editor).toHaveScopesAtPosition([3, 22], 'b',     ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php"])

        expect(editor).toHaveScopesAtPosition([4, 2], 'private', ["source.php", "meta.class.php", "meta.class.body.php", "storage.modifier.php"]);
        expect(editor).toHaveScopesAtPosition([4, 10], 'static', ["source.php", "meta.class.php", "meta.class.body.php", "storage.modifier.php"]);
        expect(editor).toHaveScopesAtPosition([4, 17], '?',      ["source.php", "meta.class.php", "meta.class.body.php", "keyword.operator.nullable-type.php"])
        expect(editor).toHaveScopesAtPosition([4, 19], 'array',  ["source.php", "meta.class.php", "meta.class.body.php", "keyword.other.type.php"])
        expect(editor).toHaveScopesAtPosition([4, 25], '$',      ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php", "punctuation.definition.variable.php"]);
        expect(editor).toHaveScopesAtPosition([4, 26], 'c1',     ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php"]);
        expect(editor).toHaveScopesAtPosition([4, 30], '$',      ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php", "punctuation.definition.variable.php"]);
        expect(editor).toHaveScopesAtPosition([4, 31], 'c2',     ["source.php", "meta.class.php", "meta.class.body.php", "variable.other.php"]);
      });
    });

    describe("methods", () => {
      it("tokenizes basic method", () => {
        editor.setPhpText(`
          class Test {
            public function Run($a, $b = false){}
          }
          `);

        expect(editor).toHaveScopesAtPosition([2, 2], 'public',   ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "storage.modifier.php"]);
        expect(editor).toHaveScopesAtPosition([2, 9], 'function', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "storage.type.function.php"]);
        expect(editor).toHaveScopesAtPosition([2, 18], 'Run',     ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "entity.name.function.php"]);
        expect(editor).toHaveScopesAtPosition([2, 21], '(',       ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
            // FIXME following scopes differ from TM
            "meta.function.parameters.php",
        ]);
        expect(editor).toHaveScopesAtPosition([2, 22], '$', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php"]);
        expect(editor).toHaveScopesAtPosition([2, 23], 'a', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php"]);
        expect(editor).toHaveScopesAtPosition([2, 24], ',', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "punctuation.separator.delimiter.php"]);
        expect(editor).toHaveScopesAtPosition([2, 26], '$', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "variable.other.php", "punctuation.definition.variable.php"]);
        expect(editor).toHaveScopesAtPosition([2, 27], 'b', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "variable.other.php"]);
        expect(editor).toHaveScopesAtPosition([2, 29], '=', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "keyword.operator.assignment.php"]);
        expect(editor).toHaveScopesAtPosition([2, 31], 'false', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "constant.language.php"]);
      });

      it("tokenizes typehinted method", () => {
        editor.setPhpText(`
          class Test {
            public function Run(int $a, ? ClassB $b, self | bool $c = false) : float | ClassA {}
          }
          `);

        // FIXME following scopes differ from TM
        // this grammar doesn't support "meta.function.parameter.typehinted.php"
        // b/c limitations in how Atom TS selectors work. In all of these
        // expectations, anything w/ a scope of "meta.function.parameters.php"
        // whould have "meta.function.parameter.typehinted.php" in the TM
        // grammar, but has either "meta.function.parameter.no-default.php" or
        // ... "default" in this grammar
        expect(editor).toHaveScopesAtPosition([2, 22], 'int',    ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "keyword.other.type.php", "meta.function.parameter.no-default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 26], '$',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "variable.other.php", "punctuation.definition.variable.php", "meta.function.parameter.no-default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 27], 'a',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "variable.other.php", "meta.function.parameter.no-default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 30], '?',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "keyword.operator.nullable-type.php", "meta.function.parameter.no-default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 32], 'ClassB', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "support.class.php", "meta.function.parameter.no-default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 39], '$',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "variable.other.php", "punctuation.definition.variable.php", "meta.function.parameter.no-default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 40], 'b',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "variable.other.php", "meta.function.parameter.no-default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 43], 'self',   ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "storage.type.php", "meta.function.parameter.default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 48], '|',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "punctuation.separator.delimiter.php", "meta.function.parameter.default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 50], 'bool',   ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "keyword.other.type.php", "meta.function.parameter.default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 55], '$',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "variable.other.php", "punctuation.definition.variable.php", "meta.function.parameter.default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 56], 'c',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "variable.other.php", "meta.function.parameter.default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 58], '=',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "keyword.operator.assignment.php", "meta.function.parameter.default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 60], 'false',  ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "meta.function.parameters.php", "constant.language.php", "meta.function.parameter.default.php"]);
        expect(editor).toHaveScopesAtPosition([2, 67], ':',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "keyword.operator.return-value.php"]);
        expect(editor).toHaveScopesAtPosition([2, 69], 'float',  ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "keyword.other.type.php"]);
        expect(editor).toHaveScopesAtPosition([2, 75], '|',      ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "punctuation.separator.delimiter.php"]);
        expect(editor).toHaveScopesAtPosition([2, 77], 'ClassA', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "support.class.php"]);
      });

      it("tokenizes static return type", () => {
        editor.setPhpText(`
          class Test {
            public function Me() :static {}
          }
          `);

        expect(editor).toHaveScopesAtPosition([2, 23], ':', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "keyword.operator.return-value.php"]);
        expect(editor).toHaveScopesAtPosition([2, 24], 'static', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "storage.type.php"]);
      });

      it('tokenizes basic promoted properties in constructor', () => {
        editor.setPhpText(`
          class Test {
            public function __construct(public $a, public int $b = 1) {}
          }
          `)

        expect(editor).toHaveScopesAtPosition([2, 22], '__construct', ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'support.function.constructor.php'])
        expect(editor).toHaveScopesAtPosition([2, 30], 'public',      ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'storage.modifier.php'])
        expect(editor).toHaveScopesAtPosition([2, 37], '$',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'variable.other.php', 'punctuation.definition.variable.php'])
        expect(editor).toHaveScopesAtPosition([2, 38], 'a',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'variable.other.php'])
        expect(editor).toHaveScopesAtPosition([2, 41], 'public',      ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'storage.modifier.php'])
        expect(editor).toHaveScopesAtPosition([2, 48], 'int',         ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'keyword.other.type.php'])
        expect(editor).toHaveScopesAtPosition([2, 52], '$',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'variable.other.php', 'punctuation.definition.variable.php'])
        expect(editor).toHaveScopesAtPosition([2, 53], 'b',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'variable.other.php'])
        expect(editor).toHaveScopesAtPosition([2, 55], '=',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'keyword.operator.assignment.php'])
        expect(editor).toHaveScopesAtPosition([2, 57], '1',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'constant.numeric.decimal.php'])
      })

      it('tokenizes promoted properties with parameters in constructor', () => {
        editor.setPhpText(`
          class Test {
            public function __construct(public bool $a, string $b) {}
          }
          `)

        expect(editor).toHaveScopesAtPosition([2, 22], '__construct', ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'support.function.constructor.php'])
        expect(editor).toHaveScopesAtPosition([2, 30], 'public',      ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'storage.modifier.php'])
        expect(editor).toHaveScopesAtPosition([2, 37], 'bool',        ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'keyword.other.type.php'])
        expect(editor).toHaveScopesAtPosition([2, 42], '$',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'variable.other.php', 'punctuation.definition.variable.php'])
        expect(editor).toHaveScopesAtPosition([2, 43], 'a',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'variable.other.php'])
        expect(editor).toHaveScopesAtPosition([2, 46], 'string',      ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'keyword.other.type.php',
          // FIXME following scopes differ from TM
          // 'meta.function.parameter.typehinted.php',
          'meta.function.parameter.no-default.php'
        ])
        expect(editor).toHaveScopesAtPosition([2, 53], '$',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'variable.other.php', 'punctuation.definition.variable.php',
          // FIXME following scopes differ from TM
          // 'meta.function.parameter.typehinted.php',
          'meta.function.parameter.no-default.php'
        ])
        expect(editor).toHaveScopesAtPosition([2, 54], 'b',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'variable.other.php',
          // FIXME following scopes differ from TM
          // 'meta.function.parameter.typehinted.php',
          'meta.function.parameter.no-default.php'
        ])
      })

      // FIXME TS-php doesn't support readonly properties yet
      xit('tokenizes readonly promoted properties', () => {
        editor.setPhpText(`
          class Test {
            public function __construct(public readonly int $a, readonly protected? string $b) {}
          }
          `)

        expect(editor).toHaveScopesAtPosition([2, 22], '__construct', ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'support.function.constructor.php'])
        expect(editor).toHaveScopesAtPosition([2, 30], 'public',      ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'storage.modifier.php'])
        expect(editor).toHaveScopesAtPosition([2, 37], 'readonly',    ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'storage.modifier.php'])
        expect(editor).toHaveScopesAtPosition([2, 46], 'int',         ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'keyword.other.type.php'])
        expect(editor).toHaveScopesAtPosition([2, 50], '$',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'variable.other.php', 'punctuation.definition.variable.php'])
        expect(editor).toHaveScopesAtPosition([2, 51], 'a',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'variable.other.php'])
        expect(editor).toHaveScopesAtPosition([2, 54], 'readonly',    ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'storage.modifier.php'])
        expect(editor).toHaveScopesAtPosition([2, 63], 'protected',   ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'storage.modifier.php'])
        expect(editor).toHaveScopesAtPosition([2, 72], '?',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'keyword.operator.nullable-type.php'])
        expect(editor).toHaveScopesAtPosition([2, 74], 'string',      ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'keyword.other.type.php'])
        expect(editor).toHaveScopesAtPosition([2, 81], '$',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'variable.other.php', 'punctuation.definition.variable.php'])
        expect(editor).toHaveScopesAtPosition([2, 82], 'b',           ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.promoted-property.php', 'variable.other.php'])
      })

      // FIXME Uhhh ... to accomplish this we would have to recognize
      // method_declarations w/ a name of "__construct" that also
      // have a return_type of primitive_type. Either of these is easy, but both
      // of them together *may* be impossible w/ Atom's current TS selector API
      xit("tokenizes constructor with illegal return type declaration", () => {
        editor.setPhpText(`
          class Test {
            public function __construct() : int {}
          }
          `);

        expect(editor).toHaveScopesAtPosition([2, 18], '__construct', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "support.function.constructor.php"]);
        expect(editor).toHaveScopesAtPosition([2, 32], ':', ["source.php", "meta.class.php", "meta.class.body.php", "meta.function.php", "invalid.illegal.return-type.php"]);
      });
    });

    describe("use statements", () => {
      it("tokenizes basic use statements", async () => {
        editor.setPhpText(`
          class Test {
            use A;
          }
          `);

        expect(editor).toHaveScopesAtPosition([2, 2], 'use', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.other.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 5], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 6], 'A', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([2, 7], ';', ["source.php", "meta.class.php", "meta.class.body.php", "punctuation.terminator.expression.php",
          // FIXME following scopes differ from TM
          "meta.use.php"
        ]);

        editor.setPhpText(`
          class Test {
            use A, B;
          }
          `);
        await nextHighlightingUpdate(editor)

        expect(editor).toHaveScopesAtPosition([2, 2], 'use', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.other.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 5], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 6], 'A', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([2, 7], ',', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "punctuation.separator.delimiter.php"]);
        expect(editor).toHaveScopesAtPosition([2, 8], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 9], 'B', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([2, 10], ';', ["source.php", "meta.class.php", "meta.class.body.php", "punctuation.terminator.expression.php",
          // FIXME following scopes differ from TM
          "meta.use.php"
        ]);

        editor.setPhpText(`
          class Test {
            use A\\B;
          }
          `);
        await nextHighlightingUpdate(editor)

        expect(editor).toHaveScopesAtPosition([2, 2], 'use', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.other.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 5], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 6], 'A', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.other.namespace.php"]);
        expect(editor).toHaveScopesAtPosition([2, 7], '\\', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.other.namespace.php",
            // FIXME following scopes differ from TM
            // "punctuation.separator.inheritance.php"
        ]);
        expect(editor).toHaveScopesAtPosition([2, 8], 'B', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([2, 9], ';', ["source.php", "meta.class.php", "meta.class.body.php", "punctuation.terminator.expression.php",
          // FIXME following scopes differ from TM
          "meta.use.php"
        ]);
      });

      it("tokenizes multiline use statements", () => {
        editor.setPhpText(`
          class Test {
            use One\\Two,
                Three\\Four;
          }
          `);

        expect(editor).toHaveScopesAtPosition([2, 2], 'use', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.other.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 6], 'One', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.other.namespace.php"]);
        expect(editor).toHaveScopesAtPosition([2, 9], '\\', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.other.namespace.php",
            // FIXME following scopes differ from TM
            // "punctuation.separator.inheritance.php"
        ]);
        expect(editor).toHaveScopesAtPosition([2, 10], 'Two', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([2, 13], ',', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "punctuation.separator.delimiter.php"]);
        expect(editor).toHaveScopesAtPosition([3, 6], 'Three', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.other.namespace.php"]);
        expect(editor).toHaveScopesAtPosition([3, 11], '\\', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.other.namespace.php",
            // FIXME following scopes differ from TM
            // "punctuation.separator.inheritance.php"
        ]);
        expect(editor).toHaveScopesAtPosition([3, 12], 'Four', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([3, 16], ';', ["source.php", "meta.class.php", "meta.class.body.php", "punctuation.terminator.expression.php",
          // FIXME following scopes differ from TM
          "meta.use.php"
        ]);
      });

      it("tokenizes complex use statements", () => {
        editor.setPhpText(`
          class Test {
            use A, B {
              B::smallTalk insteadof A;
            }
            /* comment */
          }
          `);

        expect(editor).toHaveScopesAtPosition([2, 2], 'use', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.other.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 5], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 6], 'A', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([2, 7], ',', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "punctuation.separator.delimiter.php"]);
        expect(editor).toHaveScopesAtPosition([2, 8], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 9], 'B', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([2, 10], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([2, 11], '{', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "punctuation.definition.use.begin.bracket.curly.php"]);

        expect(editor).toHaveScopesAtPosition([3, 4], 'B', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([3, 5], '::', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.operator.class.php"]);
        expect(editor).toHaveScopesAtPosition([3, 7], 'smallTalk', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "constant.other.class.php"]);
        expect(editor).toHaveScopesAtPosition([3, 16], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([3, 17], 'insteadof', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.other.use-insteadof.php"]);
        expect(editor).toHaveScopesAtPosition([3, 26], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([3, 27], 'A', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([3, 28], ';', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "punctuation.terminator.expression.php"]);

        expect(editor).toHaveScopesAtPosition([4, 2], '}', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "punctuation.definition.use.end.bracket.curly.php"]);
        expect(editor).toHaveScopesAtPosition([5, 2], '/*', ["source.php", "meta.class.php", "meta.class.body.php", "comment.block.php",
            // FIXME following scopes differ from TM
            // "punctuation.definition.comment.php"
        ]);
      });

      it("tokenizes aliases", () => {
        editor.setPhpText(`
          class Aliased_Talker {
              use A, B {
                  B::smallTalk as private talk;
              }
          }
          `);

        expect(editor).toHaveScopesAtPosition([2, 11], 'B', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);

        expect(editor).toHaveScopesAtPosition([3, 9], '::', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.operator.class.php"]);
        expect(editor).toHaveScopesAtPosition([3, 11], 'smallTalk', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "constant.other.class.php"]);
        expect(editor).toHaveScopesAtPosition([3, 20], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([3, 21], 'as', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.other.use-as.php"]);
        expect(editor).toHaveScopesAtPosition([3, 23], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([3, 24], 'private', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "storage.modifier.php"]);
        expect(editor).toHaveScopesAtPosition([3, 31], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([3, 32], 'talk', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "entity.other.alias.php"]);
        expect(editor).toHaveScopesAtPosition([3, 36], ';', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "punctuation.terminator.expression.php"]);

        expect(editor).toHaveScopesAtPosition([4, 4], '}', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "punctuation.definition.use.end.bracket.curly.php"]);
      });

      it("tokenizes aliases", () => {
        editor.setPhpText(`
          class Aliased_Talker {
              use A, B {
                  B::smallTalk as talk;
              }
          }
          `);

        expect(editor).toHaveScopesAtPosition([3, 8], 'B', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "support.class.php"]);
        expect(editor).toHaveScopesAtPosition([3, 9], '::', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.operator.class.php"]);
        expect(editor).toHaveScopesAtPosition([3, 11], 'smallTalk', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "constant.other.class.php"]);
        expect(editor).toHaveScopesAtPosition([3, 20], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([3, 21], 'as', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "keyword.other.use-as.php"]);
        expect(editor).toHaveScopesAtPosition([3, 23], ' ', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php"]);
        expect(editor).toHaveScopesAtPosition([3, 27], 'talk', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "entity.other.alias.php"]);
        expect(editor).toHaveScopesAtPosition([3, 31], ';', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "punctuation.terminator.expression.php"]);

        expect(editor).toHaveScopesAtPosition([4, 4], '}', ["source.php", "meta.class.php", "meta.class.body.php", "meta.use.php", "punctuation.definition.use.end.bracket.curly.php"]);
      });
    });

    describe("anonymous", () => {
      it("tokenizes anonymous class declarations", () => {
        editor.setPhpText("$a = new class{ /* stuff */ };");

        expect(editor).toHaveScopesAtPosition([1, 5], 'new', ['source.php', "meta.class.php", "keyword.other.new.php"]);
        expect(editor).toHaveScopesAtPosition([1, 8], ' ', ['source.php', "meta.class.php"]);
        expect(editor).toHaveScopesAtPosition([1, 9], 'class', ['source.php', "meta.class.php", "storage.type.class.php"]);
        expect(editor).toHaveScopesAtPosition([1, 14], '{', ["source.php", "meta.class.php", "punctuation.definition.class.begin.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.class.body.php"
        ]);
        expect(editor).toHaveScopesAtPosition([1, 15], ' ', ['source.php', "meta.class.php", "meta.class.body.php"]);
        expect(editor).toHaveScopesAtPosition([1, 16], '/*', ["source.php", "meta.class.php", "meta.class.body.php", "comment.block.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.comment.php"
        ]);
        expect(editor).toHaveScopesAtPosition([1, 19], 'stuff', ["source.php", "meta.class.php", "meta.class.body.php", "comment.block.php"]);
        expect(editor).toHaveScopesAtPosition([1, 25], '*/', ["source.php", "meta.class.php", "meta.class.body.php", "comment.block.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.comment.php"
        ]);
        expect(editor).toHaveScopesAtPosition([1, 27], ' ', ['source.php', "meta.class.php", "meta.class.body.php"]);
        expect(editor).toHaveScopesAtPosition([1, 28], '}', ["source.php", "meta.class.php", "punctuation.definition.class.end.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.class.body.php"
        ]);
        expect(editor).toHaveScopesAtPosition([1, 29], ';', ['source.php', "punctuation.terminator.expression.php"]);
      });

      it("tokenizes inheritance correctly", () => {
        editor.setPhpText(
          "$a = new class extends Test implements ITest { /* stuff */ };"
        );

        expect(editor).toHaveScopesAtPosition([1, 5], 'new', ['source.php', "meta.class.php", "keyword.other.new.php"]);
        expect(editor).toHaveScopesAtPosition([1, 9], 'class', ['source.php', "meta.class.php", "storage.type.class.php"]);
        expect(editor).toHaveScopesAtPosition([1, 15], 'extends', ['source.php', "meta.class.php", "storage.modifier.extends.php"]);
        expect(editor).toHaveScopesAtPosition([1, 23], 'Test', ["source.php", "meta.class.php", "entity.other.inherited-class.php",
          // FIXME following scopes differ from TM
          // "meta.other.inherited-class.php"
        ]);
        expect(editor).toHaveScopesAtPosition([1, 28], 'implements', ['source.php', "meta.class.php", "storage.modifier.implements.php"]);
        expect(editor).toHaveScopesAtPosition([1, 39], 'ITest', ["source.php", "meta.class.php",
          // FIXME following scopes differ from TM
          'entity.name.type.interface.php'
          // "meta.other.inherited-class.php",
          // "entity.other.inherited-class.php"
        ]);
      });
    });
  });

  describe("interfaces", () => {
    it("should tokenize multiple inherited interfaces correctly", () => {
      editor.setPhpText("interface Superman extends Bird, Plane {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'interface', ['source.php', "meta.interface.php", "storage.type.interface.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ' ', ['source.php', "meta.interface.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], 'Superman', ['source.php', "meta.interface.php", "entity.name.type.interface.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], ' ', ['source.php', "meta.interface.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], 'extends', ['source.php', "meta.interface.php", "storage.modifier.extends.php"]);
      expect(editor).toHaveScopesAtPosition([1, 26], ' ', ['source.php', "meta.interface.php"]);
      expect(editor).toHaveScopesAtPosition([1, 27], 'Bird', ["source.php", "meta.interface.php", "entity.other.inherited-class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 31], ',', ["source.php", "meta.interface.php", "punctuation.separator.classes.php"]);
      expect(editor).toHaveScopesAtPosition([1, 32], ' ', ['source.php', "meta.interface.php"]);
      expect(editor).toHaveScopesAtPosition([1, 33], 'Plane', ["source.php", "meta.interface.php", "entity.other.inherited-class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 38], ' ', ['source.php', "meta.interface.php"]);
      expect(editor).toHaveScopesAtPosition([1, 39], '{', ["source.php", "punctuation.definition.begin.bracket.curly.php",
        // FIXME following scopes differ from TM
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 40], '}', ["source.php", "punctuation.definition.end.bracket.curly.php",
        // FIXME following scopes differ from TM
        "meta.interface.php"
      ]);
    });

    it("should tokenize methods in interface correctly", () => {
      editor.setPhpText(`
        interface Test {
          public function testMethod();
          public function __toString();
        }
        `);

      expect(editor).toHaveScopesAtPosition([1, 0], 'interface', ['source.php', "meta.interface.php", "storage.type.interface.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], 'Test', ['source.php', "meta.interface.php", "entity.name.type.interface.php"]);
      expect(editor).toHaveScopesAtPosition([1, 15], '{', ["source.php", "punctuation.definition.begin.bracket.curly.php",
        // FIXME following scopes differ from TM
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([2, 2], 'public', ["source.php", "meta.function.php", "storage.modifier.php",
        // FIXME following scopes differ from TM
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([2, 9], 'function', ["source.php", "meta.function.php", "storage.type.function.php",
        // FIXME following scopes differ from TM
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([2, 18], 'testMethod', ["source.php", "meta.function.php", "entity.name.function.php",
        // FIXME following scopes differ from TM
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([2, 28], '(', ["source.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
        // FIXME following scopes differ from TM
        "meta.function.parameters.php",
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([2, 29], ')', ["source.php", "meta.function.php", "punctuation.definition.parameters.end.bracket.round.php",
        // FIXME following scopes differ from TM
        "meta.function.parameters.php",
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([2, 30], ';', ["source.php", "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.function.php",
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([3, 2], 'public', ["source.php", "meta.function.php", "storage.modifier.php",
        // FIXME following scopes differ from TM
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([3, 9], 'function', ["source.php", "meta.function.php", "storage.type.function.php",
        // FIXME following scopes differ from TM
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([3, 18], '__toString', ["source.php", "meta.function.php", "support.function.magic.php",
        // FIXME following scopes differ from TM
        "meta.function.php",
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([3, 28], '(', ["source.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
        // FIXME following scopes differ from TM
        "meta.function.parameters.php",
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([3, 29], ')', ["source.php", "meta.function.php", "punctuation.definition.parameters.end.bracket.round.php",
        // FIXME following scopes differ from TM
        "meta.interface.php",
        "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([3, 30], ';', ["source.php", "punctuation.terminator.expression.php",
        // FIXME following scopes differ from TM
        "meta.function.php",
        "meta.interface.php"
      ]);
      expect(editor).toHaveScopesAtPosition([4, 0], '}', ["source.php", "punctuation.definition.end.bracket.curly.php",
        // FIXME following scopes differ from TM
        "meta.interface.php"
      ]);
    });
  });

  describe("traits", () => {
    it("should tokenize trait correctly", () => {
      editor.setPhpText("trait Test {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'trait', ['source.php', "meta.trait.php", "storage.type.trait.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], ' ', ['source.php', "meta.trait.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], 'Test', ['source.php', "meta.trait.php", "entity.name.type.trait.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], ' ', ['source.php', "meta.trait.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], '{', ["source.php", "punctuation.definition.begin.bracket.curly.php",
        // FIXME following scopes differ from TM
        "meta.trait.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 12], '}', ["source.php", "punctuation.definition.end.bracket.curly.php",
        // FIXME following scopes differ from TM
        "meta.trait.php"
      ]);
    });
  });

  describe("functions", () => {
    it("tokenizes functions with no arguments", async () => {
      editor.setPhpText("function test() {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ' ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], 'test', ['source.php', "meta.function.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], '(', ["source.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 14], ')', ["source.php", "meta.function.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);

      // Should NOT be tokenized as an actual function
      editor.setPhpText("function_test() {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 0], 'function_test', ['source.php', "meta.function-call.php", "entity.name.function.php"]);
    });

    it("tokenizes default array type with old array value", () => {
      editor.setPhpText("function array_test(array $value = array()) {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ' ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], 'array_test', ['source.php', "meta.function.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], '(', ["source.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 20], 'array', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "keyword.other.type.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 25], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
          "meta.function.parameter.default.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 26], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "variable.other.php", "punctuation.definition.variable.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 27], 'value', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "variable.other.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 32], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 33], '=', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "keyword.operator.assignment.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 34], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 35], 'array', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "meta.array.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          // "support.function.construct.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 40], '(', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "meta.array.php", "punctuation.definition.array.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 41], ')', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "meta.array.php", "punctuation.definition.array.end.bracket.round.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 42], ')', ["source.php", "meta.function.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 43], ' ', ["source.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 44], '{', ["source.php", "punctuation.definition.begin.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 45], '}', ["source.php", "punctuation.definition.end.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
    });

    it("tokenizes variadic arguments", () => {
      editor.setPhpText("function test(...$value) {}");

      expect(editor).toHaveScopesAtPosition([1, 14], '...', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.variadic.php", "keyword.operator.variadic.php",
          // FIXME following scopes differ from TM
          // "variable.other.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 17], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.variadic.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], 'value', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.variadic.php", "variable.other.php"]);
    });

    it("tokenizes variadic arguments and typehinted class name", () => {
      editor.setPhpText("function test(class_name ...$value) {}");

      expect(editor).toHaveScopesAtPosition([1, 14], 'class_name', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.variadic.php", "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 25], '...', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.variadic.php", "keyword.operator.variadic.php",
          // FIXME following scopes differ from TM
          // "variable.other.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 28], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.variadic.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 29], 'value', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.variadic.php", "variable.other.php"]);
    });

    it("tokenizes nullable typehints", async () => {
      editor.setPhpText("function test(?class_name $value) {}");

      expect(editor).toHaveScopesAtPosition([1, 14], '?', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "keyword.operator.nullable-type.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 15], 'class_name', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.class.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 26], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 27], 'value', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
        ]);

      editor.setPhpText("function test(? class_name $value) {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 14], '?', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "keyword.operator.nullable-type.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 15], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 16], 'class_name', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.class.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 27], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 28], 'value', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
    });

    it("tokenizes namespaced and typehinted class names", async () => {
      editor.setPhpText("function test(\\class_name $value) {}");

      expect(editor).toHaveScopesAtPosition([1, 14], '\\', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php",
        // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 15], 'class_name', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.class.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 26], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
        ]);

      editor.setPhpText("function test(a\\class_name $value) {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 14], 'a', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 15], '\\', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php",
        // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 16], 'class_name', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.class.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 27], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);

      editor.setPhpText("function test(a\\b\\class_name $value) {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 14], 'a', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 15], '\\', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php",
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 16], 'b', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 17], '\\', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php",
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 18], 'class_name', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.class.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 29], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);

      editor.setPhpText("function test(\\a\\b\\class_name $value) {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 14], '\\', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php",
        // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 15], 'a', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 16], '\\', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php",
        // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 17], 'b', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 18], '\\', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php",
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 19], 'class_name', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "support.class.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 30], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php",
        // FIXME following scopes differ from TM
        // "meta.function.parameter.typehinted.php"
      ]);
    });

    it("tokenizes default array type with short array value", () => {
      editor.setPhpText("function array_test(array $value = []) {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ' ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], 'array_test', ['source.php', "meta.function.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], '(', ["source.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 20], 'array', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "keyword.other.type.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 25], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 26], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "variable.other.php", "punctuation.definition.variable.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 27], 'value', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "variable.other.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 32], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 33], '=', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "keyword.operator.assignment.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 34], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 35], '[', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "punctuation.section.array.begin.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 36], ']', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "punctuation.section.array.end.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.function.parameters.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 37], ')', ["source.php", "meta.function.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 38], ' ', ["source.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 39], '{', ["source.php", "punctuation.definition.begin.bracket.curly.php", // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 40], '}', ["source.php", "punctuation.definition.end.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
    });

    it("tokenizes a non-empty array", () => {
      editor.setPhpText(
        "function not_empty_array_test(array $value = [1,2,'3']) {}"
      );

      expect(editor).toHaveScopesAtPosition([1, 45], '[', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "punctuation.section.array.begin.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 46], '1', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "constant.numeric.decimal.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 47], ',', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "punctuation.separator.delimiter.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 48], '2', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "constant.numeric.decimal.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 49], ',', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "punctuation.separator.delimiter.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 50], '\'', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          // "punctuation.definition.string.begin.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 51], '3', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 52], '\'', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          // "punctuation.definition.string.end.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 53], ']', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "punctuation.section.array.end.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.array.php"
      ]);
    });

    it("tokenizes default value with non-lowercase array type hinting", () => {
      editor.setPhpText("function array_test(Array $value = []) {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ' ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], 'array_test', ['source.php', "meta.function.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], '(', ["source.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 20], 'Array', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "keyword.other.type.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 25], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 26], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "variable.other.php", "punctuation.definition.variable.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 27], 'value', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "variable.other.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 32], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 33], '=', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "keyword.operator.assignment.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 34], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 35], '[', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "punctuation.section.array.begin.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 36], ']', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php", "punctuation.section.array.end.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
          "meta.array.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 37], ')', ["source.php", "meta.function.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 38], ' ', ["source.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 39], '{', ["source.php", "punctuation.definition.begin.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 40], '}', ["source.php", "punctuation.definition.end.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
    });

    it("tokenizes multiple typehinted arguments with default values", () => {
      editor.setPhpText(
        "function test(string $subject = 'no subject', string $body = null) {}"
      );

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ' ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], 'test', ['source.php', "meta.function.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], '(', ["source.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 14], 'string', ["source.php", "meta.function.php", "meta.function.parameters.php", "keyword.other.type.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 21], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "variable.other.php", "punctuation.definition.variable.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 22], 'subject', ["source.php", "meta.function.php", "meta.function.parameters.php", "variable.other.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 29], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 30], '=', ["source.php", "meta.function.php", "meta.function.parameters.php", "keyword.operator.assignment.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 31], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 32], "'", ["source.php", "meta.function.php", "meta.function.parameters.php", "string.quoted.single.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.begin.php"
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 33], 'no subject', ["source.php", "meta.function.php", "meta.function.parameters.php", "string.quoted.single.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 43], "'", ["source.php", "meta.function.php", "meta.function.parameters.php", "string.quoted.single.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.end.php",
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 44], ',', ["source.php", "meta.function.php", "meta.function.parameters.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 45], ' ', ['source.php', "meta.function.php", "meta.function.parameters.php"]);
      expect(editor).toHaveScopesAtPosition([1, 46], 'string', ["source.php", "meta.function.php", "meta.function.parameters.php", "keyword.other.type.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 53], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "variable.other.php", "punctuation.definition.variable.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 54], 'body', ["source.php", "meta.function.php", "meta.function.parameters.php", "variable.other.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 59], '=', ["source.php", "meta.function.php", "meta.function.parameters.php", "keyword.operator.assignment.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 60], ' ', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 61], 'null', ["source.php", "meta.function.php", "meta.function.parameters.php", "constant.language.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 65], ')', ["source.php", "meta.function.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
    });

    it("tokenizes union types in function parameters", async () => {
      editor.setPhpText('function test(int|false $a){}');

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', 'meta.function.php', 'storage.type.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 9], 'test',     ['source.php', 'meta.function.php', 'entity.name.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 13], '(',       ['source.php', 'meta.function.php', 'punctuation.definition.parameters.begin.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.function.parameters.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 14], 'int',     ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'keyword.other.type.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 17], '|',       ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'punctuation.separator.delimiter.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 18], 'false',   ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'keyword.other.type.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 23], ' ',       ['source.php', 'meta.function.php', 'meta.function.parameters.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 24], '$',       ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'variable.other.php', 'punctuation.definition.variable.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 25], 'a',       ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'variable.other.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 26], ')',       ['source.php', 'meta.function.php', 'punctuation.definition.parameters.end.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.function.parameters.php'
      ])

      editor.setPhpText('function test(\\Abc\\ClassA | mixed $a){}');
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', 'meta.function.php', 'storage.type.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 9], 'test',     ['source.php', 'meta.function.php', 'entity.name.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 13], '(',       ['source.php', 'meta.function.php', 'punctuation.definition.parameters.begin.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.function.parameters.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 14], '\\',      ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'support.other.namespace.php',
        // FIXME following scopes differ from TM
        // 'punctuation.separator.inheritance.php',
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 15], 'Abc',     ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'support.other.namespace.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 18], '\\',      ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'support.other.namespace.php',
        // FIXME following scopes differ from TM
        // 'punctuation.separator.inheritance.php',
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 19], 'ClassA',  ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'support.class.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 25], ' ',       ['source.php', 'meta.function.php', 'meta.function.parameters.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 26], '|',       ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'punctuation.separator.delimiter.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 27], ' ',       ['source.php', 'meta.function.php', 'meta.function.parameters.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
        expect(editor).toHaveScopesAtPosition([1, 28], 'mixed',   ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'keyword.other.type.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 33], ' ',       ['source.php', 'meta.function.php', 'meta.function.parameters.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 34], '$',       ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'variable.other.php', 'punctuation.definition.variable.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 35], 'a',       ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'variable.other.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 36], ')',       ['source.php', 'meta.function.php', 'punctuation.definition.parameters.end.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.function.parameters.php'
      ])
    })

    // FIXME TS-php doesn't support intersection types yet
    xit('tokenizes intersection types in function parameters', () => {
      editor.setPhpText('function test(FooInterface&BarInterface $foobar){}')

      expect(editor).toHaveScopesAtPosition([1, 0], 'function',      ['source.php', 'meta.function.php', 'storage.type.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 9], 'test',          ['source.php', 'meta.function.php', 'entity.name.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 13], '(',            ['source.php', 'meta.function.php', 'punctuation.definition.parameters.begin.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.function.parameters.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 14], 'FooInterface', ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'support.class.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 26], '&',            ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'punctuation.separator.delimiter.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 27], 'BarInterface', ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'support.class.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 40], '$',            ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'variable.other.php', 'punctuation.definition.variable.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 41], 'foobar',       ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'variable.other.php',
        // FIXME following scopes differ from TM
        // 'meta.function.parameter.typehinted.php'
        'meta.function.parameter.no-default.php'
      ])
    })

    it("tokenizes trailing comma in function parameters", () => {
      editor.setPhpText("function abc($a, $b,){}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], 'abc', ['source.php', "meta.function.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], '(', ["source.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 13], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 14], 'a', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 15], ',', ["source.php", "meta.function.php", "meta.function.parameters.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], '$', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], 'b', ["source.php", "meta.function.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], ',', ["source.php", "meta.function.php", "meta.function.parameters.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 20], ')', ["source.php", "meta.function.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
    });

    it("tokenizes return values", () => {
      editor.setPhpText("function test() : Client {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ' ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], 'test', ['source.php', "meta.function.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], '(', ["source.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 14], ')', ["source.php", "meta.function.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 15], ' ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 16], ':', ['source.php', "meta.function.php", "keyword.operator.return-value.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], ' ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], 'Client', ['source.php', "meta.function.php", "support.class.php"]);
      // ' ',
      expect(editor).toHaveScopesAtPosition([1, 24], ["source.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
    });

    it("tokenizes nullable return values", async () => {
      editor.setPhpText("function test() : ?Client {}");

      expect(editor).toHaveScopesAtPosition([1, 16], ':', ['source.php', "meta.function.php", "keyword.operator.return-value.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], ' ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], '?', ["source.php", "meta.function.php", "keyword.operator.nullable-type.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], 'Client', ['source.php', "meta.function.php", "support.class.php"]);

      editor.setPhpText("function test() : ?   Client {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 16], ':', ['source.php', "meta.function.php", "keyword.operator.return-value.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], ' ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], '?', ["source.php", "meta.function.php", "keyword.operator.nullable-type.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], '  ', ['source.php', "meta.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 22], 'Client', ['source.php', "meta.function.php", "support.class.php"]);
    });

    it('tokenizes union return types', () => {
      editor.setPhpText('function test() : \\ClassB | null {}')

      expect(editor).toHaveScopesAtPosition([1, 16], ':',      ['source.php', 'meta.function.php', 'keyword.operator.return-value.php'])
      expect(editor).toHaveScopesAtPosition([1, 18], '\\',     ['source.php', 'meta.function.php', 'support.other.namespace.php',
        // FIXME following scopes differ from TM
        // 'punctuation.separator.inheritance.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 19], 'ClassB', ['source.php', 'meta.function.php', 'support.class.php'])
      expect(editor).toHaveScopesAtPosition([1, 25], ' ',      ['source.php', 'meta.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 26], '|',      ['source.php', 'meta.function.php', 'punctuation.separator.delimiter.php'])
      expect(editor).toHaveScopesAtPosition([1, 27], ' ',      ['source.php', 'meta.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 28], 'null',   ['source.php', 'meta.function.php', 'keyword.other.type.php']    )
    })

    // FIXME TS-php doesn't support intersection types yet
    xit('tokenizes intersection return types', () => {
      editor.setPhpText('function foobar() : FooInterface & BarInterface {}')

      expect(editor).toHaveScopesAtPosition([1, 0], 'function',      ['source.php', 'meta.function.php', 'storage.type.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 9], 'foobar',        ['source.php', 'meta.function.php', 'entity.name.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 18], ':',            ['source.php', 'meta.function.php', 'keyword.operator.return-value.php'])
      expect(editor).toHaveScopesAtPosition([1, 20], 'FooInterface', ['source.php', 'meta.function.php', 'support.class.php'])
      expect(editor).toHaveScopesAtPosition([1, 33], '&',            ['source.php', 'meta.function.php', 'punctuation.separator.delimiter.php'])
      expect(editor).toHaveScopesAtPosition([1, 35], 'BarInterface', ['source.php', 'meta.function.php', 'support.class.php'])
    })

    // TS handles parsing of function names so that we don't have to
    // it('tokenizes function names with characters other than letters or numbers', () => {})

    it("tokenizes function returning reference", () => {
      editor.setPhpText("function &test() {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], '&', ['source.php', "meta.function.php", "storage.modifier.reference.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], 'test', ['source.php', "meta.function.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 14], '(', ["source.php", "meta.function.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 15], ')', ["source.php", "meta.function.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
    });

    it("tokenizes yield", () => {
      editor.setPhpText("function test() { yield $a; }");

      expect(editor).toHaveScopesAtPosition([1, 18], 'yield', ["source.php", "keyword.control.yield.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 23], ' ', ["source.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 24], '$', ["source.php", "variable.other.php", "punctuation.definition.variable.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 25], 'a', ["source.php", "variable.other.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 26], ';', ["source.php", "punctuation.terminator.expression.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
    });

    it("tokenizes `yield from`", () => {
      editor.setPhpText("function test() { yield from $a; }");

      expect(editor).toHaveScopesAtPosition([1, 18], 'yield from', ["source.php", "keyword.control.yield.php", "meta.function.php"
          // FIXME following scopes differ from TM
          // 'keyword.control.yield-from.php',
      ]);
      expect(editor).toHaveScopesAtPosition([1, 24], 'from', ["source.php", "keyword.control.yield-from.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 28], ' ', ["source.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 29], '$', ["source.php", "variable.other.php", "punctuation.definition.variable.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 30], 'a', ["source.php", "variable.other.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 31], ';', ["source.php", "punctuation.terminator.expression.php",
          // FIXME following scopes differ from TM
          "meta.function.php"
      ]);
    });
  });

  describe("function calls", () => {
    it("tokenizes function calls with no arguments", async () => {
      editor.setPhpText("inverse()");

      expect(editor).toHaveScopesAtPosition([1, 0], 'inverse', ['source.php', "meta.function-call.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], '(', ["source.php", "meta.function-call.php", "punctuation.definition.arguments.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], ')', ["source.php", "meta.function-call.php", "punctuation.definition.arguments.end.bracket.round.php"]);

      editor.setPhpText("inverse ()");
      await nextHighlightingUpdate(editor);

      expect(editor).toHaveScopesAtPosition([1, 0], 'inverse', ['source.php', "meta.function-call.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], ' ', ['source.php', "meta.function-call.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], '(', ["source.php", "meta.function-call.php", "punctuation.definition.arguments.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ')', ["source.php", "meta.function-call.php", "punctuation.definition.arguments.end.bracket.round.php"]);
    });

    it("tokenizes function calls with arguments", () => {
      editor.setPhpText("inverse(5, 'b')");

      expect(editor).toHaveScopesAtPosition([1, 0], 'inverse', ['source.php', "meta.function-call.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], '(', ["source.php", "meta.function-call.php", "punctuation.definition.arguments.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], '5', ['source.php', "meta.function-call.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], ',', ["source.php", "meta.function-call.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], ' ', ['source.php', "meta.function-call.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], "'", ["source.php", "meta.function-call.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.begin.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 12], 'b', ['source.php', "meta.function-call.php", "string.quoted.single.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], "'", ["source.php", "meta.function-call.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.end.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 14], ')', ["source.php", "meta.function-call.php", "punctuation.definition.arguments.end.bracket.round.php"]);
    });

    it('tokenizes function calls with named arguments', () => {
      editor.setPhpText('doSomething($a ? null : true, b: $b);')

      expect(editor).toHaveScopesAtPosition([1, 0], 'doSomething', ['source.php', 'meta.function-call.php', 'entity.name.function.php'])

      // handle the ternary correctly
      expect(editor).toHaveScopesAtPosition([1, 17], 'null', ['source.php', 'meta.function-call.php', 'constant.language.php'])
      expect(editor).toHaveScopesAtPosition([1, 22], ':',    ['source.php', 'meta.function-call.php', 'keyword.operator.ternary.php'])

      // handle the named argument correctly
      expect(editor).toHaveScopesAtPosition([1, 30], 'b',          ['source.php', 'meta.function-call.php', 'entity.name.variable.parameter.php'])
      expect(editor).toHaveScopesAtPosition([1, 31], ':',          ['source.php', 'meta.function-call.php', 'punctuation.separator.colon.php'])

    })

    it('tokenizes multiline function calls with named arguments', () => {
      editor.setPhpText(`
        doSomething(
          x: $a ?
          null : true,
          a: $b);
        `)

      expect(editor).toHaveScopesAtPosition([1, 0], 'doSomething', ['source.php', 'meta.function-call.php', 'entity.name.function.php'])

      expect(editor).toHaveScopesAtPosition([2, 2], 'x', ['source.php', 'meta.function-call.php', 'entity.name.variable.parameter.php'])
      expect(editor).toHaveScopesAtPosition([2, 3], ':', ['source.php', 'meta.function-call.php', 'punctuation.separator.colon.php'])

      // ternary should be still tokenized
      expect(editor).toHaveScopesAtPosition([3, 2], 'null', ['source.php', 'meta.function-call.php', 'constant.language.php'])
      expect(editor).toHaveScopesAtPosition([3, 7], ':', ['source.php', 'meta.function-call.php', 'keyword.operator.ternary.php'])

      // handle the named argument correctly
      expect(editor).toHaveScopesAtPosition([4, 2], 'a', ['source.php', 'meta.function-call.php', 'entity.name.variable.parameter.php'])
      expect(editor).toHaveScopesAtPosition([4, 3], ':', ['source.php', 'meta.function-call.php', 'punctuation.separator.colon.php'])
    })

    it("tokenizes trailing comma in parameters of function call", () => {
      editor.setPhpText("add(1,2,)");

      expect(editor).toHaveScopesAtPosition([1, 0], 'add', ['source.php', "meta.function-call.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], '1', ['source.php', "meta.function-call.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], ',', ["source.php", "meta.function-call.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], '2', ['source.php', "meta.function-call.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], ',', ["source.php", "meta.function-call.php", "punctuation.separator.delimiter.php"]);
    });

    it("tokenizes builtin function calls", () => {
      editor.setPhpText("echo('Hi!');");

      expect(editor).toHaveScopesAtPosition([1, 0], 'echo', ["source.php", "meta.function-call.php", "support.function.construct.output.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], '(', ["source.php", "meta.function-call.php", "punctuation.definition.arguments.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], "'", ["source.php", "meta.function-call.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          //'punctuation.definition.string.begin.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 6], 'Hi!', ['source.php', "meta.function-call.php", "string.quoted.single.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], "'", ["source.php", "meta.function-call.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.end.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 10], ')', ["source.php", "meta.function-call.php", "punctuation.definition.arguments.end.bracket.round.php"]);
    });

    it("tokenizes root-namespaced function calls", () => {
      editor.setPhpText("\\test()");

      expect(editor).toHaveScopesAtPosition([1, 0], '\\', ["source.php", "meta.function-call.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 1], 'test', ['source.php', "meta.function-call.php", "entity.name.function.php"]);
    });

    it("tokenizes user-namespaced function calls", async () => {
      editor.setPhpText("hello\\test()");

      expect(editor).toHaveScopesAtPosition([1, 0], 'hello', ['source.php', "meta.function-call.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], '\\', ["source.php", "meta.function-call.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 6], 'test', ['source.php', "meta.function-call.php", "entity.name.function.php"]);

      editor.setPhpText("one\\two\\test()");
      await nextHighlightingUpdate(editor);

      expect(editor).toHaveScopesAtPosition([1, 0], 'one', ['source.php', "meta.function-call.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 3], '\\', ["source.php", "meta.function-call.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 4], 'two', ['source.php', "meta.function-call.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], '\\', ["source.php", "meta.function-call.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 8], 'test', ['source.php', "meta.function-call.php", "entity.name.function.php"]);
    });

    it("tokenizes absolutely-namespaced function calls", async () => {
      editor.setPhpText("\\hello\\test()");

      expect(editor).toHaveScopesAtPosition([1, 0], '\\', ["source.php", "meta.function-call.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 1], 'hello', ['source.php', "meta.function-call.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], '\\', ["source.php", "meta.function-call.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 7], 'test', ['source.php', "meta.function-call.php", "entity.name.function.php"]);

      editor.setPhpText("\\one\\two\\test()");
      await nextHighlightingUpdate(editor);

      expect(editor).toHaveScopesAtPosition([1, 0], '\\', ["source.php", "meta.function-call.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 1], 'one', ['source.php', "meta.function-call.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], '\\', ["source.php", "meta.function-call.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 5], 'two', ['source.php', "meta.function-call.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], '\\', ["source.php", "meta.function-call.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 9], 'test', ['source.php', "meta.function-call.php", "entity.name.function.php"]);
    });

    it("does not treat user-namespaced functions as builtins", async () => {
      editor.setPhpText("hello\\apc_store()");

      expect(editor).toHaveScopesAtPosition([1, 6], 'apc_store', ['source.php', "meta.function-call.php", "entity.name.function.php"]);

      editor.setPhpText("\\hello\\apc_store()");
      await nextHighlightingUpdate(editor);

      expect(editor).toHaveScopesAtPosition([1, 7], 'apc_store', ['source.php', "meta.function-call.php", "entity.name.function.php"]);
    });

    it("tokenizes closure calls", () => {
      editor.setPhpText("$callback()");

      expect(editor).toHaveScopesAtPosition([1, 0], '$', ["source.php", "meta.function-call.invoke.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 1], 'callback', ['source.php', "meta.function-call.invoke.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], '(', ["source.php", "punctuation.definition.arguments.begin.bracket.round.php", "meta.function-call.invoke.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.begin.bracket.round.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 10], ')', ["source.php", "punctuation.definition.arguments.end.bracket.round.php", "meta.function-call.invoke.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.end.bracket.round.php"
        ]);
    });
  });

  it('should tokenize non-function-non-control operations correctly', () => {
    editor.setPhpText("echo 'test';");

    expect(editor).toHaveScopesAtPosition([1, 0], 'echo', ['source.php', 'support.function.construct.output.php'])
    expect(editor).toHaveScopesAtPosition([1, 4], ' ',    ['source.php'])
    expect(editor).toHaveScopesAtPosition([1, 5], '\'',   ['source.php', 'string.quoted.single.php',
      // FIXME following scopes differ from TM
      // 'punctuation.definition.string.begin.php'
    ])
    expect(editor).toHaveScopesAtPosition([1, 6], 'test', ['source.php', 'string.quoted.single.php'])
    expect(editor).toHaveScopesAtPosition([1, 10], '\'',  ['source.php', 'string.quoted.single.php',
      // FIXME following scopes differ from TM
      // 'punctuation.definition.string.end.php'
    ])
    expect(editor).toHaveScopesAtPosition([1, 11], ';',   ['source.php', 'punctuation.terminator.expression.php'])
  })

  describe("method calls", () => {
    it("tokenizes method calls with no arguments", async () => {
      // FIXME the TM test didn't include the leading $ ... which is invalid
      // syntax, right?
      editor.setPhpText("$obj->method()");

      expect(editor).toHaveScopesAtPosition([1, 4], '->', ['source.php', "meta.method-call.php", "keyword.operator.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], 'method', ['source.php', "meta.method-call.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], '(', ["source.php", "meta.method-call.php", "punctuation.definition.arguments.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], ')', ["source.php", "meta.method-call.php", "punctuation.definition.arguments.end.bracket.round.php"]);

      editor.setPhpText("$obj-> method ()");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 4], '->', ['source.php', "meta.method-call.php", "keyword.operator.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], ' ', ['source.php', "meta.method-call.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], 'method', ['source.php', "meta.method-call.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], ' ', ['source.php', "meta.method-call.php"]);
      expect(editor).toHaveScopesAtPosition([1, 14], '(', ["source.php", "meta.method-call.php", "punctuation.definition.arguments.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 15], ')', ["source.php", "meta.method-call.php", "punctuation.definition.arguments.end.bracket.round.php"]);
    });

    it('tokenizes method calls with nullsafe operator', () => {
      // FIXME the TM test didn't include the leading $ ... which is invalid
      // syntax, right?
      editor.setPhpText('$obj?->method()')

      expect(editor).toHaveScopesAtPosition([1, 4], '?->', ['source.php', 'meta.method-call.php', 'keyword.operator.class.php'])
      expect(editor).toHaveScopesAtPosition([1, 7], 'method', ['source.php', 'meta.method-call.php', 'entity.name.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 13], '(', ['source.php', 'meta.method-call.php', 'punctuation.definition.arguments.begin.bracket.round.php'])
      expect(editor).toHaveScopesAtPosition([1, 14], ')', ['source.php', 'meta.method-call.php', 'punctuation.definition.arguments.end.bracket.round.php'])

    })

    it("tokenizes method calls with arguments", () => {
      // FIXME the TM test didn't include the leading $ ... which is invalid
      // syntax, right?
      editor.setPhpText("$obj->method(5, 'b')");

      expect(editor).toHaveScopesAtPosition([1, 6], 'method', ['source.php', "meta.method-call.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], '(', ["source.php", "meta.method-call.php", "punctuation.definition.arguments.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], '5', ['source.php', "meta.method-call.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 14], ',', ["source.php", "meta.method-call.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 15], ' ', ['source.php', "meta.method-call.php"]);
      expect(editor).toHaveScopesAtPosition([1, 16], "'", ["source.php", "meta.method-call.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.begin.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 17], 'b', ['source.php', "meta.method-call.php", "string.quoted.single.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], "'", ["source.php", "meta.method-call.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.end.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 19], ')', ["source.php", "meta.method-call.php", "punctuation.definition.arguments.end.bracket.round.php"]);
    });
  });

  describe("closures", () => {
    it("should tokenize closures correctly", () => {
      editor.setPhpText("$a = function() /* use($b) */ {};");

      expect(editor).toHaveScopesAtPosition([1, 0], '$', ["source.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 1], 'a', ['source.php', "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 2], ' ', ['source.php']);
      expect(editor).toHaveScopesAtPosition([1, 3], '=', ['source.php', "keyword.operator.assignment.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], ' ', ['source.php']);
      expect(editor).toHaveScopesAtPosition([1, 5], 'function', ['source.php', "meta.function.closure.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], '(', ["source.php", "meta.function.closure.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 14], ')', ["source.php", "meta.function.closure.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 16], '/*', ["source.php", "meta.function.closure.php", "comment.block.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.comment.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 27], '*/', ["source.php", "meta.function.closure.php", "comment.block.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.comment.php"
      ]);
    });

    it("tokenizes parameters", () => {
      editor.setPhpText("function($a, string $b) {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.closure.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], '(', ["source.php", "meta.function.closure.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 9], '$', ["source.php", "meta.function.closure.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], 'a', ["source.php", "meta.function.closure.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], ',', ["source.php", "meta.function.closure.php", "meta.function.parameters.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], ' ', ["source.php", "meta.function.closure.php", "meta.function.parameters.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], 'string', ["source.php", "meta.function.closure.php", "meta.function.parameters.php", "keyword.other.type.php", "meta.function.parameter.no-default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 19], ' ', ["source.php", "meta.function.closure.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 20], '$', ["source.php", "meta.function.closure.php", "meta.function.parameters.php", "variable.other.php", "punctuation.definition.variable.php", "meta.function.parameter.no-default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 21], 'b', ["source.php", "meta.function.closure.php", "meta.function.parameters.php", "variable.other.php", "meta.function.parameter.no-default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 22], ')', ["source.php", "meta.function.closure.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
    });

    it("tokenizes return values", async () => {
      editor.setPhpText("function() : string {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.closure.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], '(', ["source.php", "meta.function.closure.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 9], ')', ["source.php", "meta.function.closure.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 10], ' ', ['source.php', "meta.function.closure.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], ':', ["source.php", "meta.function.closure.php", "keyword.operator.return-value.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], ' ', ['source.php', "meta.function.closure.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], 'string', ['source.php', "meta.function.closure.php", "keyword.other.type.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], ' ', ["source.php",
          // FIXME following scopes differ from TM
          "meta.function.closure.php"]);
      expect(editor).toHaveScopesAtPosition([1, 20], '{', ["source.php", "punctuation.definition.begin.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.function.closure.php"]);
      expect(editor).toHaveScopesAtPosition([1, 21], '}', ["source.php", "punctuation.definition.end.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.function.closure.php"]);

      editor.setPhpText("function() : \\Client {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.closure.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], ':', ["source.php", "meta.function.closure.php", "keyword.operator.return-value.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], '\\', ["source.php", "meta.function.closure.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 14], 'Client', ['source.php', "meta.function.closure.php", "support.class.php"]);
    });

    it("tokenizes nullable return values", async () => {
      editor.setPhpText("function() :? Client {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.closure.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], ':', ["source.php", "meta.function.closure.php", "keyword.operator.return-value.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], '?', ["source.php", "meta.function.closure.php", "keyword.operator.nullable-type.php"]);
      expect(editor).toHaveScopesAtPosition([1, 14], 'Client', ['source.php', "meta.function.closure.php", "support.class.php"]);

      editor.setPhpText("function(): ?Client {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 10], ':', ["source.php", "meta.function.closure.php", "keyword.operator.return-value.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], '?', ["source.php", "meta.function.closure.php", "keyword.operator.nullable-type.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], 'Client', ['source.php', "meta.function.closure.php", "support.class.php"]);
    });

    it("tokenizes closure returning reference", async () => {
      editor.setPhpText("function&() {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.closure.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], '&', ["source.php", "meta.function.closure.php", "storage.modifier.reference.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], '(', ["source.php", "meta.function.closure.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 10], ')', ["source.php", "meta.function.closure.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);

      editor.setPhpText("function &() {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 8], ' ', ['source.php', "meta.function.closure.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], '&', ["source.php", "meta.function.closure.php", "storage.modifier.reference.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], '(', ["source.php", "meta.function.closure.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
      ]);
    });

    it("tokenizes use inheritance", async () => {
      editor.setPhpText("function () use($a) {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.closure.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], 'use', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "keyword.other.function.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 15], '(', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "punctuation.definition.parameters.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 16], '$', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], 'a', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], ')', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "punctuation.definition.parameters.end.bracket.round.php"]);

      editor.setPhpText("function () use($a ,$b) {}");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.closure.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], 'use', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "keyword.other.function.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 15], '(', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "punctuation.definition.parameters.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 16], '$', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], 'a', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], ',', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 20], '$', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 21], 'b', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 22], ')', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "punctuation.definition.parameters.end.bracket.round.php"]);
    });

    it("tokenizes use inheritance by reference", () => {
      editor.setPhpText("function () use( &$a ) {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.closure.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], 'use', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "keyword.other.function.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], '&', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "storage.modifier.reference.php",
          // FIXME following scopes differ from TM
          // TS does not include the '&' in the variable node
          // "variable.other.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 18], '$', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], 'a', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "variable.other.php"]);
    });

    it("tokenizes trailing comma in closure parameters and use inheritance", () => {
      editor.setPhpText("function($a,)use($b,){}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'function', ['source.php', "meta.function.closure.php", "storage.type.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 9], '$', ["source.php", "meta.function.closure.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 10], 'a', ["source.php", "meta.function.closure.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], ',', ["source.php", "meta.function.closure.php", "meta.function.parameters.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], 'use', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "keyword.other.function.use.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], '$', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 18], 'b', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 19], ',', ["source.php", "meta.function.closure.php", "meta.function.closure.use.php", "punctuation.separator.delimiter.php"]);
    });
  });

  describe('arrow functions', () => {
      it('tokenizes arrow functions', () => {
        editor.setPhpText('$pow = fn($x) => $x * 2;');

        expect(editor).toHaveScopesAtPosition([1,  7], 'fn', ['source.php', "meta.function.closure.php", "storage.type.function.php"])
        expect(editor).toHaveScopesAtPosition([1,  9], '(',  ['source.php', "meta.function.closure.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
        ])
        expect(editor).toHaveScopesAtPosition([1, 10], '$', ['source.php', "meta.function.closure.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php", "punctuation.definition.variable.php"])
        expect(editor).toHaveScopesAtPosition([1, 11], 'x', ['source.php', "meta.function.closure.php", "meta.function.parameters.php", "meta.function.parameter.no-default.php", "variable.other.php"])
        expect(editor).toHaveScopesAtPosition([1, 12], ')', ['source.php', "meta.function.closure.php", "punctuation.definition.parameters.end.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
        ])
        expect(editor).toHaveScopesAtPosition([1, 13], ' ',  ['source.php', "meta.function.closure.php"])
        expect(editor).toHaveScopesAtPosition([1, 14], '=>', ['source.php', "meta.function.closure.php", "punctuation.definition.arrow.php"])
        expect(editor).toHaveScopesAtPosition([1, 16], ' ',  ['source.php', "meta.function.closure.php"])
        expect(editor).toHaveScopesAtPosition([1, 17], '$',  ['source.php', "variable.other.php", "punctuation.definition.variable.php",
          // FIXME following scopes differ from TM
          "meta.function.closure.php"
        ])
        expect(editor).toHaveScopesAtPosition([1, 18], 'x', ['source.php', "variable.other.php",
          // FIXME following scopes differ from TM
          "meta.function.closure.php",
        ])
        expect(editor).toHaveScopesAtPosition([1, 19], ' ', ['source.php', "meta.function.closure.php"])
        expect(editor).toHaveScopesAtPosition([1, 20], '*', ['source.php', "keyword.operator.arithmetic.php",
          // FIXME following scopes differ from TM
          "meta.function.closure.php",
        ])
        expect(editor).toHaveScopesAtPosition([1, 21], ' ', ['source.php', "meta.function.closure.php"])
        expect(editor).toHaveScopesAtPosition([1, 22], '2', ['source.php', "constant.numeric.decimal.php",
          // FIXME following scopes differ from TM
          "meta.function.closure.php",
        ])
        expect(editor).toHaveScopesAtPosition([1, 23], ';', ['source.php', "punctuation.terminator.expression.php"])

      });

      it('tokenizes parameters', () => {
        editor.setPhpText('$pow = fn(int $x=0) => $x * 2;')

        expect(editor).toHaveScopesAtPosition([1, 7], 'fn', ['source.php', "meta.function.closure.php", "storage.type.function.php"])
        expect(editor).toHaveScopesAtPosition([1, 9], '(',  ['source.php', "meta.function.closure.php", "punctuation.definition.parameters.begin.bracket.round.php",
          // FIXME following scopes differ from TM
          "meta.function.parameters.php"
        ])
        expect(editor).toHaveScopesAtPosition([1, 10], 'int', ['source.php', "meta.function.closure.php", "meta.function.parameters.php", "keyword.other.type.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
        ])
        expect(editor).toHaveScopesAtPosition([1, 14], '$', ['source.php', "meta.function.closure.php", "meta.function.parameters.php", "variable.other.php", "punctuation.definition.variable.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
        ])
        expect(editor).toHaveScopesAtPosition([1, 15], 'x', ['source.php', "meta.function.closure.php", "meta.function.parameters.php", "variable.other.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
        ])
        expect(editor).toHaveScopesAtPosition([1, 16], '=', ['source.php', "meta.function.closure.php", "meta.function.parameters.php", "keyword.operator.assignment.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
        ])
        expect(editor).toHaveScopesAtPosition([1, 17], '0', ['source.php', "meta.function.closure.php", "meta.function.parameters.php", "constant.numeric.decimal.php", "meta.function.parameter.default.php",
          // FIXME following scopes differ from TM
          // "meta.function.parameter.typehinted.php",
        ])
        expect(editor).toHaveScopesAtPosition([1, 18], ')', ['source.php', "meta.function.closure.php", "punctuation.definition.parameters.end.bracket.round.php",
            // FIXME following scopes differ from TM
            "meta.function.parameters.php"
        ])
      });

      it('tokenizes return types', () => {
        editor.setPhpText('$pow = fn($x) :? int => $x * 2;')
        expect(editor).toHaveScopesAtPosition([1, 7],  'fn',  ['source.php', "meta.function.closure.php", "storage.type.function.php"])
        expect(editor).toHaveScopesAtPosition([1, 14], ':',   ['source.php', "meta.function.closure.php", "keyword.operator.return-value.php"])
        expect(editor).toHaveScopesAtPosition([1, 15], '?',   ['source.php', "meta.function.closure.php", "keyword.operator.nullable-type.php"])
        expect(editor).toHaveScopesAtPosition([1, 17], 'int', ['source.php', "meta.function.closure.php", "keyword.other.type.php"])
      });
  });

  describe("the scope resolution operator", () => {
    it("tokenizes static method calls with no arguments", async () => {
      editor.setPhpText("obj::method()");

      expect(editor).toHaveScopesAtPosition([1, 0], 'obj', ["source.php", "support.class.php",
          // FIXME following scopes differ from TM
          "meta.method-call.static.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 3], '::', ["source.php", "meta.method-call.static.php", "keyword.operator.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], 'method', ["source.php", "meta.method-call.static.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], '(', ["source.php", "meta.method-call.static.php", "punctuation.definition.arguments.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], ')', ["source.php", "meta.method-call.static.php", "punctuation.definition.arguments.end.bracket.round.php"]);

      editor.setPhpText("obj :: method ()");
      await nextHighlightingUpdate(editor);

      expect(editor).toHaveScopesAtPosition([1, 0], 'obj', ["source.php", "support.class.php",
          // FIXME following scopes differ from TM
          "meta.method-call.static.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 3], ' ', ["source.php",
          // FIXME following scopes differ from TM
          "meta.method-call.static.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 4], '::', ["source.php", "meta.method-call.static.php", "keyword.operator.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], ' ', ['source.php', "meta.method-call.static.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], 'method', ["source.php", "meta.method-call.static.php", "entity.name.function.php"]);
    });

    it("tokenizes static method calls with arguments", () => {
      editor.setPhpText("obj::method(5, 'b')");

      expect(editor).toHaveScopesAtPosition([1, 0], 'obj', ["source.php", "support.class.php",
          // FIXME following scopes differ from TM
          "meta.method-call.static.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 3], '::', ["source.php", "meta.method-call.static.php", "keyword.operator.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], 'method', ["source.php", "meta.method-call.static.php", "entity.name.function.php"]);
      expect(editor).toHaveScopesAtPosition([1, 11], '(', ["source.php", "meta.method-call.static.php", "punctuation.definition.arguments.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], '5', ["source.php", "meta.method-call.static.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], ',', ["source.php", "meta.method-call.static.php", "punctuation.separator.delimiter.php"]);
      expect(editor).toHaveScopesAtPosition([1, 14], ' ', ['source.php', "meta.method-call.static.php"]);
      expect(editor).toHaveScopesAtPosition([1, 15], "'", ["source.php", "meta.method-call.static.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.begin.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 16], 'b', ["source.php", "meta.method-call.static.php", "string.quoted.single.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], "'", ["source.php", "meta.method-call.static.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // "punctuation.definition.string.end.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 18], ')', ["source.php", "meta.method-call.static.php", "punctuation.definition.arguments.end.bracket.round.php"]);
    });

    it("tokenizes class variables", () => {
      editor.setPhpText("obj::$variable");

      expect(editor).toHaveScopesAtPosition([1, 0], 'obj', ['source.php', "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 3], '::', ['source.php', "keyword.operator.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], '$', ["source.php", "variable.other.class.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], 'variable', ['source.php', "variable.other.class.php"]);
    });

    it("tokenizes class constants", () => {
      editor.setPhpText("obj::constant");

      expect(editor).toHaveScopesAtPosition([1, 0], 'obj', ['source.php', "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 3], '::', ['source.php', "keyword.operator.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], 'constant', ['source.php', "constant.other.class.php"]);
    });

    it("tokenizes namespaced classes", () => {
      editor.setPhpText("\\One\\Two\\Three::$var");

      expect(editor).toHaveScopesAtPosition([1, 0], '\\', ["source.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // 'punctuation.separator.inheritance.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 1], 'One', ['source.php', "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], '\\', ["source.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // 'punctuation.separator.inheritance.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 5], 'Two', ['source.php', "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], '\\', ["source.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // 'punctuation.separator.inheritance.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 9], 'Three', ['source.php', "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 14], '::', ['source.php', "keyword.operator.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 16], '$', ["source.php", "variable.other.class.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], 'var', ['source.php', "variable.other.class.php"]);
    });

    it('tokenizes the special "class" keyword', async () => {
      editor.setPhpText("obj::class");

      expect(editor).toHaveScopesAtPosition([1, 0], 'obj', ['source.php', "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 3], '::', ['source.php', "keyword.operator.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], 'class', ['source.php', "keyword.other.class.php"]);

      // Should NOT be tokenized as `keyword.other.class`
      editor.setPhpText("obj::classic");
      await nextHighlightingUpdate(editor)

      expect(editor).toHaveScopesAtPosition([1, 0], 'obj', ['source.php', "support.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 3], '::', ['source.php', "keyword.operator.class.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], 'classic', ['source.php', "constant.other.class.php"]);
    });
  });

  describe("try/catch", () => {
    it("tokenizes a basic try/catch block", () => {
      editor.setPhpText("try {} catch(Exception $e) {}");

      expect(editor).toHaveScopesAtPosition([1, 0], 'try', ['source.php', "keyword.control.exception.php"]);
      expect(editor).toHaveScopesAtPosition([1, 4], '{', ['source.php', "punctuation.definition.begin.bracket.curly.php"]);
      expect(editor).toHaveScopesAtPosition([1, 5], '}', ['source.php', "punctuation.definition.end.bracket.curly.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], 'catch', ['source.php', "meta.catch.php", "keyword.control.exception.catch.php"]);
      expect(editor).toHaveScopesAtPosition([1, 12], '(', ["source.php", "meta.catch.php", "punctuation.definition.parameters.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], 'Exception', ['source.php', "meta.catch.php", "support.class.exception.php"]);
      expect(editor).toHaveScopesAtPosition([1, 22], ' ', ['source.php', "meta.catch.php"]);
      expect(editor).toHaveScopesAtPosition([1, 23], '$', ["source.php", "meta.catch.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 24], 'e', ['source.php', "meta.catch.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 25], ')', ["source.php", "meta.catch.php", "punctuation.definition.parameters.end.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 27], '{', ["source.php", "punctuation.definition.begin.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.catch.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 28], '}', ["source.php", "punctuation.definition.end.bracket.curly.php",
          // FIXME following scopes differ from TM
          "meta.catch.php"
      ]);
    });

    it("tokenizes a catch block containing namespaced exception", () => {
      editor.setPhpText("try {} catch(\\Abc\\Exception $e) {}");

      expect(editor).toHaveScopesAtPosition([1, 7], 'catch', ['source.php', "meta.catch.php", "keyword.control.exception.catch.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], '\\', ["source.php", "meta.catch.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 14], 'Abc', ['source.php', "meta.catch.php", "support.other.namespace.php"]);
      expect(editor).toHaveScopesAtPosition([1, 17], '\\', ["source.php", "meta.catch.php", "support.other.namespace.php",
          // FIXME following scopes differ from TM
          // "punctuation.separator.inheritance.php"
      ]);
      expect(editor).toHaveScopesAtPosition([1, 18], 'Exception', ['source.php', "meta.catch.php", "support.class.exception.php"]);
    });

    it('tokenizes a catch block containing multiple exceptions', () => {
      editor.setPhpText('try {} catch(AException | BException | CException $e) {}')

      expect(editor).toHaveScopesAtPosition([1, 7], 'catch',       ['source.php', 'meta.catch.php', 'keyword.control.exception.catch.php'])
      expect(editor).toHaveScopesAtPosition([1, 12], '(',          ['source.php', 'meta.catch.php', 'punctuation.definition.parameters.begin.bracket.round.php'])
      expect(editor).toHaveScopesAtPosition([1, 13], 'AException', ['source.php', 'meta.catch.php', 'support.class.exception.php'])
      expect(editor).toHaveScopesAtPosition([1, 23], ' ',          ['source.php', 'meta.catch.php'])
      expect(editor).toHaveScopesAtPosition([1, 24], '|',          ['source.php', 'meta.catch.php', 'punctuation.separator.delimiter.php'])
      expect(editor).toHaveScopesAtPosition([1, 25], ' ',          ['source.php', 'meta.catch.php'])
      expect(editor).toHaveScopesAtPosition([1, 26], 'BException', ['source.php', 'meta.catch.php', 'support.class.exception.php'])
      expect(editor).toHaveScopesAtPosition([1, 37], '|',          ['source.php', 'meta.catch.php', 'punctuation.separator.delimiter.php'])
      expect(editor).toHaveScopesAtPosition([1, 39], 'CException', ['source.php', 'meta.catch.php', 'support.class.exception.php'])
      expect(editor).toHaveScopesAtPosition([1, 50], '$',          ['source.php', 'meta.catch.php', 'variable.other.php', 'punctuation.definition.variable.php'])
      expect(editor).toHaveScopesAtPosition([1, 51], 'e',          ['source.php', 'meta.catch.php', 'variable.other.php'])
      expect(editor).toHaveScopesAtPosition([1, 52], ')',          ['source.php', 'meta.catch.php', 'punctuation.definition.parameters.end.bracket.round.php'])
      expect(editor).toHaveScopesAtPosition([1, 54], '{',          ['source.php', 'punctuation.definition.begin.bracket.curly.php',
        // FIXME following scopes differ from TM
        'meta.catch.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 55], '}',          ['source.php', 'punctuation.definition.end.bracket.curly.php',
        // FIXME following scopes differ from TM
        'meta.catch.php'
      ])
    })

    it('tokenizes a catch block containing multiple namespaced exceptions', () => {
      editor.setPhpText('try {} catch(\\Abc\\Exception | \\Test\\Exception | \\Error $e) {}')

      expect(editor).toHaveScopesAtPosition([1, 7], 'catch',      ["source.php", "meta.catch.php", "keyword.control.exception.catch.php"])
      expect(editor).toHaveScopesAtPosition([1, 12], '(',         ["source.php", "meta.catch.php", "punctuation.definition.parameters.begin.bracket.round.php"])
      expect(editor).toHaveScopesAtPosition([1, 13], '\\',        ["source.php", "meta.catch.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "punctuation.separator.inheritance.php"
      ])
      expect(editor).toHaveScopesAtPosition([1, 14], 'Abc',       ["source.php", "meta.catch.php", "support.other.namespace.php"])
      expect(editor).toHaveScopesAtPosition([1, 17], '\\',        ["source.php", "meta.catch.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "punctuation.separator.inheritance.php"
      ])
      expect(editor).toHaveScopesAtPosition([1, 18], 'Exception', ["source.php", "meta.catch.php", "support.class.exception.php"])
      expect(editor).toHaveScopesAtPosition([1, 27], ' ',         ["source.php", "meta.catch.php"])
      expect(editor).toHaveScopesAtPosition([1, 28], '|',         ["source.php", "meta.catch.php", "punctuation.separator.delimiter.php"])
      expect(editor).toHaveScopesAtPosition([1, 29], ' ',         ["source.php", "meta.catch.php"])
      expect(editor).toHaveScopesAtPosition([1, 30], '\\',        ["source.php", "meta.catch.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "punctuation.separator.inheritance.php"
      ])
      expect(editor).toHaveScopesAtPosition([1, 31], 'Test',      ["source.php", "meta.catch.php", "support.other.namespace.php"])
      expect(editor).toHaveScopesAtPosition([1, 35], '\\',        ["source.php", "meta.catch.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "punctuation.separator.inheritance.php"
      ])
      expect(editor).toHaveScopesAtPosition([1, 36], 'Exception', ["source.php", "meta.catch.php", "support.class.exception.php"])
      expect(editor).toHaveScopesAtPosition([1, 45], ' ',         ["source.php", "meta.catch.php"])
      expect(editor).toHaveScopesAtPosition([1, 46], '|',         ["source.php", "meta.catch.php", "punctuation.separator.delimiter.php"])
      expect(editor).toHaveScopesAtPosition([1, 47], ' ',         ["source.php", "meta.catch.php"])
      expect(editor).toHaveScopesAtPosition([1, 48], '\\',        ["source.php", "meta.catch.php", "support.other.namespace.php",
        // FIXME following scopes differ from TM
        // "punctuation.separator.inheritance.php"
      ])
      expect(editor).toHaveScopesAtPosition([1, 49], 'Error',     ["source.php", "meta.catch.php", "support.class.exception.php"])
      expect(editor).toHaveScopesAtPosition([1, 57], ')',         ["source.php", "meta.catch.php", "punctuation.definition.parameters.end.bracket.round.php"])
    })

    it('tokenizes non-capturing catch block', () => {
      editor.setPhpText('try {} catch (Exception) {}')

      expect(editor).toHaveScopesAtPosition([1, 7], 'catch',      ["source.php", "meta.catch.php", "keyword.control.exception.catch.php"])
      expect(editor).toHaveScopesAtPosition([1, 13], '(',         ["source.php", "meta.catch.php", "punctuation.definition.parameters.begin.bracket.round.php"])
      expect(editor).toHaveScopesAtPosition([1, 14], 'Exception', ["source.php", "meta.catch.php", "support.class.exception.php"])
      expect(editor).toHaveScopesAtPosition([1, 23], ')',         ["source.php", "meta.catch.php", "punctuation.definition.parameters.end.bracket.round.php"])
      expect(editor).toHaveScopesAtPosition([1, 25], '{',         ["source.php", "punctuation.definition.begin.bracket.curly.php",
        // FIXME following scopes differ from TM
        'meta.catch.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 26], '}',         ["source.php", "punctuation.definition.end.bracket.curly.php",
        // FIXME following scopes differ from TM
        'meta.catch.php'
      ])
    })
  });

  describe("numbers", () => {
    it("tokenizes hexadecimals starting", async () => {
      editor.setPhpText("0x1D306");
      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "constant.numeric.hex.php"]);

      editor.setPhpText("0X1D306");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], ['source.php', "constant.numeric.hex.php"]);
    });

    it("tokenizes binary literals", async () => {
      editor.setPhpText("0b011101110111010001100110");
      expect(editor).toHaveScopesAtPosition([1, 0], '0b011101110111010001100110', ['source.php', "constant.numeric.binary.php"]);

      editor.setPhpText("0B011101110111010001100110");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], '0B011101110111010001100110', ['source.php', "constant.numeric.binary.php"]);
    });

    it("tokenizes octal literals", async () => {
      editor.setPhpText("01411");
      expect(editor).toHaveScopesAtPosition([1, 0], '01411', ['source.php', "constant.numeric.octal.php"]);

      editor.setPhpText("0010");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], '0010', ['source.php', "constant.numeric.octal.php"]);
    });

    it("tokenizes decimals", async () => {
      editor.setPhpText("0");
      expect(editor).toHaveScopesAtPosition([1, 0], '0', ['source.php', "constant.numeric.decimal.php"]);

      editor.setPhpText("1234");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], '1234', ['source.php', "constant.numeric.decimal.php"]);

      editor.setPhpText("5e-10");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], '5e-10', ['source.php', "constant.numeric.decimal.php"]);

      editor.setPhpText("5E+5");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], '5E+5', ['source.php', "constant.numeric.decimal.php"]);

      editor.setPhpText("9.");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], '9', ['source.php', "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 1], '.', ["source.php", "constant.numeric.decimal.php",
          // FIXME following scopes differ from TM
          // 'punctuation.separator.decimal.period.php'
      ]);

      editor.setPhpText(".9");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], '.', ["source.php", "constant.numeric.decimal.php",
          // FIXME following scopes differ from TM
          // 'punctuation.separator.decimal.period.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 1], '9', ['source.php', "constant.numeric.decimal.php"]);

      editor.setPhpText("9.9");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], '9', ['source.php', "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 1], '.', ["source.php", "constant.numeric.decimal.php",
          // FIXME following scopes differ from TM
          // 'punctuation.separator.decimal.period.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 2], '9', ['source.php', "constant.numeric.decimal.php"]);

      editor.setPhpText(".1e-23");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], '.', ["source.php", "constant.numeric.decimal.php",
          // FIXME following scopes differ from TM
          // 'punctuation.separator.decimal.period.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 1], '1e-23', ['source.php', "constant.numeric.decimal.php"]);

      editor.setPhpText("1.E3");
      await nextHighlightingUpdate(editor);
      expect(editor).toHaveScopesAtPosition([1, 0], '1', ['source.php', "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([1, 1], '.', ["source.php", "constant.numeric.decimal.php",
          // FIXME following scopes differ from TM
          // 'punctuation.separator.decimal.period.php'
      ]);
      expect(editor).toHaveScopesAtPosition([1, 2], 'E3', ['source.php', "constant.numeric.decimal.php"]);
    });
  });

  // SKIP numeric literal separators are handled by TS-php
  // describe('numeric literal separator', () => {})

  describe("switch and match", () => {
    it("should tokenize switch statements correctly", () => {
      editor.setPhpText(`
        switch($foo)
        {
          case 'string':
            return 1;
          case 1:
            break;
          default:
            continue;
        }
        `);

      expect(editor).toHaveScopesAtPosition([1, 0], 'switch', ["source.php", "meta.switch-statement.php", "keyword.control.switch.php"]);
      expect(editor).toHaveScopesAtPosition([1, 6], '(',      ["source.php", "meta.switch-statement.php", "punctuation.definition.switch-expression.begin.bracket.round.php"]);
      expect(editor).toHaveScopesAtPosition([1, 7], '$',      ["source.php", "meta.switch-statement.php", "variable.other.php", "punctuation.definition.variable.php"]);
      expect(editor).toHaveScopesAtPosition([1, 8], 'foo',    ['source.php', "meta.switch-statement.php", "variable.other.php"]);
      expect(editor).toHaveScopesAtPosition([1, 13], ')',     ["source.php", "meta.switch-statement.php", "punctuation.definition.switch-expression.end.bracket.round.php"]);

      expect(editor).toHaveScopesAtPosition([2, 0], '{', ["source.php", "meta.switch-statement.php", "punctuation.definition.section.switch-block.begin.bracket.curly.php"]);

      expect(editor).toHaveScopesAtPosition([3, 2], 'case', ['source.php', "meta.switch-statement.php", "keyword.control.case.php"]);
      expect(editor).toHaveScopesAtPosition([3, 6], ' ',    ['source.php', "meta.switch-statement.php"]);
      expect(editor).toHaveScopesAtPosition([3, 7], "'",    ["source.php", "meta.switch-statement.php", "string.quoted.single.php",
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.begin.php'
      ]);
      expect(editor).toHaveScopesAtPosition([3, 15], ':', ["source.php", "meta.switch-statement.php", "punctuation.terminator.statement.php"]);

      expect(editor).toHaveScopesAtPosition([4, 4], 'return', ["source.php", "meta.switch-statement.php", "keyword.control.return.php"]);

      expect(editor).toHaveScopesAtPosition([5, 2], 'case', ['source.php', "meta.switch-statement.php", "keyword.control.case.php"]);
      expect(editor).toHaveScopesAtPosition([5, 6], ' ',    ['source.php', "meta.switch-statement.php"]);
      expect(editor).toHaveScopesAtPosition([5, 7], '1',    ["source.php", "meta.switch-statement.php", "constant.numeric.decimal.php"]);
      expect(editor).toHaveScopesAtPosition([5, 8], ':',    ["source.php", "meta.switch-statement.php", "punctuation.terminator.statement.php"]);

      expect(editor).toHaveScopesAtPosition([6, 4], 'break', ['source.php', "meta.switch-statement.php", "keyword.control.break.php"]);
      expect(editor).toHaveScopesAtPosition([7, 2], 'default',  ["source.php", "meta.switch-statement.php", "keyword.control.default.php"]);
      expect(editor).toHaveScopesAtPosition([7, 9], ':',        ["source.php", "meta.switch-statement.php", "punctuation.terminator.statement.php"]);
      expect(editor).toHaveScopesAtPosition([8, 4], 'continue', ["source.php", "meta.switch-statement.php", "keyword.control.continue.php"]);
      expect(editor).toHaveScopesAtPosition([9, 0], '}',        ["source.php", "meta.switch-statement.php", "punctuation.definition.section.switch-block.end.bracket.curly.php"]);
    });

    it('should tokenize match statements correctly', () => {
      editor.setPhpText(`
        echo match (1) {
            0 => 'Foo',
            1, 2 => 'Bar',
            default => 'Baz',
        };
        `);

      expect(editor).toHaveScopesAtPosition([1, 0], 'echo',  ['source.php', 'support.function.construct.output.php'])
      expect(editor).toHaveScopesAtPosition([1, 5], 'match', ['source.php', 'meta.match-statement.php', 'keyword.control.match.php'])
      expect(editor).toHaveScopesAtPosition([1, 11], '(',    ['source.php', 'meta.match-statement.php', 'punctuation.definition.match-expression.begin.bracket.round.php'])
      expect(editor).toHaveScopesAtPosition([1, 12], '1',    ['source.php', 'meta.match-statement.php', 'constant.numeric.decimal.php'])
      expect(editor).toHaveScopesAtPosition([1, 13], ')',    ['source.php', 'meta.match-statement.php', 'punctuation.definition.match-expression.end.bracket.round.php'])
      expect(editor).toHaveScopesAtPosition([1, 15], '{',    ['source.php', 'meta.match-statement.php', 'punctuation.definition.section.match-block.begin.bracket.curly.php'])

      expect(editor).toHaveScopesAtPosition([2, 4], '0',    ['source.php', 'meta.match-statement.php', 'constant.numeric.decimal.php'])
      expect(editor).toHaveScopesAtPosition([2, 6], '=>',   ['source.php', 'meta.match-statement.php', 'keyword.definition.arrow.php'])
      expect(editor).toHaveScopesAtPosition([2, 9], '\'',   ['source.php', 'meta.match-statement.php', 'string.quoted.single.php',
        // FIXME following scopes differ from TM
        // 'punctuation.definition.string.begin.php'
      ])
      expect(editor).toHaveScopesAtPosition([2, 10], 'Foo', ['source.php', 'meta.match-statement.php', 'string.quoted.single.php'])
      expect(editor).toHaveScopesAtPosition([2, 13], '\'',  ['source.php', 'meta.match-statement.php', 'string.quoted.single.php',
        // FIXME following scopes differ from TM
        // 'punctuation.definition.string.end.php'
      ])
      expect(editor).toHaveScopesAtPosition([2, 14], ',',   ['source.php', 'meta.match-statement.php', 'punctuation.separator.delimiter.php'])

      expect(editor).toHaveScopesAtPosition([3, 4], '1',    ['source.php', 'meta.match-statement.php', 'constant.numeric.decimal.php'])
      expect(editor).toHaveScopesAtPosition([3, 5], ',',    ['source.php', 'meta.match-statement.php', 'punctuation.separator.delimiter.php'])
      expect(editor).toHaveScopesAtPosition([3, 7], '2',    ['source.php', 'meta.match-statement.php', 'constant.numeric.decimal.php'])
      expect(editor).toHaveScopesAtPosition([3, 9], '=>',   ['source.php', 'meta.match-statement.php', 'keyword.definition.arrow.php'])
      expect(editor).toHaveScopesAtPosition([3, 12], '\'',  ['source.php', 'meta.match-statement.php', 'string.quoted.single.php',
        // FIXME following scopes differ from TM
        // 'punctuation.definition.string.begin.php'
      ])
      expect(editor).toHaveScopesAtPosition([3, 13], 'Bar', ['source.php', 'meta.match-statement.php', 'string.quoted.single.php'])
      expect(editor).toHaveScopesAtPosition([3, 16], '\'',  ['source.php', 'meta.match-statement.php', 'string.quoted.single.php',
        // FIXME following scopes differ from TM
        // 'punctuation.definition.string.end.php'
      ])
      expect(editor).toHaveScopesAtPosition([3, 17], ',',   ['source.php', 'meta.match-statement.php', 'punctuation.separator.delimiter.php'])

      expect(editor).toHaveScopesAtPosition([4, 4], 'default', ['source.php', 'meta.match-statement.php', 'keyword.control.default.php'])
      expect(editor).toHaveScopesAtPosition([4, 12], '=>',     ['source.php', 'meta.match-statement.php', 'keyword.definition.arrow.php'])
        expect(editor).toHaveScopesAtPosition([4, 15], '\'',     ['source.php', 'meta.match-statement.php', 'string.quoted.single.php',
        // FIXME following scopes differ from TM
        // 'punctuation.definition.string.begin.php'
      ])
      expect(editor).toHaveScopesAtPosition([4, 16], 'Baz',    ['source.php', 'meta.match-statement.php', 'string.quoted.single.php'])
      expect(editor).toHaveScopesAtPosition([4, 19], '\'',     ['source.php', 'meta.match-statement.php', 'string.quoted.single.php',
        // FIXME following scopes differ from TM
        // 'punctuation.definition.string.end.php'
      ])
      expect(editor).toHaveScopesAtPosition([4, 20], ',',      ['source.php', 'meta.match-statement.php', 'punctuation.separator.delimiter.php'])

      expect(editor).toHaveScopesAtPosition([5, 0], '}', ['source.php', 'meta.match-statement.php', 'punctuation.definition.section.match-block.end.bracket.curly.php'])
      expect(editor).toHaveScopesAtPosition([5, 1], ';', ['source.php', 'punctuation.terminator.expression.php'])
    });
  });

  // SKIP b/c these tests are just parse/whitespace tests and this behvaior is
  // handled by TS-php
  // it('should tokenize storage types correctly', () => {})

  describe('attributes', () => {
    it('should tokenize basic attribute', () => {
      editor.setPhpText(`
        #[ExampleAttribute]
        class Foo {}
        `)

      expect(editor).toHaveScopesAtPosition([1, 0], '#[',               ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 2], 'ExampleAttribute', ['source.php', 'meta.attribute.php', 'support.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 18], ']',               ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
      ])
      expect(editor).toHaveScopesAtPosition([2, 0], 'class',            ['source.php', 'meta.class.php', 'storage.type.class.php'])
      expect(editor).toHaveScopesAtPosition([2, 6], 'Foo',              ['source.php', 'meta.class.php', 'entity.name.type.class.php'])
    })

    it('should tokenize inline attribute', () => {
      editor.setPhpText('#[ExampleAttribute] class Foo {}')

      expect(editor).toHaveScopesAtPosition([1, 0], '#[',                ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 2], 'ExampleAttribute',  ['source.php', 'meta.attribute.php', 'support.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 18], ']',                ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 20], 'class',            ['source.php', 'meta.class.php', 'storage.type.class.php'])
      expect(editor).toHaveScopesAtPosition([1, 26], 'Foo',              ['source.php', 'meta.class.php', 'entity.name.type.class.php'])
    })

    it('should tokenize parameter attribute', () => {
      editor.setPhpText('function Foo(#[ParameterAttribute] $parameter) {}')

      expect(editor).toHaveScopesAtPosition([1, 0], 'function',            ['source.php', 'meta.function.php', 'storage.type.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 9], 'Foo',                 ['source.php', 'meta.function.php', 'entity.name.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 12], '(',                  ['source.php', 'meta.function.php', 'punctuation.definition.parameters.begin.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.function.parameters.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 13], '#[',                 ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 15], 'ParameterAttribute', ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.attribute.php', 'support.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 33], ']',                  ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.parameter.no-default.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 35], '$',                  ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.no-default.php', 'variable.other.php', 'punctuation.definition.variable.php'])
      expect(editor).toHaveScopesAtPosition([1, 36], 'parameter',          ['source.php', 'meta.function.php', 'meta.function.parameters.php', 'meta.function.parameter.no-default.php', 'variable.other.php'])
      expect(editor).toHaveScopesAtPosition([1, 45], ')',                  ['source.php', 'meta.function.php', 'punctuation.definition.parameters.end.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.function.parameters.php'
      ])
    })

    it('should tokenize attribute for method', () => {
      editor.setPhpText(`
        class Foo {
          #[ExampleAttribute]
          public function bar() {}
          # I'm a happy comment!
          public function baz() {}
        }
        `)

      expect(editor).toHaveScopesAtPosition([2, 2], '#[', ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.php'
      ])
      expect(editor).toHaveScopesAtPosition([2, 4], 'ExampleAttribute', ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.attribute.php', 'support.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.php'
      ])
      expect(editor).toHaveScopesAtPosition([2, 20], ']', ['source.php', 'meta.class.php', 'meta.class.body.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.php'
      ])
      expect(editor).toHaveScopesAtPosition([4, 0], '  ', ['source.php', 'meta.class.php', 'meta.class.body.php',
        // FIXME following scopes differ from TM
        // 'punctuation.whitespace.comment.leading.php'
      ])
      expect(editor).toHaveScopesAtPosition([4, 2], '#', ['source.php', 'meta.class.php', 'meta.class.body.php', 'comment.line.number-sign.php',
        // FIXME following scopes differ from TM
        // 'punctuation.definition.comment.php'
      ])
      expect(editor).toHaveScopesAtPosition([4, 3], ' I\'m a happy comment!', ['source.php', 'meta.class.php', 'meta.class.body.php', 'comment.line.number-sign.php'])
    })

    it('should tokenize attribute with namespace', () => {
      // NOTE the TM test only includes the attribute w/o the class, which is
      // invalid syntax
      editor.setPhpText('#[Foo\\Bar\\Attribute] class foo {}')

      expect(editor).toHaveScopesAtPosition([1, 0], '#[',         ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 2], 'Foo',        ['source.php', 'meta.attribute.php', 'support.other.namespace.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 5], '\\',         ['source.php', 'meta.attribute.php', 'support.other.namespace.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
        // 'punctuation.separator.inheritance.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 6], 'Bar',        ['source.php', 'meta.attribute.php', 'support.other.namespace.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 9], '\\',         ['source.php', 'meta.attribute.php', 'support.other.namespace.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
        // 'punctuation.separator.inheritance.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 10], 'Attribute', ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
        // 'support.attribute.php',
        'support.class.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 19], ']',         ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php'
      ])
    })

    it('should tokenize multiple attributes', () => {
      // NOTE the TM test only includes the attribute w/o the function, which is
      // invalid syntax
      editor.setPhpText('#[Attribute1, Attribute2] function foo() {}')

      expect(editor).toHaveScopesAtPosition([1, 0], '#[',          ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 2], 'Attribute1',  ['source.php', 'meta.attribute.php', 'support.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 12], ',',          ['source.php', 'meta.attribute.php', 'punctuation.separator.delimiter.php',
        // FIXME following scopes differ from TM
        'meta.function.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 14], 'Attribute2', ['source.php', 'meta.attribute.php', 'support.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 24], ']',          ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.php'
      ])
    })

    it('should tokenize attribute with arguments', () => {
      // NOTE the TM test only includes the attribute w/o the class, which is
      // invalid syntax
      editor.setPhpText('#[Attribute1, Attribute2(true, 2, [3.1, 3.2])] class foo {}')

      expect(editor).toHaveScopesAtPosition([1, 0], '#[', ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 2], 'Attribute1', ['source.php', 'meta.attribute.php', 'support.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 12], ',', ['source.php', 'meta.attribute.php', 'punctuation.separator.delimiter.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 14], 'Attribute2', ['source.php', 'meta.attribute.php', 'support.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 24], '(', ['source.php', 'meta.attribute.php', 'punctuation.definition.arguments.begin.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 25], 'true', ['source.php', 'meta.attribute.php', 'constant.language.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 29], ',', ['source.php', 'meta.attribute.php', 'punctuation.separator.delimiter.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 31], '2', ['source.php', 'meta.attribute.php', 'constant.numeric.decimal.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 32], ',', ['source.php', 'meta.attribute.php', 'punctuation.separator.delimiter.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 34], '[', ['source.php', 'meta.attribute.php', 'punctuation.section.array.begin.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
        'meta.array.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 35], '3', ['source.php', 'meta.attribute.php', 'constant.numeric.decimal.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
        'meta.array.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 36], '.', ['source.php', 'meta.attribute.php', 'constant.numeric.decimal.php',
        // FIXME following scopes differ from TM
        // 'punctuation.separator.decimal.period.php',
        'meta.class.php',
        'meta.array.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 37], '1', ['source.php', 'meta.attribute.php', 'constant.numeric.decimal.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
        'meta.array.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 38], ',', ['source.php', 'meta.attribute.php', 'punctuation.separator.delimiter.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
        'meta.array.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 40], '3', ['source.php', 'meta.attribute.php', 'constant.numeric.decimal.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
        'meta.array.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 41], '.', ['source.php', 'meta.attribute.php', 'constant.numeric.decimal.php',
        // FIXME following scopes differ from TM
        // 'punctuation.separator.decimal.period.php',
        'meta.class.php',
        'meta.array.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 42], '2', ['source.php', 'meta.attribute.php', 'constant.numeric.decimal.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
        'meta.array.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 43], ']', ['source.php', 'meta.attribute.php', 'punctuation.section.array.end.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
        'meta.array.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 44], ')', ['source.php', 'meta.attribute.php', 'punctuation.definition.arguments.end.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 45], ']', ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
    })

    // SKIP TS-php handles this sort of whitespace parsing
    // it('should tokenize multiline attribute', () => {})

    it('should tokenize attribute in anonymous class', () => {
      editor.setPhpText('$foo = new #[ExampleAttribute] class {};')

      expect(editor).toHaveScopesAtPosition([1, 0], '$', ['source.php', 'variable.other.php', 'punctuation.definition.variable.php'])
      expect(editor).toHaveScopesAtPosition([1, 1], 'foo', ['source.php', 'variable.other.php'])
      expect(editor).toHaveScopesAtPosition([1, 5], '=', ['source.php', 'keyword.operator.assignment.php'])
      expect(editor).toHaveScopesAtPosition([1, 7], 'new', ['source.php', 'meta.class.php', 'keyword.other.new.php'])
      expect(editor).toHaveScopesAtPosition([1, 11], '#[', ['source.php', 'meta.class.php', 'meta.attribute.php'])
      expect(editor).toHaveScopesAtPosition([1, 13], 'ExampleAttribute', ['source.php', 'meta.class.php', 'meta.attribute.php', 'support.attribute.php'])
      expect(editor).toHaveScopesAtPosition([1, 29], ']', ['source.php', 'meta.class.php', 'meta.attribute.php'])
      expect(editor).toHaveScopesAtPosition([1, 31], 'class', ['source.php', 'meta.class.php', 'storage.type.class.php'])
      expect(editor).toHaveScopesAtPosition([1, 37], '{', ['source.php', 'meta.class.php', 'punctuation.definition.class.begin.bracket.curly.php',
        // FIXME following scopes differ from TM
        'meta.class.body.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 38], '}', ['source.php', 'meta.class.php', 'punctuation.definition.class.end.bracket.curly.php',
        // FIXME following scopes differ from TM
        'meta.class.body.php'
      ])
      expect(editor).toHaveScopesAtPosition([1, 39], ';', ['source.php', 'punctuation.terminator.expression.php'])
    })

    it('should tokenize attribute in arrow function', () => {
      editor.setPhpText('$foo = #[ExampleAttribute] fn($x) => $x;')

      expect(editor).toHaveScopesAtPosition([1, 0], '$', ['source.php', 'variable.other.php', 'punctuation.definition.variable.php'])
      expect(editor).toHaveScopesAtPosition([1, 1], 'foo', ['source.php', 'variable.other.php'])
      expect(editor).toHaveScopesAtPosition([1, 5], '=', ['source.php', 'keyword.operator.assignment.php'])
      expect(editor).toHaveScopesAtPosition([1, 7], '#[', ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.closure.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 9], 'ExampleAttribute', ['source.php', 'meta.attribute.php', 'support.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.closure.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 25], ']', ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.function.closure.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 27], 'fn', ['source.php', 'meta.function.closure.php', 'storage.type.function.php'])
      expect(editor).toHaveScopesAtPosition([1, 29], '(', ['source.php', 'meta.function.closure.php', 'punctuation.definition.parameters.begin.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.function.parameters.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 30], '$', ['source.php', 'meta.function.closure.php', 'meta.function.parameters.php', 'meta.function.parameter.no-default.php', 'variable.other.php', 'punctuation.definition.variable.php'])
      expect(editor).toHaveScopesAtPosition([1, 31], 'x', ['source.php', 'meta.function.closure.php', 'meta.function.parameters.php', 'meta.function.parameter.no-default.php', 'variable.other.php'])
      expect(editor).toHaveScopesAtPosition([1, 32], ')', ['source.php', 'meta.function.closure.php', 'punctuation.definition.parameters.end.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.function.parameters.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 34], '=>', ['source.php', 'meta.function.closure.php', 'punctuation.definition.arrow.php'])
      expect(editor).toHaveScopesAtPosition([1, 37], '$', ['source.php', 'variable.other.php', 'punctuation.definition.variable.php',
        // FIXME following scopes differ from TM
        'meta.function.closure.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 38], 'x', ['source.php', 'variable.other.php',
        // FIXME following scopes differ from TM
        'meta.function.closure.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 39], ';', ['source.php', 'punctuation.terminator.expression.php'])
    })

    it('should tokenize builtin attribute', () => {
      editor.setPhpText(`
        #[Attribute(Attribute::TARGET_CLASS)]
        class FooAttribute {}
        `)

      expect(editor).toHaveScopesAtPosition([1, 0], '#[', ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 2], 'Attribute', ['source.php', 'meta.attribute.php', 'support.attribute.builtin.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 11], '(', ['source.php', 'meta.attribute.php', 'punctuation.definition.arguments.begin.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 12], 'Attribute', ['source.php', 'meta.attribute.php', 'support.class.builtin.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 21], '::', ['source.php', 'meta.attribute.php', 'keyword.operator.class.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 23], 'TARGET_CLASS', ['source.php', 'meta.attribute.php', 'constant.other.class.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 35], ')', ['source.php', 'meta.attribute.php', 'punctuation.definition.arguments.end.bracket.round.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([1, 36], ']', ['source.php', 'meta.attribute.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([2, 0], 'class', ['source.php', 'meta.class.php', 'storage.type.class.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
      expect(editor).toHaveScopesAtPosition([2, 6], 'FooAttribute', ['source.php', 'meta.class.php', 'entity.name.type.class.php',
        // FIXME following scopes differ from TM
        'meta.class.php',
      ])
    })
  })

  // FIXME following scopes differ from TM
  // they all include 'meta.embedded.block.php', but TM does not
  describe("PHPDoc", () => {
    it("should tokenize tags correctly", () => {
      editor.setPhpText(`
          /**
           * @api
           */
          `)

      expectTokensToEqual(
        editor,
        [
          [
            {text: '/**', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
          ],
          [
            {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
            {text: '* ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
            {text: '@api', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php']},
          ],
          [
            {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
            {text: '*/', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
          ],
        ]
      )
    });

    it("should tokenize single line phpdoc correctly", () => {
      editor.setPhpText(`/** @api */`)

      expectTokensToEqual(
        editor,
        [
          [
            {text: '/** ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
            {text: '@api', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php']},
            {text: ' */', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
          ],
        ]
      )
    });

    it("should tokenize inline phpdoc correctly", () => {
      editor.setPhpText(`/** {@inheritDoc} */`)

      expectTokensToEqual(
        editor,
        [
          [
            {text: '/** {', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
            {text: '@inheritDoc', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php']},
            {text: '} */', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
          ],
        ]
      )
    });

    describe('types', () => {
      it('should tokenize a primitive type', () => {
        editor.setPhpText(`
          /**
           * @param int $foo description
           */
           `);

        expectTokensToEqual(
          editor,
          [
            [
              {text: '/**', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
            ],
            [
              {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
              {text: '* ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              {text: '@param', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php']},
              {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              {text: 'int', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.type.php']},
              {text: ' $foo description', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
            ],
            [
              {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
              {text: '*/', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
            ]
        ]);
    });

    it('should tokenize a named type', () => {
        editor.setPhpText(`
          /**
           * @param Test $foo description
           */
           `);

          expectTokensToEqual(
            editor,
            [
              [
                {text: '/**', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              ],
              [
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
                {text: '* ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                {text: '@param', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php']},
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                {text: 'Test', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php']},
                {text: ' $foo description', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              ],
              [
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
                {text: '*/', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              ]
            ]
          );
        });

    it('should tokenize a named type in @method tags', () => {
        editor.setPhpText(`
          /**
           * @method Foo\\Bar name(Fizz\\Buzz $foo)
           */
           `);

          expectTokensToEqual(
            editor,
            [
              [
                {text: '/**', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              ],
              [
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
                {text: '* ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                {text: '@method', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php']},
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                // FIXME following scopes differ from TM
                {text: 'Foo\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                {text: 'Bar', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                {text: ' name(', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                {text: 'Fizz\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                {text: 'Buzz', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                {text: ' $foo)', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              ],
              [
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
                {text: '*/', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              ]
            ]
          );
        });

        it('should tokenize a single namespaced type', () => {
            editor.setPhpText(`
              /**
              * @param \\Test\\Type $foo description
              */
              `);
            ;

            expectTokensToEqual(
              editor,
              [
                [
                  {text: '/**', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                ],
                [
                  {text: '* ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                  {text: '@param', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php']},
                  {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                  // FIXME following scopes differ from TM
                  {text: '\\Test\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                  // {text: '\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php', 'punctuation.separator.inheritance.php'] },
                  // {text: 'Test', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                  // {text: '\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php', 'punctuation.separator.inheritance.php'] },
                  {text: 'Type', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                  {text: ' $foo description', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                ],
                [
                  {text: '*/', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                ]
              ]
            );
        });

        it('should tokenize multiple types', () => {
          editor.setPhpText(`
            /**
             * @param int|Class $foo description
             */
             `);
          ;

          expectTokensToEqual(
            editor,
            [
              [
                {text: '/**', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              ],
              [
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
                {text: '* ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                {text: '@param', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php'] },
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
                {text: 'int', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.type.php'] },
                {text: '|', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.separator.delimiter.php'] },
                {text: 'Class', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                {text: ' $foo description', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              ],
              [
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
                {text: '*/', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              ]
            ]
          )
        });

        it('should tokenize multiple namespaced types', () => {
            editor.setPhpText(`
              /**
               * @param Test\\One|\\Another\\Root $foo description
               */
              `);

            expectTokensToEqual(
              editor,
              [
                [
                  {text: '/**', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                ],
                [
                  {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
                  {text: '* ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                  {text: '@param', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php'] },
                  {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
                  // FIXME following scopes differ from TM
                  {text: 'Test\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                  // {text: 'Test', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                  // {text: '\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php', 'punctuation.separator.inheritance.php'] },
                  {text: 'One', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                  {text: '|', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.separator.delimiter.php'] },
                  // FIXME following scopes differ from TM
                  {text: '\\Another\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                  // {text: '\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php', 'punctuation.separator.inheritance.php'] },
                  // {text: 'Another', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                  // {text: '\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php', 'punctuation.separator.inheritance.php'] },
                  {text: 'Root', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                  {text: ' $foo description', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
              ],
              [
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'leading-whitespace']},
                {text: '*/', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
              ]
            ]
          )
        });

        it('should tokenize a single primitive array type', () => {
          editor.setPhpText(`/** @param int[] $foo */`);

          expectTokensToEqual(
            editor,
            [
              [
                {text: '/** ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                {text: '@param', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php'] },
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
                {text: 'int', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.type.php'] },
                {text: '[]', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.array.phpdoc.php'] },
                {text: ' $foo */', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
              ]
            ]
          )
        })

        it('should tokenize a single named array type', () => {
          editor.setPhpText(`/** @param Test[] $foo */`);

          expectTokensToEqual(
            editor,
            [
              [
                {text: '/** ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                {text: '@param', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php'] },
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
                {text: 'Test', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                {text: '[]', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.array.phpdoc.php'] },
                {text: ' $foo */', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
              ]
            ]
          )
        });

        it('should tokenize a single namespaced array type', () => {
          editor.setPhpText(`/** @param Test\\Type[] $foo */`);

          expectTokensToEqual(
            editor,
            [
              [
                {text: '/** ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                {text: '@param', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php'] },
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
                // FIXME following scopes differ from TM
                {text: 'Test\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                // {text: 'Test', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                // {text: '\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php', 'punctuation.separator.inheritance.php'] },
                {text: 'Type', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                {text: '[]', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.array.phpdoc.php'] },
                {text: ' $foo */', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
              ]
            ]
          )
        });

        // FIXME multiple/grouped types are not currently supported by TS-phpdoc
        xit('should tokenize multiple array types', () => {
          editor.setPhpText(`/** @param (int|Class)[] $foo */`);

          expectTokensToEqual(
            editor,
            [
              [
                {text: '/** ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php']},
                {text: '@param', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php'] },
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
                {text: '(', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.definition.type.begin.bracket.round.phpdoc.php'] },
                {text: 'int', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.type.php'] },
                {text: '|', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.separator.delimiter.php'] },
                {text: 'Class', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                {text: ')', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.definition.type.end.bracket.round.phpdoc.php'] },
                {text: '[]', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.array.phpdoc.php'] },
              ]
            ]
          )
        });

        // FIXME multiple/grouped types are not currently supported by TS-phpdoc
        xit('should tokenize complicated multiple array types', () => {
          editor.setPhpText(`/** @param ((Test|int)[]|Test\\Type[]|string[]|resource)[] $foo`);

          expectTokensToEqual(
            editor,
            [
              [
                {text: '@param', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'keyword.other.phpdoc.php'] },
                {text: ' ', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
                {text: '(', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.definition.type.begin.bracket.round.phpdoc.php'] },
                {text: '(', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.definition.type.begin.bracket.round.phpdoc.php'] },
                {text: 'Test', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                {text: '|', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.separator.delimiter.php'] },
                {text: 'int', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.type.php'] },
                {text: ')', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.definition.type.end.bracket.round.phpdoc.php'] },
                {text: '[]', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.array.phpdoc.php'] },
                {text: '|', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.separator.delimiter.php'] },
                {text: 'Test', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php'] },
                {text: '\\', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.other.namespace.php', 'punctuation.separator.inheritance.php'] },
                {text: 'Type', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'support.class.php'] },
                {text: '[]', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.array.phpdoc.php'] },
                {text: '|', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.separator.delimiter.php'] },
                {text: 'string', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.type.php'] },
                {text: '[]', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.array.phpdoc.php'] },
                {text: '|', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.separator.delimiter.php'] },
                {text: 'resource', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.type.php'] },
                {text: ')', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'punctuation.definition.type.end.bracket.round.phpdoc.php'] },
                {text: '[]', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php', 'meta.other.type.phpdoc.php', 'keyword.other.array.phpdoc.php'] },
                {text: ' description', scopes: ['meta.embedded.block.php', 'source.php', 'comment.block.documentation.phpdoc.php'] },
              ]
            ]
          )
        });
    });

  })

  describe("strings", () => {
    it('scopes single quoted strings', () => {
      editor.setPhpText("'just a string'")

      expect(editor).toHaveScopesAtPosition([1, 0], '\'',   ["source.php", "string.quoted.single.php",
        // FIXME following scopes differ from TM
        // "punctuation.definition.string.begin.php"
      ])
      expect(editor).toHaveScopesAtPosition([1, 1], 'just', ["source.php", "string.quoted.single.php"])
      expect(editor).toHaveScopesAtPosition([1, 14], '\'',  ["source.php", "string.quoted.single.php",
        // FIXME following scopes differ from TM
        // "punctuation.definition.string.end.php"
      ])
    })

    it('scopes double quoted strings', () => {
      editor.setPhpText('"just a string";')

      expect(editor).toHaveScopesAtPosition([1, 0], '"', ["source.php", "string.quoted.double.php",
        // FIXME following scopes differ from TM
        // "punctuation.definition.string.begin.php"
      ])
      expect(editor).toHaveScopesAtPosition([1, 1], 'just', ["source.php", "string.quoted.double.php"])
      expect(editor).toHaveScopesAtPosition([1, 14], '"',  ["source.php", "string.quoted.double.php",
        // FIXME following scopes differ from TM
        // "punctuation.definition.string.end.php"
      ])
    })

    it('handles strings containing php tags (regression)', () => {
      // this regression was in the embedded-php parser, not this grammar

      editor.setPhpText('"just a string ?>" . $foo;')

      expect(editor).toHaveScopesAtPosition([1, 0], '"', ["source.php", "string.quoted.double.php",
        // FIXME following scopes differ from TM
        // "punctuation.definition.string.begin.php"
      ])
      expect(editor).toHaveScopesAtPosition([1, 1], 'just', ["source.php", "string.quoted.double.php"])
      expect(editor).toHaveScopesAtPosition([1, 15], '?>',  ["source.php", "string.quoted.double.php",
        // FIXME following scopes differ from TM
        // "punctuation.definition.string.end.php"
      ])
      expect(editor).toHaveScopesAtPosition([1, 17], '"',  ["source.php", "string.quoted.double.php",
        // FIXME following scopes differ from TM
        // "punctuation.definition.string.end.php"
      ])
      expect(editor).toHaveScopesAtPosition([1, 19], '.',  ["source.php", "keyword.operator.string.php"])
      expect(editor).toHaveScopesAtPosition([1, 21], '$',  ['source.php', 'variable.other.php', 'punctuation.definition.variable.php'])
    })

    describe('string escape sequences', () => {
      it( 'tokenizes escaped octal sequences', () => {
        editor.setPhpText('"test \\007 test";')

        expect(editor).toHaveScopesAtPosition([1, 0], '"', ['source.php', 'string.quoted.double.php',
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.begin.php'
        ])
        expect(editor).toHaveScopesAtPosition([1, 1], 'test ', ['source.php', 'string.quoted.double.php'])
        expect(editor).toHaveScopesAtPosition([1, 6], '\\007', ['source.php', 'string.quoted.double.php', 'constant.character.escape.octal.php'])
        expect(editor).toHaveScopesAtPosition([1, 10], ' test', ['source.php', 'string.quoted.double.php'])
        expect(editor).toHaveScopesAtPosition([1, 15], '"', ['source.php', 'string.quoted.double.php',
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.end.php'
        ])
        expect(editor).toHaveScopesAtPosition([1, 16], ';', ['source.php', 'punctuation.terminator.expression.php'])
      })

      it( 'tokenizes escaped hex sequences', () => {
        editor.setPhpText('"test \\x0f test";')

        expect(editor).toHaveScopesAtPosition([1, 0], '"', ['source.php', 'string.quoted.double.php',
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.begin.php'
        ])
        expect(editor).toHaveScopesAtPosition([1, 1], 'test ', ['source.php', 'string.quoted.double.php'])
        expect(editor).toHaveScopesAtPosition([1, 6], '\\x0f', ['source.php', 'string.quoted.double.php', 'constant.character.escape.hex.php'])
        expect(editor).toHaveScopesAtPosition([1, 10], ' test', ['source.php', 'string.quoted.double.php'])
        expect(editor).toHaveScopesAtPosition([1, 15], '"', ['source.php', 'string.quoted.double.php',
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.end.php'
        ])
        expect(editor).toHaveScopesAtPosition([1, 16], ';', ['source.php', 'punctuation.terminator.expression.php'])
      })

      it( 'tokenizes escaped unicode sequences', () => {
        editor.setPhpText('"test \\u{00A0} test";')

        expect(editor).toHaveScopesAtPosition([1, 0], '"', ['source.php', 'string.quoted.double.php',
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.begin.php'
        ])
        expect(editor).toHaveScopesAtPosition([1, 1], 'test ', ['source.php', 'string.quoted.double.php'])
        expect(editor).toHaveScopesAtPosition([1, 6], '\\u{00A0}', ['source.php', 'string.quoted.double.php', 'constant.character.escape.unicode.php'])
        expect(editor).toHaveScopesAtPosition([1, 14], ' test', ['source.php', 'string.quoted.double.php'])
        expect(editor).toHaveScopesAtPosition([1, 19], '"', ['source.php', 'string.quoted.double.php',
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.end.php'
        ])
        expect(editor).toHaveScopesAtPosition([1, 20], ';', ['source.php', 'punctuation.terminator.expression.php'])
      })

      // FIXME how to test \n as an escape sequence? it's tested in the TM
      // tests, but not working here
      for (let escapeCharacter of ['r', 't', 'v', 'e', 'f', '$', '"', '\\']) {
            it(`tokenizes ${escapeCharacter} as an escape character`, () => {
          editor.setPhpText(`"test \\${escapeCharacter} test";`)

          expect(editor).toHaveScopesAtPosition([1, 0], '"', ['source.php', 'string.quoted.double.php',
            // FIXME following scopes differ from TM
            // 'punctuation.definition.string.begin.php'
          ])
          expect(editor).toHaveScopesAtPosition([1, 1], 'test ', ['source.php', 'string.quoted.double.php'])
          expect(editor).toHaveScopesAtPosition([1, 6], `${escapeCharacter}`, ['source.php', 'string.quoted.double.php', 'constant.character.escape.php'])
          expect(editor).toHaveScopesAtPosition([1, 8], ' test', ['source.php', 'string.quoted.double.php'])
          expect(editor).toHaveScopesAtPosition([1, 13], '"', ['source.php', 'string.quoted.double.php',
            // FIXME following scopes differ from TM
            // 'punctuation.definition.string.end.php'
          ])
          expect(editor).toHaveScopesAtPosition([1, 14], ';', ['source.php', 'punctuation.terminator.expression.php'])
        })
      }
    })

    describe("heredoc", () => {
      it("should tokenize a simple heredoc correctly", () => {
        editor.setPhpText(`
          <<<HEREDOC
          I am a heredoc
          HEREDOC;
          `);

        expect(editor).toHaveScopesAtPosition([1, 0], '<<<', ["source.php", "string.unquoted.heredoc.php",
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.php'
        ]);
        expect(editor).toHaveScopesAtPosition([1, 3], 'HEREDOC', ["source.php", "string.unquoted.heredoc.php",
          // FIXME following scopes differ from TM
          // 'keyword.operator.heredoc.php'
        ]);
        expect(editor).toHaveScopesAtPosition([2, 0], 'I am a heredoc', ['source.php', "string.unquoted.heredoc.php"]);
        expect(editor).toHaveScopesAtPosition([3, 0], 'HEREDOC', ["source.php", "string.unquoted.heredoc.php",
          // FIXME following scopes differ from TM
          //'keyword.operator.heredoc.php'
        ]);
        expect(editor).toHaveScopesAtPosition([3, 7], ';', ['source.php', "punctuation.terminator.expression.php"]);
      });
    });

    describe("nowdoc", () => {
      it("should tokenize a simple nowdoc correctly", () => {
        editor.setPhpText(`
          <<<'NOWDOC'
          I am a nowdoc
          NOWDOC;
          `);

        expect(editor).toHaveScopesAtPosition([1, 0], '<<<', ["source.php", "string.unquoted.nowdoc.php",
          // FIXME following scopes differ from TM
          // 'punctuation.definition.string.php'
        ]);
        expect(editor).toHaveScopesAtPosition([1, 3], '\'', ['source.php', "string.unquoted.nowdoc.php"]);
        expect(editor).toHaveScopesAtPosition([1, 4], 'NOWDOC', ["source.php", "string.unquoted.nowdoc.php",
          // FIXME following scopes differ from TM
          // 'keyword.operator.nowdoc.php'
        ]);
        expect(editor).toHaveScopesAtPosition([1, 10], '\'', ['source.php', "string.unquoted.nowdoc.php"]);
        expect(editor).toHaveScopesAtPosition([2, 0], 'I am a nowdoc', ['source.php', "string.unquoted.nowdoc.php"]);
        expect(editor).toHaveScopesAtPosition([3, 0], 'NOWDOC', ["source.php", "string.unquoted.nowdoc.php",
          // FIXME following scopes differ from TM
          // 'keyword.operator.nowdoc.php'
        ]);
        expect(editor).toHaveScopesAtPosition([3, 7], ';', ['source.php', "punctuation.terminator.expression.php"]);
      });
    });
  });
});
