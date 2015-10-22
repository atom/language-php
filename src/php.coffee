{makeGrammar} = require 'atom-syntax-tools'
path = require "path"
fs = require "fs"
Q = require "q"

# phpSearchIndexFileName = path.resolve __dirname, "..", "search-index.json"

createGrammarsCson = (grammarInput) ->
  grammarInput = require('./php-grammar')
  makeGrammar grammarInput, path.resolve(__dirname, "..", "grammars", "php.cson")


if require.main is module
  createGrammarsCson()

module.exports = {createGrammarsCson}

#
#
# {CompositeDisposable} = require 'atom'
#
# module.exports = LanguagePhp =
#   activate: (state) ->
#     @subscriptions = new CompositeDisposable
#     @subscriptions.add atom.grammars.addGrammar grammar
#
#   deactivate: ->
#     @subscriptions.dispose()
#
#   serialize: ->
