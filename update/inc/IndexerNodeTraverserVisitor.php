<?php

use PhpParser\Node;
use PhpParser\NodeVisitorAbstract;
use phpDocumentor\Reflection\DocBlock;

class IndexerNodeTraverserVisitor extends NodeVisitorAbstract {

	public function __construct( Indexer $indexer ) {
		$this->indexer = $indexer;
	}

	public function leaveNode( Node $node ) {
		//
		if ( $node instanceof Node\Stmt\Function_ ) {
			$this->indexer->add_function( $node );
		}
		if ( $node instanceof Node\Expr\FuncCall && $node->name instanceof Node\Name && 'define' === (string) $node->name ) {
			$this->indexer->add_constant( $node );
		}
		if ( $node instanceof Node\Stmt\Class_ ) {
			$this->indexer->add_class( $node );
		}
	}
}
