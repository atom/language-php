{makeGrammar, makeRegexFromWords, makeWords, rule} = require 'atom-syntax-tools'
path = require 'path'
fs = require 'fs'

CONSTANTS = require './php-constants.coffee'
FUNCTIONS = require './php-functions.coffee'

for key,val of require './php-constants-static.coffee'
  for v in val
    if key not in CONSTANTS
      CONSTANTS[key] = []
    if v not in CONSTANTS[key]
      CONSTANTS[key].push v

# remove all from reserved, which is language
reserved = []
for v in CONSTANTS.reserved
  if v not in CONSTANTS.language
    reserved.push v

CONSTANTS.reserved = reserved

searchIndexFile = path.resolve __dirname, "..", "tmp", "php-chunked-xhtml", "search-index.json"
content = fs.readFileSync searchIndexFile
searchIndex = JSON.parse content

CLASSES = {}
CLASSES.builtin = (x[0].replace(/\\/g, '\\\\') for x in searchIndex when x[2] is "phpdoc:classref")

functionRule = (name) ->
  m: "(?i)\\b"+makeRegexFromWords(FUNCTIONS[name])+"\\b"
  n: "support.function.#{name}.php"

embedHereDoc = (type, include, ucType=null) ->
  ucType ?= type.toUpperCase()

  rule
    b: """s*(['"]?)(#{ucType})(\\2)\\s*$"""
    c:
      0: 'punctuation.section.embedded.begin.php'
      1: 'punctuation.definition.string.php'
      3: 'keyword.operator.heredoc.php'
    N: include
    e: /^(\3)\b/
    C:
      0: 'punctuation.section.embedded.end.php'
      1: 'keyword.operator.heredoc.php'
    n: "meta.embedded.#{type}"
    p: [ include ]

makeConstants = (name) ->
  if name is "core"
    constants = [].concat CONSTANTS.reserved, CONSTANTS.errorfunc

  if name is "std"
    constants = [].concat CONSTANTS.filesystem

  if name is "ext"
    constants = [].concat ( CONSTANTS[x] for x of CONSTANTS when x not in """
      reserved
      errorfunc
      filesystem
      parserTokens
    """.trim().split(/\s+/) )...
    debugger

  if name is "parser-token"
    constants = [].concat CONSTANTS.parserTokens

  m: /(\\)?\b(X)\b/.source.replace /X/, makeRegexFromWords constants
  c: { 1: 'punctuation.separator.inheritance.php' }
  n: "support.constant.#{name}.php"

classSeparator =
  n: 'punctuation.separator.inheritance.php'
  m: /\\/

