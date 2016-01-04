var acorn = require('acorn');

module.exports = function (source, map) {
	acorn.parse(source, {
        onComment: function (block, text) {
            if (block) {
                this._compilation._commentBlocks.push(text);
            }
        }.bind(this),
		ecmaVersion: 6,
		sourceType: 'module'
    });
    this.cacheable();
    this.callback(null, source, map);
};
