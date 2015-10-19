var invariant = require('invariant');

function TrackDocsPlugin(options) {
    this.options = options || {};
}

TrackDocsPlugin.prototype.apply = function(compiler) {
    var options = this.options;
    compiler.plugin("compilation", function(compilation) {
        compilation._commentBlocks = [];

        compiler.plugin('should-emit', function(compiler) {
            var out = parse(compilation._commentBlocks);

            compiler.assets[options.filename] = {
                source: function() {
                    return out;
                },
                size: function() {
                    return out.length;
                }
            };
        });
    });
};

function parse(commentBlocks) {
    var cookies = {};
    var endpoints = {};

    function tokenize(text) {
        return text.replace(/^\*+/g, '').replace(/(?:\s|\t)+?\*(\s|\t)+?/g, ' ').split(/(?:\n|\s)+/);
    }

    function parseCookie(tokens) {
        var name = tokens.shift();
        var buffer = [];
        var token;
        var expiration;
        var domain;

        invariant(name !== undefined, 'Cookies require a name');

        while (tokens.length) {
            token = tokens.shift();
            
            switch(token) {
                case '@expiration':
                    expiration = tokens.shift();
                    break;
                case '@domain':
                    domain = tokens.shift();
                    break;
                default:
                    buffer.push(token);
                    break;
            }
        }

        return {
            description: buffer.join(' '),
            expiration: expiration,
            domain: domain,
            name: name
        };
    }

    function parseEndpoint(tokens) {
        var name = tokens.shift();

        invariant(name, '@endpoint requires a name');

        return {
            name: name,
            description: tokens.join(' ')
        };
    }

    function parseQuery(tokens) {
        var names = tokens.shift();
        var queryEndpoints = [];
        var buffer = [];
        var duplicate = false;
        var token;

        names.split(',').forEach(function (name) {
            var index = name.indexOf('.');
            var endpoint = name.substring(0, index);
            var param = name.substring(index + 1)
            queryEndpoints.push({endpoint: endpoint, param: param});
        });

        while (tokens.length) {
            token = tokens.shift();
            if (token === '@duplicate') {
                duplicate = true;
            }
            else {
                buffer.push(token);
            }
        }

        return {
            description: buffer.join(' '),
            endpoints: queryEndpoints,
            duplicate: duplicate
        };
    }

    function getOrCreateEndpoint(name) {
        if (!endpoints[name]) {
            endpoints[name] = {
                name: name,
                params: {},
                description: null
            };
        }

        return endpoints[name];
    }

    commentBlocks.forEach(function (text) {
        var tokens = tokenize(text);
        var token;
        var parsed;
        var endpoint;

        while (tokens.length) {
            token = tokens.shift();
            
            switch (token) {
                case '@query':
                    parsed = parseQuery(tokens);

                    invariant(
                        parsed.endpoints.length > 0,
                        '@query requires a list of endpoint.param values'
                    );

                    if (!parsed.duplicate) {
                        parsed.endpoints.forEach(function (queryEndpoint) {
                            endpoint = getOrCreateEndpoint(queryEndpoint.endpoint);
                            endpoint.params[queryEndpoint.param] = parsed.description;
                        });
                    }

                    break;
                case '@endpoint':
                    parsed = parseEndpoint(tokens);
                    endpoint = getOrCreateEndpoint(parsed.name);
                    endpoint.description = parsed.description;

                    break;
                case '@cookie':
                    parsed = parseCookie(tokens);
                    
                    invariant(
                        parsed.description,
                        '@cookie requires a description for %s',
                        parsed.name
                    );

                    invariant(
                        parsed.domain,
                        '@cookie requires a domain for %s',
                        parsed.name
                    );

                    invariant(
                        parsed.expiration,
                        '@cookie requires a expiration for %s',
                        parsed.name
                    );

                    cookies[parsed.name] = parsed;
                    break;
            }
        }
    });

    return JSON.stringify({
        cookies: cookies,
        endpoints: endpoints
    }, null, '\t');
}




module.exports = TrackDocsPlugin;

