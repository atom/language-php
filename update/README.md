### Update the PHP Language Index

The `settings/language-php.json` file is generated in PHP by using PHP-Parser to index
all the functions, classes and constants. We make use of the [phpstorm-stubs](https://github.com/JetBrains/phpstorm-stubs)
to create the index.

### Installation

```bash
composer install
git clone https://github.com/JetBrains/phpstorm-stubs.git
```

### Generate the `php-language.json`

TO generate the Autocomplete rules from the `phpstorm-stubs` directory:

```bash
php -f generate.php ./phpstorm-stubs/standard/ ../settings/language-php.json
```
