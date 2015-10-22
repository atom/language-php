SHELL = bash

grammars/php.cson: src/php-functions.coffee src/php-constants.coffee
	coffee src/php.coffee

tmp/php_manual_en.tar.gz:
	curl -L http://de2.php.net/get/php_manual_en.tar.gz/from/this/mirror -o $@

tmp/php_chunked_xhtml/index.html: tmp/php_manual_en.tar.gz
	cd tmp && tar xzf ../$<

src/php-functions.coffee: tmp/php_chunked_xhtml/index.html Makefile
	echo "# do not make changes here, it is generated from php manual" > $@
	echo "{makeWords} = require 'atom-syntax-tools'" >> $@
	echo >> $@
	echo "module.exports =" >> $@
	CURRENT="" ; \
	cat tmp/php-chunked-xhtml/function.* | perl -n -e 'if (m{div class="up"><a href="(ref|cubrid.*?|.*?)\.([\w\-]+)\.}) { $$module = $$2 }; m{h1 class="refname">([^<]*)} && print "$$module $$1\n"' \
	| grep -v "::" | sort | while read MODULE FUNCTION ; do \
		if [[ "$$MODULE" != "$$CURRENT" ]] ; then \
			if [[ -n "$$CURRENT" ]] ; then \
				echo "  \"\"\"" >> $@ ;\
				echo >> $@ ;\
			fi ; \
			echo "  '$$MODULE': makeWords \"\"\"" >> $@ ;\
			CURRENT=$$MODULE ;\
		fi ;\
		echo "    $$FUNCTION" >> $@ ;\
	done
	echo "  \"\"\"" >> $@


src/php-constants.coffee: tmp/php_chunked_xhtml/index.html Makefile
	echo "# do not make changes here, it is generated from php manual" > $@
	echo "{makeWords} = require 'atom-syntax-tools'" >> $@
	echo >> $@
	echo "module.exports =" >> $@
	CURRENT="" ; \
	grep "^[ ]*<strong><code>" tmp/php-chunked-xhtml/*constants* | perl -n -e 'm{^.*/(.*?)\.constants.*<code>([^<]*?)</code>} && print "$$1 $$2\n"' | sort | while read MODULE FUNCTION ; do \
		if [[ "$$MODULE" != "$$CURRENT" ]] ; then \
			if [[ -n "$$CURRENT" ]] ; then \
				echo "  \"\"\"" >> $@ ;\
				echo >> $@ ;\
			fi ; \
			echo "  '$$MODULE': makeWords \"\"\"" >> $@ ;\
			CURRENT=$$MODULE ;\
		fi ;\
		echo "    $$FUNCTION" >> $@ ;\
	done
	echo "  \"\"\"" >> $@

#src/php-builtin-classes.coffee: Makefile

#load json:
#http://php.net/manual/en/search-index.json
