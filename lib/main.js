exports.activate = function() {
  if (!atom.grammars.addInjectionPoint) return

  // inject source.php into text.html.php
  atom.grammars.addInjectionPoint('text.html.php', {
    type: 'php',
    language () { return 'php' },
    content (php) { return php }
  })

  // inject html into text.html.php
  atom.grammars.addInjectionPoint('text.html.php', {
    type: 'template',
    language () { return 'html' },
    content (node) { return node.descendantsOfType('content') }
  })

  // inject phpDoc comments into PHP comments
  atom.grammars.addInjectionPoint('source.php', {
    type: 'comment',
    language (comment) {
      if (comment.text.startsWith('/**') && !comment.text.startsWith('/***')) {
        return 'phpdoc'
      }
    },
    content (comment) { return comment }
  })
}
