module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parser": "babel-eslint",
    "parserOptions": {
        "sourceType": "module"
    },
    "plugins": [
    	"html"
    ],
    "rules": {
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "capitalized-comments": 0,
		"eol-last": 0,
		"no-trailing-spaces": 0,
		"no-undef": 0,
		"no-unused-vars": 0,
		"no-unused-expressions": 0,
		"arrow-parens": 0,
		"no-empty-pattern": 0,
		"comma-dangle": 0,
		"object-curly-spacing": 0,
		"func-name-matching": 0,
		"func-names": 0,
		"spaced-comment": 0,
		"no-use-before-define": 0,
		"no-console": 0
    }
};