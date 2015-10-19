var acorn = require('acorn');

module.exports = function (source, map) {
	acorn.parse(source, {
        onComment: function (block, text) {
            if (block) {
                this._compilation._commentBlocks.push(text);
            }
        }.bind(this)
    });
    this.cacheable();
    this.callback(null, source, map);
};
