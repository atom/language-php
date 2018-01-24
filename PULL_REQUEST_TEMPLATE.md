### Requirements

* Filling out the template is required. Any pull request that does not include enough information to be reviewed in a timely manner may be closed at the maintainers' discretion.
* All new code requires tests to ensure against regressions

### Description of the Change

Added firstlineMatch support to language-php so that we do not have to rely on the filename's extension for recognizing a php file.

### Alternate Designs

I cannot think of another design for this except maybe falling back to the "file" command which would be a problem on non-IX systems.  

### Benefits

PHP files are recognized not only by extension but also by content.

### Possible Drawbacks

Due to my limited (just starting with atom and php) knowledge, the firstlineMatch might not be perfect.

### Applicable Issues

Not an issue but a [conversation](https://discuss.atom.io/t/better-language-recognition-please/51795).