grammar =
  name: 'PHP'
  scopeName: 'text.html.php'

  macros:
    'phpstart':          /<\?(?:php|=)?/i
    'extendAscii':       '\\x{7f}-\\x{ff}'
    'identFirstChars':   'a-zA-Z_{extendAscii}'
    'identCharacters':   'a-zA-Z0-9_{extendAscii}'
    'ident':             /[{identFirstChars}][{identCharacters}]*/
    'lcClassName':       /[a-z_][a-z0-9_]*/
    # ident in namespace, case insensitive
    #'nsiIdent':          /[a-z_0-9\\]+\\[a-z_][a-z0-9_]*/i
    'classBuiltin':      makeRegexFromWords CLASSES.builtin
    # 'constantsCore':     makeRegexFromWords CONSTANTS.constantsCore
    'constantsLanguage': makeRegexFromWords CONSTANTS.language
    # 'constantsExtra':    makeRegexFromWords CONSTANTS.constantsExtra
    'parserTokens':      makeRegexFromWords CONSTANTS.parserTokens
    'funcConstruct':     makeRegexFromWords makeWords "isset unset eval empty list"
    'EOARG':             ///(?=,|\)|/[/*]|\#|$)/// # A closing parentheses (end of argument list) or a comma or a comment

  fileTypes: [
    'aw'
    'ctp'
    'inc'
    'install'
    'module'
    'php'
    'php_cs'
    'php3'
    'php4'
    'php5'
    'phpt'
    'phtml'
    'profile'
  ]
  firstLineMatch: '^#!.*(?<!-)php[0-9]{0,1}\\b'
  foldingStartMarker: /(\/\*|\{\s*$|<<<HTML)/
  foldingStopMarker: /(\*\/|^\s*\}|^HTML;)/
  injections:
    """
    text.html.php - (meta.embedded | meta.tag),
    L:text.html.php meta.tag,
    L:source.js.embedded.html
    """: [
      rule
        b: /(^\s*)(?=<\?(?![^?]*\?>))/
        c: 'punctuation.whitespace.embedded.leading.php'
        e: /(?!\G)(\s*$\n)?/
        C: 'punctuation.whitespace.embedded.trailing.php'
        p: [
          {
            b: /{phpstart}/
            c:'punctuation.section.embedded.begin.php'
            N: 'source.php'
            e: /(\?)>/
            C: {
              0: 'punctuation.section.embedded.end.php'
              1: 'source.php'
              }
            n: 'meta.embedded.block.php'
            p: '#language'
          }
        ]

      rule
        b: /{phpstart}(?![^?]*\\\\?>)/
        c: 'punctuation.section.embedded.begin.php'
        N: 'source.php'
        e: /(\?)>/
        C:
          0: 'punctuation.section.embedded.end.php'
          1: 'source.php'
        n: 'meta.embedded.block.php'
        p: '#language'

      rule
        b: /{phpstart}/
        c: { 0: 'punctuation.section.embedded.begin.php' }
        e: />/
        C: { 0: 'punctuation.section.embedded.end.php' }
        n: 'meta.embedded.line.php'
        p: [
          rule
            m: /\G(\s*)((\?))(?=>)/
            c:
              1: 'source.php'
              2: 'punctuation.section.embedded.end.php'
              3: 'source.php'
            n: 'meta.special.empty-tag.php'

          rule
            b: /\G/
            N: 'source.php'
            e: /(\?)(?=>)/
            C:
              0: 'punctuation.section.embedded.end.php'
              1: 'source.php'
            p: '#language'
        ]
    ]

  patterns: 'text.html.basic'
  repository:
    classBuiltin:
      m: /(\\)?(\b{classBuiltin}\b)/i
      c:
        1: 'punctuation.separator.inheritance.php'
      n: 'support.class.builtin.php'
    className: [
      rule
        b: /(?=\\?[a-z_0-9]+\\)/i
        e: /({lcClassName})?(?=[^a-z0-9_\\])/i
        C:
          1:'support.class.php'
        p: '#namespace'

      '#classBuiltin'

      rule
        b: /(?=[\\a-zA-Z_])/
        e: /({lcClassName})?(?=[^a-z0-9_\\])/i
        C:
          1: 'support.class.php'
        p: '#namespace'

    ]
    'comments': [
      rule
        n: 'comment.block.documentation.phpdoc.php'

        b: /(?:^\s*)?(\/\*\*(?:#@\+)?)\s*$/
        c:
          1: 'punctuation.definition.comment.php'

        e: /\*\//
        C: 'punctuation.definition.comment.php'
        p: '#php_doc'

        comment: """
          This now only highlights a docblock if the first line contains only
          /**\n\t\t\t\t\t\t\t\t- this is to stop highlighting everything as
          invalid when people do comment banners with /******** ...\n\t\t\t\t\t\t\t\t
          - Now matches /**#@+ too - used for docblock templates:
          http://manual.phpdoc.org/HTMLframesConverter/default/phpDocumentor/tutorial_phpDocumentor.howto.pkg.html#basics.docblocktemplate
        """

      rule
        n: 'comment.block.php'
        b: /(?:^\s*)?\/\*/
        c: 'punctuation.definition.comment.php'
        e: /\*\//
        C: 'punctuation.definition.comment.php'

      rule
        b: /(^[ \t]+)?(?=\/\/)/
        c:
          1: 'punctuation.whitespace.comment.leading.php'
        e: /(?!\G)/
        p: {
          n: 'comment.line.double-slash.php'
          b: /\/\//
          c: 'punctuation.definition.comment.php'
          e: /\n|(?=\?>)/
        }
      rule
        b: /(^[ \t]+)?(?=#)/
        c:
          1: 'punctuation.whitespace.comment.leading.php'
        e: /(?!\G)/
        p: {
            n: 'comment.line.number-sign.php'
            b: /#/
            c: 'punctuation.definition.comment.php'
            e: /\n|(?=\?>)/
          }

    ]
    'constants': [
      rule
        b: /(?=((\\?{lcClassName}\\[a-z_][a-z_0-9\\]*))[^a-z_0-9\\])/i
        e: /({lcClassName})?(?=[^a-z0-9_\\])/i
        C:
          1: 'constant.other.php'
        p: '#namespace'

      rule
        b: /(?=\\?[{identFirstChars}])/
        e: /(?=[^\\{identFirstChars}])/
        p: [
          rule
            m: /\b({constantsLanguage})\b/i
            n: 'constant.language.php'

          makeConstants('core')
          makeConstants('std')
          makeConstants('ext')
          makeConstants('parser-token')

          rule
            m: /{ident}/
            n: 'constant.other.php'
            comment: """
              In PHP, any identifier which is not a variable is taken to be a constant.
              However, if there is no constant defined with the given name then a notice
              is generated and the constant is assumed to have the value of its name.
            """
        ]
    ]
    functionArguments: [
      '#comments'
      rule
        b: ///
            \s*(array)   # TypeHint
            \s*(&)?      # Reference
            \s*((\$+){ident})  # variable name
            \s*(=)             # a default value
            \s*(array)\s*(\()
          ///i
        c:
          1: 'storage.type.php'
          2: 'storage.modifier.reference.php'
          3: 'variable.other.php'
          4: 'punctuation.definition.variable.php'
          5: 'keyword.operator.assignment.php'
          6: 'support.function.construct.php'
          7: 'punctuation.definition.array.begin.php'
        N: 'meta.array.php'
        e: /\)/
        C: { 0: 'punctuation.definition.array.end.php' }
        n: 'meta.function.argument.array.php'
        p: [
          '#comments'
          '#strings'
          '#numbers'
        ]

      rule
        m: ///
          \s*(array)       # Typehint
          \s*(&)?             # reference
          \s*((\$+){ident})  # variable name
          (?: \s* (?:(=) \s* (?: (null) | (\[) \s* (\]) | ( (?:\S*?\(\)) | (?:\S*?) )))) # a default value
          \s*
          {EOARG}
        ///i

        c:
          1: 'storage.type.php'
          2: 'storage.modifier.reference.php'
          3: 'variable.other.php'
          4: 'punctuation.definition.variable.php'
          5: 'keyword.operator.assignment.php'
          6: 'constant.language.php'
          7: 'punctuation.section.array.begin.php'
          8: 'punctuation.section.array.end.php'
          9: 'invalid.illegal.non-null-typehinted.php'

        n: 'meta.function.argument.array.php'

      rule
        b: /(?=[a-z_0-9\\]*{lcClassName}\s*&?\s*\$)/i
        e: /{EOARG}/
        n: 'meta.function.argument.typehinted.php'
        p: [
          '#className'
          rule
            m: ///
              \s*({lcClassName})?  # Typehinted class name
              (&)?                    # reference
              ((\$+){ident})         # variable name
              (?: \s* (?:(=) \s* (?: (null) | (\[) \s* (\]) | ( (?:\S*?\(\)) | (?:\S*?) )))) # a default value
              {EOARG}
              ///i
            c:
              1: 'support.class.php'
              2: 'storage.modifier.reference.php'
              3: 'variable.other.php'
              4: 'punctuation.definition.variable.php'
              5: 'keyword.operator.assignment.php'
              6: 'constant.language.php'
              7: 'invalid.illegal.non-null-typehinted.php'
        ]

      rule
        m: ///(?:\s*(&))?\s*((\$+){ident})\s*{EOARG}///
        c:
          1: 'storage.modifier.reference.php'
          2: 'variable.other.php'
          3: 'punctuation.definition.variable.php'
        n: 'meta.function.argument.no-default.php'

      rule
        b: /(?:\s*(&))?\s*((\$+){ident})(?:\s*(=)\s*)\s*/
        c:
          1: 'storage.modifier.reference.php'
          2: 'variable.other.php'
          3: 'punctuation.definition.variable.php'
          4: 'keyword.operator.assignment.php'
        e: /{EOARG}/
        n: 'meta.function.argument.default.php'
        p: '#parameter-default-types'

    ]
    functionCall: [
      rule
        b: /(?=\\?[a-z_0-9\\]+\\{lcClassName}\s*\()/i
        e: /(?=\s*\()/
        p: [
          '#userFunctionCall'
        ]
        comment: """
          Functions in a user-defined namespace (overrides any built-ins)
        """
      rule
        m: /\b(print|echo)\b/i
        n: 'support.function.construct.php'

      rule
        b: /(\\)?(?=\b{lcClassName}\s*\()/i
        c:
          1: 'punctuation.separator.inheritance.php'
        e: /(?=\s*\()/
        p: [
          rule
            m: /\b({funcConstruct})(?=\s*\()/i
            n: 'support.function.construct.php'
          '#support'
          '#userFunctionCall'
        ]
        comment: 'Root namespace function calls (built-in or user)'
    ]
    heredoc:
      patterns: [
        rule
          b: /(?=<<<\s*("?)([a-zA-Z_]+[a-zA-Z0-9_]*)(\1)\s*$)/
          e: /(?!\G)/
          I:
            '*':
              p: [ '#interpolation' ]

          n: 'string.unquoted.heredoc.php'
          p: [ '#heredoc_interior' ]

        rule
          b: /(?=<<<\s*('?)([a-zA-Z_]+[a-zA-Z0-9_]*)(\1)\s*$)/
          e: /(?!\G)/
          n: 'string.unquoted.heredoc.nowdoc.php'
          p: [ '#heredoc_interior' ]
      ]
      repository:
        heredoc_interior:
          p: [
            embedHereDoc('html', 'text.html.basic')
            embedHereDoc('xml',  'text.xml')
            embedHereDoc('sql',  'source.sql')
            embedHereDoc('js',   'source.js', 'JAVASCRIPT')
            embedHereDoc('json', 'source.json')
            embedHereDoc('css',  'source.css')

            rule
              b: '(<<<)\\s*([\'"]?)(REGEX)(\\2)\\s*$\\n?'
              c:
                0: 'punctuation.section.embedded.begin.php'
                1: 'punctuation.definition.string.php'
                3: 'keyword.operator.heredoc.php'
              N: 'string.regexp.heredoc.php'
              e: /^(\3)\b/
              C:
                0: 'punctuation.section.embedded.end.php'
                1: 'keyword.operator.heredoc.php'
              p: [
                rule
                  m: /(\\){1,2}[.$^\[\]{}]/
                  n: 'constant.character.escape.regex.php'
                  comment: 'Escaped from the regexp – there can also be 2 backslashes (since 1 will escape the first)'

                rule
                  m: /(\{)\d+(,\d+)?(\})/
                  c:
                    1: 'punctuation.definition.arbitrary-repitition.php'
                    3: 'punctuation.definition.arbitrary-repitition.php'
                  n: 'string.regexp.arbitrary-repitition.php'

                rule
                  b: /\[(?:\^?\])?/
                  c:
                    0: 'punctuation.definition.character-class.php'
                  e: /\]/
                  C:
                    0: 'punctuation.definition.character-class.php'
                  n: 'string.regexp.character-class.php'
                  p: [
                    {
                      m: /\\[\\'\[\]]/
                      n: 'constant.character.escape.php'
                    }
                  ]

                rule
                  m: /[$^+*]/
                  n: 'keyword.operator.regexp.php'

                rule
                  b: '(?<=^|\\s)(#)\\s(?=[[a-zA-Z0-9,. \\t?!-][^\\x{00}-\\x{7F}]]*$)'
                  c:
                    1: 'punctuation.definition.comment.php'
                  comment: 'We are restrictive in what we allow to go after the comment character to avoid false positives, since the availability of comments depend on regexp flags.'
                  e: /\n?$/
                  C:
                    0: 'punctuation.definition.comment.php'
                  n: 'comment.line.number-sign.php'
              ]

            rule
              b: /(<<<)\s*(['"]?)({ident})(\2)/
              c:
                1: 'punctuation.definition.string.php'
                3: 'keyword.operator.heredoc.php'
              e: /^(\3)\b/
              C: 1: 'keyword.operator.heredoc.php'
          ]
    instantiation:
      b: /(new)\s+/i
      c:
        1: 'keyword.other.new.php'
      e: /(?=[^$a-z0-9_\\])/i
      p: [
        {
          m: /(parent|static|self)(?=[^a-z0-9_])/
          n: 'storage.type.php'
        }
        '#className'
        '#variableName'
      ]
    interpolation:
      'comment': """
        http://www.php.net/manual/en/language.types.string.php#language.types.string.parsing
      """
      p: [
        {
          m: /\\[0-7]{1,3}/
          n: 'constant.numeric.octal.php'
        }
        {
          m: /\\x[0-9A-Fa-f]{1,2}/
          n: 'constant.numeric.hex.php'
        }
        {
          m: /\\[enrt\\\$\"]/
          n: 'constant.character.escape.php'
        }
        {
          b: /(\{)(?=\$.*?\})/
          c:
            1: 'punctuation.definition.variable.php'
          e: /(\})/
          C:
            1: 'punctuation.definition.variable.php'
          p: [ '#language' ]
        }
        '#variableName'
      ]
    # invokeCall is not inculded
    invokeCall:
      c:
        1: 'punctuation.definition.variable.php'
        2: 'variable.other.php'
      m: /(\$+)({lcClassName})(?=\s*\()/i
      n: 'meta.function-call.invoke.php'

    language: [
      '#comments'
      {
        n: 'punctuation.section.scope.begin.php'
        m: /\{/
      }
      {
        n: 'punctuation.section.scope.end.php'
        m: /\}/
      }
      {
        n: 'meta.interface.php'
        b: /^\s*(interface)\s+([a-z0-9_]+)\s*(extends)?\s*/i
        c:
          1: 'storage.type.interface.php'
          2: 'entity.name.type.interface.php'
          3: 'storage.modifier.extends.php'
        e: /((?:[a-zA-Z0-9_]+\s*,\s*)*)([a-zA-Z0-9_]+)?\s*(?:(?=\{)|$)/
        C:
          1: [
              {
                m: /[a-zA-Z0-9_]+/
                n: 'entity.other.inherited-class.php'
              }
              {
                m: ','
                n: 'punctuation.separator.classes.php'
              }
            ]
          2: 'entity.other.inherited-class.php'
        p: [ '#namespace' ]
      }
      {
        b: /^\s*(trait)\s+([a-z0-9_]+)/i
        c:
          1: 'storage.type.trait.php'
          2: 'entity.name.type.trait.php'
        e: /(?=[{])/
        n: 'meta.trait.php'
        p: [ '#comments' ]
      }
        {
          b: '(?i)(?:^|(?<=<\\?php))\\s*(namespace)\\b\\s+(?=([a-z0-9_\\\\]+\\s*($|[;{]|(\\/[\\/*])))|$)'
          c:
            1: 'keyword.other.namespace.php'
          N: 'entity.name.type.namespace.php'
          e: /(?=\s*$|[^a-z0-9_\\])/i
          n: 'meta.namespace.php'
          p: [ classSeparator ]
        }
        {
          b: /\s*\b(use)\s+(?:((const)|(function))\s+)?/i
          c:
            1: 'keyword.other.use.php'
            3: 'storage.type.const.php'
            4: 'storage.type.function.php'
          e: /(?=;|(?:^\s*$))/
          n: 'meta.use.php'
          p: [
            '#comments'
            {
              b: /\s*(?=[a-z_0-9\\])/i
              e:  /// (?: (?:\s*(as)\b\s*([a-z_0-9]*)\s*)? (?=,|;|$)) ///i
              C:
                1: 'keyword.other.use-as.php'
                2: 'support.other.namespace.use-as.php'
              p: [
                'include': '#classBuiltin'
                {
                  b: /\s*(?=[\\a-z_0-9])/i
                  e: /$|(?=[\s,;])/
                  n: 'support.other.namespace.use.php'
                  p: [
                    classSeparator
                  ]
                }
              ]
            }
            {
              m: /\s*,\s*/
            }
          ]
        }
        {
          b: /^\s*(abstract|final)?\s*(class)\s+([a-z0-9_]+)\s*/i
          c:
            1: 'storage.modifier.abstract.php'
            2: 'storage.type.class.php'
            3: 'entity.name.type.class.php'
          e: /(?=[;{])/
          n: 'meta.class.php'
          p: [
            '#comments'
            {
              b: /(extends)\s+/i
              c:
                1: 'storage.modifier.extends.php'
              N: 'meta.other.inherited-class.php'
              e: /(?=[^a-z_0-9\\])/i
              p: [
                {
                  b: /(?=\\?[a-z_0-9]+\\)/i
                  e: /({lcClassName})?(?=[^a-z0-9_\\])/i
                  C:
                    1: 'entity.other.inherited-class.php'
                  p: [ '#namespace' ]
                }
                '#classBuiltin'
                '#namespace'
                {
                  m: /{lcClassName}/i
                  n: 'entity.other.inherited-class.php'
                }
              ]
            }
            {
              b: '(?i)(implements)\\s+'
              c:
                1: 'storage.modifier.implements.php'
              e: '(?i)(?=[;{])'
              p: [
                '#comments'
                {
                  b: '(?i)(?=[a-z0-9_\\\\]+)'
                  'contentName': 'meta.other.inherited-class.php'
                  e: '(?i)(?:\\s*(?:,|(?=[^a-z0-9_\\\\\\s]))\\s*)'
                  p: [
                    {
                      b: '(?i)(?=\\\\?[a-z_0-9]+\\\\)'
                      e: '(?i)({lcClassName})?(?=[^a-z0-9_\\\\])'
                      C:
                        '1':
                          n: 'entity.other.inherited-class.php'
                      p: [
                          '#namespace'
                      ]
                    }
                    '#classBuiltin'
                    '#namespace'
                    {
                      m: '(?i){lcClassName}'
                      n: 'entity.other.inherited-class.php'
                    }
                  ]
                }
              ]
            }
          ]
        }
        {
          'captures':
            '1':
              n: 'keyword.control.php'
          m: '\\s*\\b((break|c(ase|ontinue)|d(e(clare|fault)|ie|o)|e(lse(if)?|nd(declare|for(each)?|if|switch|while)|xit)|for(each)?|if|return|switch|use|while|yield))\\b'
        }
        {
          b: '(?i)\\b((?:require|include)(?:_once)?)\\b\\s*'
          c:
            '1':
              n: 'keyword.control.import.include.php'
          e: '(?=\\s|;|$)'
          n: 'meta.include.php'
          p: [
            {
              'include': '#language'
            }
          ]
        }
        {
          b: '\\b(catch)\\b\\s*\\(\\s*'
          c:
            '1':
              n: 'keyword.control.exception.catch.php'
          e: '([A-Za-z_][A-Za-z_0-9]*)\\s*((\\$+)[a-zA-Z_\\x{7f}-\\x{ff}][a-zA-Z0-9_\\x{7f}-\\x{ff}]*)\\s*\\)'
          C:
            '1':
              n: 'support.class.exception.php'
            '2':
              n: 'variable.other.php'
            '3':
              n: 'punctuation.definition.variable.php'
          n: 'meta.catch.php'
          p: [
            {
              'include': '#namespace'
            }
          ]
        }
        {
          m: '\\b(catch|try|throw|exception|finally)\\b'
          n: 'keyword.control.exception.php'
        }
        {
          b: '(?i)\\b(function)\\s*(&\\s*)?(?=\\()'
          c:
            '1':
              n: 'storage.type.function.php'
            '2':
              n: 'storage.modifier.reference.php'
          e: '(?=\\{)'
          n: 'meta.function.closure.php'
          p: [
            {
              b: '(\\()'
              c:
                '1':
                  n: 'punctuation.definition.parameters.begin.php'
              'contentName': 'meta.function.arguments.php'
              e: '(\\))'
              C:
                '1':
                  n: 'punctuation.definition.parameters.end.php'
              p: [
                {
                  'include': '#functionArguments'
                }
              ]
            }
            {
              b: '(?i)(use)\\s*(\\()'
              c:
                '1':
                  n: 'keyword.other.function.use.php'
                '2':
                  n: 'punctuation.definition.parameters.begin.php'
              e: '(\\))'
              C:
                '1':
                  n: 'punctuation.definition.parameters.end.php'
              p: [
                {
                  'captures':
                    '1':
                      n: 'storage.modifier.reference.php'
                    '2':
                      n: 'variable.other.php'
                    '3':
                      n: 'punctuation.definition.variable.php'
                  m: '(?:\\s*(&))?\\s*((\\$+)[a-zA-Z_\\x{7f}-\\x{ff}][a-zA-Z0-9_\\x{7f}-\\x{ff}]*)\\s*(?=,|\\))'
                  n: 'meta.function.closure.use.php'
                }
              ]
            }
          ]
        }
        {
          b: '(?x)\\s*\n\t\t\t\t\t    ((?:(?:final|abstract|public|private|protected|static)\\s+)*)\n\t\t\t\t        (function)\n\t\t\t\t        (?:\\s+|(\\s*&\\s*))\n\t\t\t\t        (?:\n\t\t\t\t            (__(?:call|construct|debugInfo|destruct|get|set|isset|unset|tostring|clone|set_state|sleep|wakeup|autoload|invoke|callStatic))\n\t\t\t\t            |([a-zA-Z0-9_]+)\n\t\t\t\t        )\n\t\t\t\t        \\s*\n\t\t\t\t        (\\()'
          c:
            '1':
              p: [
                {
                  m: 'final|abstract|public|private|protected|static'
                  n: 'storage.modifier.php'
                }
              ]
            '2':
              n: 'storage.type.function.php'
            '3':
              n: 'storage.modifier.reference.php'
            '4':
              n: 'support.function.magic.php'
            '5':
              n: 'entity.name.function.php'
            '6':
              n: 'punctuation.definition.parameters.begin.php'
          'contentName': 'meta.function.arguments.php'
          e: '(\\))'
          C:
            '1':
              n: 'punctuation.definition.parameters.end.php'
          n: 'meta.function.php'
          p: [
            {
              'include': '#functionArguments'
            }
          ]
        }
        {
          'include': '#invokeCall'
        }
        {
          b: '(?xi)\\s*(?=\n\t\t\t\t        [a-z_0-9$\\\\]+(::)\n                        (?:\n        \t\t\t\t    ({lcClassName})\\s*\\(\n        \t\t\t\t    |\n        \t\t\t\t    ((\\$+)[a-z_\\x{7f}-\\x{ff}][a-z0-9_\\x{7f}-\\x{ff}]*)\n        \t\t\t\t    |\n        \t\t\t\t    ([a-z_\\x{7f}-\\x{ff}][a-z0-9_\\x{7f}-\\x{ff}]*)\n        \t\t\t\t)?\n\t\t\t\t    )'
          e: '(?x)(::)\n                        (?:\n        \t\t\t\t    ([A-Za-z_][A-Za-z_0-9]*)\\s*\\(\n        \t\t\t\t    |\n        \t\t\t\t    ((\\$+)[a-zA-Z_\\x{7f}-\\x{ff}][a-zA-Z0-9_\\x{7f}-\\x{ff}]*)\n        \t\t\t\t    |\n        \t\t\t\t    ([a-zA-Z_\\x{7f}-\\x{ff}][a-zA-Z0-9_\\x{7f}-\\x{ff}]*)\n        \t\t\t\t)?'
          C:
            '1':
              n: 'keyword.operator.class.php'
            '2':
              n: 'meta.function-call.static.php'
            '3':
              n: 'variable.other.class.php'
            '4':
              n: 'punctuation.definition.variable.php'
            '5':
              n: 'constant.other.class.php'
          p: [
            {
              m: '(self|static|parent)\\b'
              n: 'storage.type.php'
            }
            {
              'include': '#className'
            }
            {
              'include': '#variableName'
            }
          ]
        }
        {
          'include': '#variables'
        }
        {
          'include': '#strings'
        }
        {
          'captures':
            '1':
              n: 'support.function.construct.php'
            '2':
              n: 'punctuation.definition.array.begin.php'
            '3':
              n: 'punctuation.definition.array.end.php'
          m: '(array)(\\()(\\))'
          n: 'meta.array.empty.php'
        }
        {
          b: '(array)(\\()'
          c:
            '1':
              n: 'support.function.construct.php'
            '2':
              n: 'punctuation.definition.array.begin.php'
          e: '\\)'
          C:
            '0':
              n: 'punctuation.definition.array.end.php'
          n: 'meta.array.php'
          p: [
            {
              'include': '#language'
            }
          ]
        }
        {
          'captures':
            '1':
              n: 'storage.type.php'
          m: '(?i)\\s*\\(\\s*(array|real|double|float|int(eger)?|bool(ean)?|string|object|binary|unset)\\s*\\)'
        }
        {
          m: '(?i)\\b(array|real|double|float|int(eger)?|bool(ean)?|string|class|clone|var|function|interface|trait|parent|self|object)\\b'
          n: 'storage.type.php'
        }
        {
          m: '(?i)\\b(global|abstract|const|extends|implements|final|p(r(ivate|otected)|ublic)|static)\\b'
          n: 'storage.modifier.php'
        }
        {
          'include': '#object'
        }
        {
          m: ';'
          n: 'punctuation.terminator.expression.php'
        }
        {
          'include': '#heredoc'
        }
        {
          m: '\\.=?'
          n: 'keyword.operator.string.php'
        }
        {
          m: '=>'
          n: 'keyword.operator.key.php'
        }
        {
          'captures':
            '1':
              n: 'keyword.operator.assignment.php'
            '2':
              n: 'storage.modifier.reference.php'
            '3':
              n: 'storage.modifier.reference.php'
          m: '(?:(\\=)(&))|(&(?=[$A-Za-z_]))'
        }
        {
          m: '(@)'
          n: 'keyword.operator.error-control.php'
        }
        {
          m: '=|\\+=|\\-=|\\*=|/=|%=|&=|\\|=|\\^=|<<=|>>='
          n: 'keyword.operator.assignment.php'
        }
        {
          m: '(\\-\\-|\\+\\+)'
          n: 'keyword.operator.increment-decrement.php'
        }
        {
          m: '(\\-|\\+|\\*|/|%)'
          n: 'keyword.operator.arithmetic.php'
        }
        {
          m: '(?i)(!|&&|\\|\\|)|\\b(and|or|xor|as)\\b'
          n: 'keyword.operator.logical.php'
        }
        {
          'include': '#functionCall'
        }
        {
          m: '<<|>>|~|\\^|&|\\|'
          n: 'keyword.operator.bitwise.php'
        }
        {
          m: '(===|==|!==|!=|<=|>=|<>|<|>)'
          n: 'keyword.operator.comparison.php'
        }
        {
          b: '(?i)\\b(instanceof)\\b\\s+(?=[\\\\$a-z_])'
          c:
            '1':
              n: 'keyword.operator.type.php'
          e: '(?=[^\\\\$A-Za-z_0-9])'
          p: [
              '#className'
              '#variableName'
          ]
        }
        '#numbers'
        '#instantiation'
        {
          'captures':
            '1':
              n: 'keyword.control.goto.php'
            '2':
              n: 'support.other.php'
          m: '(?i)(goto)\\s+({lcClassName})'
        }
        {
          'captures':
            '1':
              n: 'entity.name.goto-label.php'
          m: '(?i)^\\s*({lcClassName})\\s*:'
        }
        {
          'include': '#string-backtick'
        }
        {
          b: '\\['
          c:
            '0':
              n: 'punctuation.section.array.begin.php'
          e: '\\]'
          C:
            '0':
              n: 'punctuation.section.array.end.php'
          p: [
            {
              'include': '#language'
            }
          ]
        }
        {
          'include': '#constants'
        }
      ]
    'namespace':
      b: /(?:(namespace)|[a-z0-9_]+)?(\\)(?=.*?[^a-z_0-9\\])/
      c:
        1: 'variable.language.namespace.php'
        2: 'punctuation.separator.inheritance.php'
      e: /(?=[a-z0-9_]*[^a-z0-9_\\])/
      n: 'support.other.namespace.php'
      p: [
        classSeparator
      ]
    'numbers':
      m: /\b((0(x|X)[0-9a-fA-F]*)|(([0-9]+\.?[0-9]*)|(\.[0-9]+))((e|E)(\+|-)?[0-9]+)?)\b/
      n: 'constant.numeric.php'
    'object':
      p: [
        {
          b: /(->)(\$?\{)/
          c:
            1: 'keyword.operator.class.php'
            2: 'punctuation.definition.variable.php'
          e: /(\})/
          C:
            1: 'punctuation.definition.variable.php'
          p: [ '#language' ]
        }
        {
          c:
            1: 'keyword.operator.class.php'
            2: 'meta.function-call.object.php'
            3: 'variable.other.property.php'
            4: 'punctuation.definition.variable.php'
          m: '(?x)(->)\n            \t\t\t\t(?:\n            \t\t\t\t    ([A-Za-z_][A-Za-z_0-9]*)\\s*\\(\n            \t\t\t\t    |\n            \t\t\t\t    ((\\$+)?[a-zA-Z_\\x{7f}-\\x{ff}][a-zA-Z0-9_\\x{7f}-\\x{ff}]*)\n            \t\t\t\t)?'
        }
      ]
    'parameter-default-types':
      p: [
        '#strings'
        '#numbers'
        '#string-backtick'
        '#variables'
        {
          m: '=>'
          n: 'keyword.operator.key.php'
        }
        {
          m: '='
          n: 'keyword.operator.assignment.php'
        }
        {
          m: /&(?=\s*\$)/
          n: 'storage.modifier.reference.php'
        }
        {
          b: /(array)\s*(\()/
          c:
            1: 'support.function.construct.php'
            2: 'punctuation.definition.array.begin.php'
          e: /\)/
          C:
            0: 'punctuation.definition.array.end.php'
          n: 'meta.array.php'
          p: [
              '#parameter-default-types'
          ]
        }
        '#instantiation'
        {
          b: '(?xi)\\s*(?=\n\t\t\t\t        [a-z_0-9\\\\]+(::)\n    \t\t\t\t    ([a-z_\\x{7f}-\\x{ff}][a-z0-9_\\x{7f}-\\x{ff}]*)?\n\t\t\t\t    )'
          e: '(?i)(::)([a-z_\\x{7f}-\\x{ff}][a-z0-9_\\x{7f}-\\x{ff}]*)?'
          C:
            1: 'keyword.operator.class.php'
            2: 'constant.other.class.php'
          p: [
              '#className'
          ]
        }
        '#constants'
      ]
    'php_doc':
      p: [
        {
          'comment': 'PHPDocumentor only recognises lines with an asterisk as the first non-whitespaces character'
          m: /^(?!\s*\*).*$/
          n: 'invalid.illegal.missing-asterisk.phpdoc.php'
        }
        {
          c:
            1: 'keyword.other.phpdoc.php'
            3: 'storage.modifier.php'
            4: 'invalid.illegal.wrong-access-type.phpdoc.php'
          m: /^\s*\*\s*(@access)\s+((public|private|protected)|(.+))\s*$/
        }
        {
          c:
            1: 'keyword.other.phpdoc.php'
            2: 'markup.underline.link.php'
          m: /(@xlink)\s+(.+)\s*$/
        }
        {
          m: '\\@(a(pi|bstract|uthor)|c(ategory|opyright)|example|global|internal|li(cense|nk)|method|p(roperty(\\-read|\\-write|)|ackage|aram)|return|s(ee|ince|ource|tatic|ubpackage)|t(hrows|odo)|v(ar|ersion)|uses|deprecated|final|ignore)\\b'
          n: 'keyword.other.phpdoc.php'
        }
        {
          c:
            1: 'keyword.other.phpdoc.php'
          m: /\{(@(link)).+?\}/
          n: 'meta.tag.inline.phpdoc.php'
        }
      ]
    'regex-double-quoted':
      b: '(?x)"/ (?= (\\\\.|[^"/])++/[imsxeADSUXu]*" )'
      c:
        0: 'punctuation.definition.string.begin.php'
      e: /(\/)([imsxeADSUXu]*)(")/
      C:
        0: 'punctuation.definition.string.end.php'
      n: 'string.regexp.double-quoted.php'
      p: [
        {
          'comment': 'Escaped from the regexp – there can also be 2 backslashes (since 1 will escape the first)'
          m: /(\\){1,2}[.$^\[\]{}]/
          n: 'constant.character.escape.regex.php'
        }
        '#interpolation'
        {
          c:
            1: 'punctuation.definition.arbitrary-repetition.php'
            3: 'punctuation.definition.arbitrary-repetition.php'
          m: /(\{)\d+(,\d+)?(\})/
          n: 'string.regexp.arbitrary-repetition.php'
        }
        {
          b: /\[(?:\^?\])?/
          c:
            0: 'punctuation.definition.character-class.php'
          e: /\]/
          n: 'string.regexp.character-class.php'
          p: [ '#interpolation' ]
        }
        {
          m: /[$^+*]/
          n: 'keyword.operator.regexp.php'
        }
      ]
    'regex-single-quoted':
      b: '(?x)\'/ (?= ( \\\\ (?: \\\\ (?: \\\\ [\\\\\']? | [^\'] ) | . ) | [^\'/] )++/[imsxeADSUXu]*\' )'
      c:
        0: 'punctuation.definition.string.begin.php'
      e: /(\/)([imsxeADSUXu]*)(')/
      C:
        0: 'punctuation.definition.string.end.php'
      n: 'string.regexp.single-quoted.php'
      p: [
        {
          'captures':
            1: 'punctuation.definition.arbitrary-repetition.php'
            3: 'punctuation.definition.arbitrary-repetition.php'
          m: /(\{)\d+(,\d+)?(\})/
          n: 'string.regexp.arbitrary-repetition.php'
        }
        {
          b: /\[(?:\^?\])?/
          c: { 0: 'punctuation.definition.character-class.php' }
          e: /\]/
          C: { 0: 'punctuation.definition.character-class.php' }
          n: 'string.regexp.character-class.php'
          p: [ '#single_quote_regex_escape' ]
        }
        {
          m: /[$^+*]/
          n: 'keyword.operator.regexp.php'
        }
        '#single_quote_regex_escape'
      ]
      'repository':
        'single_quote_regex_escape':
          'comment': 'Support both PHP string and regex escaping'
          m: '(?x) \\\\ (?: \\\\ (?: \\\\ [\\\\\']? | [^\'] ) | . )'
          n: 'constant.character.escape.php'
    'sql-string-double-quoted':
      b: '"\\s*(?=(SELECT|INSERT|UPDATE|DELETE|CREATE|REPLACE|ALTER)\\b)'
      c:
        0: 'punctuation.definition.string.begin.php'
      N: 'source.sql.embedded.php'
      e: '"'
      C:
        0: 'punctuation.definition.string.end.php'
      n: 'string.quoted.double.sql.php'
      p: [
        {
          m: /#(\\"|[^"])*(?="|$)/
          n: 'comment.line.number-sign.sql'
        }
        {
          m: /--(\\"|[^"])*(?="|$)/
          n: 'comment.line.double-dash.sql'
        }
        {
          m: /\\[\\"`']/
          n: 'constant.character.escape.php'
        }
        {
          'comment': 'Unclosed strings must be captured to avoid them eating the remainder of the PHP script\n\t\t\t\t\tSample case: $sql = "SELECT * FROM bar WHERE foo = \'" . $variable . "\'"'
          m: /'(?=((\\')|[^'"])*("|$))/
          n: 'string.quoted.single.unclosed.sql'
        }
        {
          'comment': 'Unclosed strings must be captured to avoid them eating the remainder of the PHP script\n\t\t\t\t\tSample case: $sql = "SELECT * FROM bar WHERE foo = \'" . $variable . "\'"'
          m: /`(?=((\\`)|[^`"])*("|$))/
          n: 'string.quoted.other.backtick.unclosed.sql'
        }
        {
          b: /'/
          e: /'/
          n: 'string.quoted.single.sql'
          p: [
            '#interpolation'
          ]
        }
        {
          b: /`/
          e: /`/
          n: 'string.quoted.other.backtick.sql'
          p: [
              '#interpolation'
          ]
        }
        '#interpolation'
        'source.sql'
      ]
    'sql-string-single-quoted':
      b: '\'\\s*(?=(SELECT|INSERT|UPDATE|DELETE|CREATE|REPLACE|ALTER)\\b)'
      c:
        0: 'punctuation.definition.string.begin.php'
      'contentName': 'source.sql.embedded.php'
      e: '\''
      C:
        0: 'punctuation.definition.string.end.php'
      n: 'string.quoted.single.sql.php'
      p: [
        {
          m: '#(\\\\\'|[^\'])*(?=\'|$\\n?)'
          n: 'comment.line.number-sign.sql'
        }
        {
          m: '--(\\\\\'|[^\'])*(?=\'|$\\n?)'
          n: 'comment.line.double-dash.sql'
        }
        {
          m: '\\\\[\\\\\'`"]'
          n: 'constant.character.escape.php'
        }
        {
          'comment': 'Unclosed strings must be captured to avoid them eating the remainder of the PHP script\n\t\t\t\t\tSample case: $sql = "SELECT * FROM bar WHERE foo = \'" . $variable . "\'"'
          m: '`(?=((\\\\`)|[^`\'])*(\'|$))'
          n: 'string.quoted.other.backtick.unclosed.sql'
        }
        {
          'comment': 'Unclosed strings must be captured to avoid them eating the remainder of the PHP script\n\t\t\t\t\tSample case: $sql = "SELECT * FROM bar WHERE foo = \'" . $variable . "\'"'
          m: '"(?=((\\\\")|[^"\'])*(\'|$))'
          n: 'string.quoted.double.unclosed.sql'
        }
        'source.sql'
      ]
    'string-backtick':
      b: '`'
      c:
        0: 'punctuation.definition.string.begin.php'
      e: '`'
      C:
        0: 'punctuation.definition.string.end.php'
      n: 'string.interpolated.php'
      p: [
        {
          m: '\\\\.'
          n: 'constant.character.escape.php'
        }
        '#interpolation'
      ]
    'string-double-quoted':
      b: '"'
      c:
        0: 'punctuation.definition.string.begin.php'
      comment: """
        This contentName is just to allow the usage of “select scope” to
        select the string contents first, then the string with quotes
        """
      N: 'meta.string-contents.quoted.double.php'
      e: '"'
      C:
        0: 'punctuation.definition.string.end.php'
      n: 'string.quoted.double.php'
      p: [
          '#interpolation'
      ]
    'string-single-quoted':
      b: '\''
      c:
        0: 'punctuation.definition.string.begin.php'
      N: 'meta.string-contents.quoted.single.php'
      e: '\''
      C:
        0: 'punctuation.definition.string.end.php'
      n: 'string.quoted.single.php'
      p: [
        {
          m: /\\[\\']/
          n: 'constant.character.escape.php'
        }
      ]
    'strings':
      p: [
          '#regex-double-quoted'
          '#sql-string-double-quoted'
          '#string-double-quoted'
          '#regex-single-quoted'
          '#sql-string-single-quoted'
          '#string-single-quoted'
      ]
    'support':
      p: (functionRule(mod) for mod of FUNCTIONS)

    'userFunctionCall':
      b: /(?=[a-z_0-9\\]*[a-z_][a-z0-9_]*\s*\()/i
      e: /{lcClassName}(?=\s*\()/i
      n: 'meta.function-call.php'
      p: [ '#namespace' ]
    'var_basic':
      p: [
        {
          m: ///(\$+){ident}\b///
          c:
            1: 'punctuation.definition.variable.php'
          n: 'variable.other.php'
        }
      ]
    'var_global':
      c:
        1: 'punctuation.definition.variable.php'
      m: /(\$)((_(COOKIE|FILES|GET|POST|REQUEST))|arg(v|c))\b/
      n: 'variable.other.global.php'
    'var_global_safer':
      c:
        1: 'punctuation.definition.variable.php'
      m: /(\$)((GLOBALS|_(ENV|SERVER|SESSION)))/
      n: 'variable.other.global.safer.php'
    'variableName':
      p: [
        '#var_global'
        '#var_global_safer'
        {
          m: /((\$)({ident}))(?:(->)({ident})|(\[)(?:(\d+)|((\$){ident})|(\w+))(\]))?/
          c:
            1: 'variable.other.php'
            2: 'punctuation.definition.variable.php'
            4: 'keyword.operator.class.php'
            5: 'variable.other.property.php'
            6: 'punctuation.section.array.begin.php'
            7: 'constant.numeric.index.php'
            8: 'variable.other.index.php'
            9: 'punctuation.definition.variable.php'
            10: 'string.unquoted.index.php'
            11: 'punctuation.section.array.end.php'
          comment: 'Simple syntax: $foo, $foo[0], $foo[$bar], $foo->bar'
        }
        {
          m: /((\$\{)({ident})(\}))/
          c:
            1: 'variable.other.php'
            2: 'punctuation.definition.variable.php'
            4: 'punctuation.definition.variable.php'

          comment: 'Simple syntax with braces: "foo${bar}baz"'
        }
      ]
    'variables':
      p: [
        '#var_global'
        '#var_global_safer'
        '#var_basic'
        {
          b: /(\$\{)(?=.*?\})/
          c:
            1: 'punctuation.definition.variable.php'
          e: /(\})/
          C:
            1: 'punctuation.definition.variable.php'
          p: '#language'
        }
      ]

module.exports = grammar

#CSON.write path.resolve(__dirname, "..", "grammars", "php.cson")
#module.exports = atom.grammars.createGrammar __filename, makeGrammar grammar
#module.exports = makeGrammar grammar, path.resolve(__dirname, '..', 'grammars', 'php.cson')
