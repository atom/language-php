<?php

use PhpParser\Node;

require 'vendor/autoload.php';
require 'inc/Indexer.php';
require 'inc/IndexerNodeTraverserVisitor.php';

$indexer = new Indexer( realpath( $argv[1] ) );

$indexer->index();

$output = array(
	'.source.php' => array(
		'editor' => array(
			'commentStart' => '// ',
		),
		'autocomplete' => array(
			'symbols' => array(
				'' => array(
					'suggestions' => array_merge( $indexer->index['functions'], $indexer->index['constants'], $indexer->index['classes'] ),
				),
			),
		),
	),
	'.source.php .meta.array.php' => array(
		'editor' => array(
			'decreaseIndentPattern' => '(?x)
	    ^ (.* \\*/)? \\s*
	    (\\)+)
	',
		),
	),
	'.source.php:not(.string)' => array(
		'editor' => array(
			'increaseIndentPattern' => '(?x)
	    (   \\{ (?! .+ \\} ) .*
	    |   \\(
	    |   (\\[)
	    |   ((else)?if|else|for(each)?|while|switch) .* :
	    )   \\s* (/[/*] .*)? $',
			'decreaseIndentPattern' => '(?x)
	    ^ (.* \\*/)? \\s*
	    (
	        (\\})         |
	        (\\)+([;,]|\\s*\\{))    |
	        (\\]\\)*([;,]|$))     |
	        (else:)      |
	        ((end(if|for(each)?|while|switch));)
	    )
	',
		),
	),
	'.text.html.php' => array(
		'editor' => array(
			'nonWordCharacters' => '/\\()"\':,.;<>~!@#%^&*|+=[]{}`?-',
		),
	),
);

if ( ! empty( $argv[2] ) ) {
	file_put_contents( realpath( $argv[2] ), json_encode( $output, JSON_PRETTY_PRINT ) );
} else {
	echo json_encode( $output, JSON_PRETTY_PRINT );
}
