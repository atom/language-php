# PHP language support in Atom [![Build Status](https://travis-ci.org/atom/language-php.svg?branch=master)](https://travis-ci.org/atom/language-php)

Adds syntax highlighting and snippets to PHP files in Atom.

Originally [converted](http://atom.io/docs/latest/converting-a-text-mate-bundle)
from the [PHP TextMate bundle](https://github.com/textmate/php.tmbundle).

Contributions are greatly appreciated. Please fork this repository and open a
pull request to add snippets, make grammar tweaks, etc.


## Development

Grammar `grammars/php.cson` is generated from `src/php.coffee` using PHP Manual as
input.

For now it is done in an un-nodejs-ish way using `make` having `make`, `bash`,
`curl` and `perl` involved:
```
    make
```

This will fetch PHP Manual and generate `src/php-constants.coffee`, `src/php-functions.coffee` and deploys the full documentation in
`tmp/php-chunked-xhtml/`.  File `tmp/php-chunked-xhtml/search-index.json`
is involved from `src/php-grammar.coffee` to create builtin class lists.

Once having run the initial make, the environment is ready to build php.cson
each time on running the package tests.
