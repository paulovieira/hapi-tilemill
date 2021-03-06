var fs = require('fs');
var path = require('path');
var Step = require('step');
var env = process.env.NODE_ENV || 'development';

server = Bones.Server.extend({});

server.prototype.initialize = function(app) {
    this.config = app.config;
    _(this).bindAll(
        'index',
        'abilities',
        'projectPoll',
        'projectFlush',
        'projectDebug',
        'projectXML'
    );

    // Process endpoints.
    this.get('/status', this.status);
    this.post('/restart', this.restart);

    this.get('/', this.index);
    this.get('/assets/tilemill-clima/js/abilities.js', this.abilities);

    // Simplified GET endpoint for retrieving config values by key.
    // Used by the native Cocoa app to retrieve specific settings.
    this.get('/api/Key/:key', this.getKey);

    // Endpoint for checking for new TileMill version
    this.get('/api/updatesVersion', this.updatesVersion);

    // Custom Project sync endpoints.
    this.get('/api/Project/:id.xml', this.projectXML);
    this.get('/api/Project/:id.debug', this.projectDebug);
    this.get('/api/Project/:id/:time(\\d+)', this.projectPoll);
    this.del('/api/Project/:id/:layer', this.projectFlush);

    // Add static provider to download exports.
    this.use('/export/download', _(middleware['static'](
        path.join(this.config.files, 'export'),
        { maxAge: env === 'production' ? 3600000 : 0 } // 1 hour
    )).wrap(function(p, req, res, next) {
        res.header('Content-Disposition', 'attachment');
        return p(req, res, next);
    }));

    // Add static provider for manual images.
    this.use('/manual', middleware['static'](
        path.join(__dirname, '..', 'pages', 'manual'),
        { maxAge: env === 'production' ? 3600000 : 0 } // 1 hour
    ));
};

server.prototype.index = function(req, res, next) {
    res.send(templates['App'](this.config));
};

server.prototype.abilities = function(req, res, next) {
    var js = 'var abilities = ' + JSON.stringify(Bones.plugin.abilities) + ';';
    res.send(js, {'Content-type': 'text/javascript'});
};

server.prototype.projectPoll = function(req, res, next) {
    var model = new models.Project({
        id: req.param('id'),
        _updated: req.param('time')
    });
    model.sync('mtime', model, res.send.bind(res), next);
};

server.prototype.projectFlush = function(req, res, next) {
    if (!req.param('url')) return next(new Error('req.query.url required.'));

    var model = new models.Project(
        { id: req.param('id') },
        { layer: req.param('layer'), url: req.param('url') }
    );
    model.sync('flush', model, res.send.bind(res), next);
};

server.prototype.projectXML = function(req, res, next) {
    var model = new models.Project({ id: req.param('id') });
    model.fetch({
        success: function(model, resp) {
            model.localize(model.toJSON(), function(err) {
                if (err) return next({"message":err.message});
                // https://github.com/mapbox/tilemill/issues/1421
                res.header('Content-Disposition', 'attachment');
                res.send(model.xml, {'content-type': 'text/xml'});
            });
        },
        error: function(model, resp) { next(resp); }
    });
};

server.prototype.projectDebug = function(req, res, next) {
    var model = new models.Project({ id: req.param('id') });
    model.fetch({
        success: function(model, resp) {
            model.localize(model.toJSON(), function(err) {
                if (err) return next({"message":err.message});
                res.send({
                    debug: model.debug,
                    mml: model.mml,
                    xml: model.xml
                });
            });
        },
        error: function(model, resp) { next(resp); }
    });
};

server.prototype.status = function(req, res, next) {
    res.send({});
};

server.prototype.restart = function(req, res, next) {
    res.send({});
    // @TODO don't exit if there are exports running?
    // or... find a way to attach exports to the root process?
    console.warn('Stopping core server...');
    process.exit();
};

server.prototype.getKey = function(req, res, next) {
    var key = req.param('key');
    if (key in Bones.plugin.config)
        return res.send(Bones.plugin.config[key].toString());
    if (key in Bones.plugin.abilities[key])
        return res.send(Bones.plugin.abilities[key].toString());
    return next(new Error.HTTP(404));
};

server.prototype.updatesVersion = function(req, res, next) {
    var settings = Bones.plugin.config;

    // Config values to save.
    var attr = {};

    // Skip latest TileMill version check if disabled or
    // we've checked the npm repo in the past 24 hours.
    var skip = !settings.updates || (settings.updatesTime > Date.now() - 864e5);
    var npm = require('npm');
    Step(function() {
        if (skip) return this();

        console.warn('Checking for new version of TileMill...');
        var opts = settings.httpProxy ? {proxy: settings.httpProxy} : {};
        npm.load(opts, this);
    }, function(err) {
        if (skip || err) return this(err);

        npm.localPrefix = path.join(process.env.HOME, '.tilemill');
        npm.commands.view(['tilemill'], true, this);
    }, function(err, resp) {
        if (skip || err) return this(err);

        if (!_(resp).size()) throw new Error('Latest TileMill package not found.');
        if (!_(resp).toArray()[0].version) throw new Error('No version for TileMill package.');
        console.warn('Latest version of TileMill is %s.', _(resp).toArray()[0].version);
        attr.updatesVersion = _(resp).toArray()[0].version;
        attr.updatesTime = Date.now();
        this();
    }, function(err) {
        // Continue despite errors but log them to the console.
        if (err) console.error(err);
        // Save any config attributes.
        if (_(attr).keys().length) (new models.Config).save(attr, {
            error: function(m, err) { console.error(err); }
        });
        // Send the current updates settings and version
        res.send({
            updates: settings.updates,
            updatesVersion: attr.updatesVersion || settings.updatesVersion
        });
    });
}
