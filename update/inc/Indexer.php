<?php

use PhpParser\Error;
use PhpParser\ParserFactory;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\NameResolver;
use PhpParser\Node;
use phpDocumentor\Reflection\DocBlock;

class Indexer {

	public function __construct( $path ) {
		$this->path = $path;
		$this->parser = $parser = ( new ParserFactory )->create( ParserFactory::PREFER_PHP7 );
		$this->traverser = new NodeTraverser;
		$this->traverser->addVisitor( new NameResolver );
		$this->traverser->addVisitor( new IndexerNodeTraverserVisitor( $this ) );
		$this->index = array( 'constants' => array(), 'functions' => array(), 'classes' => array() );
	}

	public function index() {
		$this->status = 'indexing';
		$path = realpath( $this->path );

		$objects = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $path ), RecursiveIteratorIterator::SELF_FIRST );
		$objects = new RegexIterator( $objects, '/^.+\.php$/i', RecursiveRegexIterator::GET_MATCH );
		foreach ( $objects as $name => $object ) {
			$this->index_file( $name );
			echo 'Indexing file ' . str_replace( $path, '', $name ) . "\n";
		}
		$this->status = 'in-sync';
	}

	public function index_file( $file_path ) {
		try {
			$stmts = $this->parser->parse( file_get_contents( $file_path ) );
		} catch ( \Exception $e ) {
			echo 'parse error for file ' . $file_path;
			return;
		}

		$this->traverser->traverse( $stmts );
	}

	public function add_constant( Node\Expr\FuncCall $constant ) {
		$name = $constant->args[0]->value->value;

		if ( empty( $constant->expr->args[1]->value->value ) ) {
			$value = '';
		} else {
			$value = $constant->args[1]->value->value;
		}

		if ( $comments = $constant->getAttribute( 'comments' ) ) {
			$phpdoc = new DocBlock( $comments[0]->getText() );
			$description = str_replace( "\n", ' ', $phpdoc->getShortDescription() );
			$description = ltrim( $description, '/ ' );
			// short circuit @ignore functions
			if ( $phpdoc->hasTag( 'ignore' ) ) {
				return;
			}
		} else {
			$description = '';
		}

		$this->index['constants'][] = array_filter( array(
			'text'             => $name,
			'rightLabel'       => $value,
			'leftLabel'        => $this->get_type_for_node( $constant->args[1]->value ),
			'description'      => $description,
			'type'             => 'constant',
		) );
	}

	public function add_function( Node\Stmt\Function_ $function ) {

		$parameters = array_map( function( $param ) {
			return array(
				'name' => $param->name,
				'default' => ! empty( $param->default ),
				'type' => ltrim( (string) $param->type, '\\' ),
			);
		}, $function->getParams() );

		$description = '';
		$return_types = array();
		$since = '';
		if ( $comments = $function->getAttribute( 'comments' ) ) {
			$phpdoc = new DocBlock( $comments[0]->getText() );
			$description = $phpdoc->getShortDescription();
			$description = strip_tags( $description );
			$description = html_entity_decode( $description );
			$description = ltrim( $description, '/ ' );
			if ( $return = $phpdoc->getTagsByName( 'return' ) ) {
				$return_types = array_map( 'ltrim', explode( '|', $return[0]->getType() ), array( '\\' ) );
			}

			if ( $t = $phpdoc->getTagsByName( 'since' ) ) {
				$since = str_replace( '@since ', '', implode( ' ', $t ) );
			}

			// short circuit @ignore functions
			if ( $phpdoc->hasTag( 'ignore' ) ) {
				return;
			}
		}
		$this->index['functions'][] = array_filter( array(
			'text'             => $function->name,
			'type'             => 'function',
			'description'      => $description . ( $since ? ' ' . 'Since PHP ' . $since : '' ),
			'leftLabel'        => implode( ' | ', $return_types ),
			'rightLabel'       => implode( ' ', array_map( function( $p ) {
				return ( $p['type'] ? $p['type'] . ' ' : '' ) . '$' . $p['name'];
			}, $parameters )),
		) );
	}

	public function add_class( Node\Stmt\Class_ $class ) {

		if ( $class->extends ) {
			$parent = end( $class->extends->parts );
			$parent_namespace = implode( '\\', array_slice( $class->extends->parts, 0, -1 ) );
		} else {
			$parent = '';
			$parent_namespace = '';
		}
		$description = '';

		if ( $comments = $class->getAttribute( 'comments' ) ) {
			$phpdoc = new DocBlock( $comments[0]->getText() );
			$description = $phpdoc->getShortDescription();
			$description = ltrim( $description, '/ ' );
			// short circuit @ignore functions
			if ( $phpdoc->hasTag( 'ignore' ) ) {
				return;
			}
		}

		$this->index['classes'][] = array_filter( array(
			'text'             => $class->name,
			'rightLabel'       => $parent,
			'description'      => $description,
			'type'             => 'class',
		) );
	}

	protected function get_type_for_node( Node $node ) {
		if ( $node instanceof Node\Expr\ConstFetch && in_array( (string) $node->name, array( 'true', 'false' ) ) ) {
			return 'bool';
		}

		if ( $node instanceof Node\Scalar\String_ ) {
			return 'string';
		}

		return '';
	}
}
