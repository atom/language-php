const { existsSync, mkdirSync } = require("fs");
const { writeFile, readFile } = require("fs/promises");
const path = require("path");
const textmate = require("vscode-textmate");
const oniguruma = require("vscode-oniguruma");
const { compile } = require("coffeescript");
const { runInThisContext } = require("vm");
const axios = require("axios");

const grammarPaths = {
  "source.php": "./grammars/php.cson",
  "text.html.php": "./grammars/html.cson",
};

const grammarImported = {
  "text.html.basic":
    "https://raw.githubusercontent.com/atom/language-html/master/grammars/html.cson",
  // "https://raw.githubusercontent.com/microsoft/vscode/main/extensions/html/syntaxes/html.tmLanguage.json",
  "text.xml":
    "https://raw.githubusercontent.com/microsoft/vscode/main/extensions/xml/syntaxes/xml.tmLanguage.json",
  "source.sql":
    "https://raw.githubusercontent.com/microsoft/vscode/main/extensions/sql/syntaxes/sql.tmLanguage.json",
  "source.js":
    "https://raw.githubusercontent.com/atom/language-javascript/master/grammars/javascript.cson",
  // "https://raw.githubusercontent.com/microsoft/vscode/main/extensions/javascript/syntaxes/JavaScript.tmLanguage.json",
  "source.json":
    "https://raw.githubusercontent.com/microsoft/vscode/main/extensions/json/syntaxes/JSON.tmLanguage.json",
  "source.css":
    "https://raw.githubusercontent.com/microsoft/vscode/main/extensions/css/syntaxes/css.tmLanguage.json",

  // following grammars are not used in tests
  "text.html.php.blade": null,
  "source.smarty": null,
  "source.python": null,
  "source.coffee": null,
  "source.graphql": null,
  "source.java": null,
};

const grammarCachePath = path.join(__dirname, "../tmp/grammars");
if (!existsSync(grammarCachePath))
  mkdirSync(grammarCachePath, { recursive: true });

// Load the oniguruma WASM module
const vscodeOnigurumaLib = readFile(
  path.join(__dirname, "../node_modules/vscode-oniguruma/release/onig.wasm")
).then(({ buffer }) =>
  oniguruma.loadWASM(buffer).then(() => ({
    createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
    createOnigString: (s) => new oniguruma.OnigString(s),
  }))
);

const parseRawGrammar = (data, grammarPath) => {
  if (grammarPath.endsWith(".cson")) {
    data = compile(data.toString("utf8"), {
      bare: true,
      header: false,
      sourceMap: false,
    });
    return runInThisContext(data);
  }
  return textmate.parseRawGrammar(data, grammarPath);
};

// Create a registry that can create a grammar from a scope name.
const registry = new textmate.Registry({
  onigLib: vscodeOnigurumaLib,
  loadGrammar: (scopeName) => {
    let grammarPath = grammarPaths[scopeName];
    if (typeof grammarPath === "string") {
      return readFile(grammarPath).then((data) =>
        parseRawGrammar(data, grammarPath)
      );
    }

    grammarPath = grammarImported[scopeName];
    if (typeof grammarPath === "string") {
      const fileName = path.basename(grammarPath);
      const cachePath = path.join(grammarCachePath, fileName);
      if (existsSync(cachePath)) {
        // console.info(`Using cached grammar for: ${scopeName}`);
        return readFile(cachePath).then((data) =>
          parseRawGrammar(data, cachePath)
        );
      } else {
        // console.info(`Downloading grammar for: ${scopeName}`);
        return axios(grammarPath, { responseType: "text" }).then((res) => {
          if (res.status === 200) {
            const grammar = parseRawGrammar(res.data, grammarPath);
            if (grammar) writeFile(cachePath, res.data);
            return grammar;
          }

          throw new Error("Unable to load grammar file for" + grammarPath);
        });
      }
    } else if (grammarPath === null) {
      // console.info(`Skipping grammar for: ${scopeName}`);
      return null;
    }

    console.warn(`Unknown scope name: ${scopeName}`);
    return null;
  },
});

// Atom-compatible grammar loader
const loadGrammar = (scopeName) => {
  return registry.loadGrammar(scopeName).then((grammar) => {
    const extractTokens = (line, tokens) =>
      tokens.map((token) => {
        return {
          value: line.substring(token.startIndex, token.endIndex),
          scopes: token.scopes,
        };
      });

    let scanner = null;
    if (typeof grammar._grammar.firstLineMatch === "string")
      scanner = grammar.createOnigScanner([grammar._grammar.firstLineMatch]);

    return {
      scopeName: grammar._grammar.scopeName,
      firstLineRegex: { scanner },
      tokenizeLine: (line) => {
        tokens = extractTokens(line, grammar.tokenizeLine(line).tokens);
        return { tokens };
      },
      tokenizeLines: (lines) => {
        let currentState = null;

        const tokens = lines.split(/\n/).map((line) => {
          const { ruleStack, tokens } = grammar.tokenizeLine(
            line,
            currentState
          );
          currentState = ruleStack;

          return extractTokens(line, tokens);
        });
        return tokens;
      },
    };
  });
};

module.exports = { loadGrammar };
