var _ = require('underscore'),
    path = require('path'),
    Project = require('../shared/models').Project,
    tilelive = new (require('tilelive').Server)(require('tilelive-mapnik'));

module.exports = function(app, settings) {
    app.enable('jsonp callback');

    // Route middleware. Load a project model.
    var loadProject = function(req, res, next) {
        res.project = new Project({id: req.param('id')});
        res.project.fetch({
            success: function(model, resp) {
                next();
            },
            error: function(model, resp) {
                next(new Error('Invalid model'));
            }
        });
    };

    // GET endpoint for TMS tile image requests. Uses `tilelive.js` Tile API.
    //
    // - `:id` String, project model id.
    // - `:z` Number, zoom level of the tile requested.
    // - `:x` Number, x coordinate of the tile requested.
    // - `:y` Number, y coordinate of the tile requested.
    // - `*` String, file format of the tile requested, e.g. `png`, `jpeg`.
    app.get('/1.0.0/:id/:z/:x/:y.(png8|png|jpeg[\\d]+|jpeg|grid.json)', loadProject, function(req, res, next) {
        req.params.datasource = path.join(
            settings.files,
            'project',
            res.project.id,
            res.project.id + '.mml'
        );
        req.params.format = req.params[0];
        if (req.params.format === 'grid.json') {
            var interactivity = res.project.get('_interactivity');
            req.params.layer = interactivity.layer;
            req.params.fields = res.project.formatterFields();
        }
        tilelive.serve(req.params, function(err, data) {
            if (!err) {
                // Using `apply()` here allows the tile rendering function to
                // send custom headers without access to the request object.
                data[1] = _.extend(settings.header_defaults, data[1]);
                res.send.apply(res, data);
            } else {
                next(err);
            }
        });
    });

    // Interaction layer.json endpoint.
    app.get('/1.0.0/:id/layer.json', loadProject, function(req, res, next) {
        if (!res.project.get('_interactivity') && !res.project.get('_legend')) {
            res.send('Formatter not found', 404);
        } else {
            var json = {
                formatter: res.project.formatterJS(),
                legend: res.project.get('_legend')
            };
            res.send(json);
        }
    });
};