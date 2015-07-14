view = Backbone.View.extend();

view.prototype.events = {
    'change select': 'update',
    'keyup input': 'update',
    'keyup textarea': 'update',
    'change input': 'update',
    'change textarea': 'update'
};

view.prototype.initialize = function(options) {
    _(this).bindAll('render', 'attach', 'update');
    this.render().attach();
};

view.prototype.render = function() {
    if (this.$('.tooltips').size()) return this;
    this.$('.content').html(templates.Templates(this.model));
    return this;
};

view.prototype.attach = function() {
    var id = this.$('select').val();
    var layer = this.model.get('Layer').get(id);

    // If no layer hide tokens.
    if (!layer) {
        this.$('.tokens').empty();
        this.$('.requires-tokens').attr('disabled', true);
        this.$('.description.toggler').removeClass('warning');
        this.$('#layer-info').html('<small>Layer to use for interaction data</small>');
        return true;
    }

    var update = _(function(model) {
        var fields = _(model.get('fields')).keys();
        this.$('.tokens').html(_(fields).map(function(f) {
            return '<code>{{{' + f + '}}}</code>';
        }).join(' '));
        this.$('.requires-tokens').attr('disabled', false);
        $(this.el).removeClass('loading').removeClass('restartable');
    }).bind(this);

    var layer_attr = layer.get('Datasource');
    if (layer_attr.type === 'postgis' && !layer_attr.key_field) {
        this.$('#layer-info').html('<span class="warning-text"><strong>Warning</strong>: This PostGIS layer does not have a <strong>Unique key field</strong> defined. This is required for valid MBTiles exports.</span>');
        this.$('.description.toggler').addClass('warning');
    } else {
        this.$('#layer-info').html("<small>Layer to use for interaction data</small>");
        this.$('.description.toggler').removeClass('warning');
    }

    // Cache the datasource model to `this.datasource` so it can
    // be used to live render/preview the formatters.
    if (!this.datasource || this.datasource.id !== layer.get('id')) {
        $(this.el).addClass('loading').addClass('restartable');
        var attr = _(layer_attr).chain()
            .clone()
            .extend({
                id: layer.get('id'),
                project: this.model.get('id'),
                srs: layer.get('srs')
            })
            .value();
        this.datasource = new models.Datasource(attr);
        this.datasource.fetchFeatures({
            success: update,
            error: _(function(model, err) {
                if ($(this.el).hasClass('restarting')) return false;
                $(this.el).removeClass('loading').removeClass('restartable');
                new views.Modal(err);
            }).bind(this)
        });
    } else {
        update(this.datasource);
    }
};

view.prototype.update = function(ev) {
    var target = $(ev.currentTarget);
    var key = target.attr('name');
    var deepSet = function(attr, keys, val) {
        if (!keys.length) return val;
        var key = keys.shift();
        attr[key] = deepSet(attr[key]||{}, keys, val);
        return attr;
    };
    if (!key) return;
    if (key === 'interactivity.layer') this.attach();

    var attr = {
        legend: this.model.get('legend') || '',
        interactivity: _({}).extend(this.model.get('interactivity'))
    };
    this.model.set(deepSet(attr, key.split('.'), target.val()));
};

// Hook in to project view with an augment.
views.Project.augment({
    events: { 'click a[href=#templates]': 'templates' },
    templates: function() {
        new view({ model: this.model, el:$('#drawer') })
    },
    render: function(p) {
        p.call(this);
        this.$('.palette').prepend("<a title='Legends' class='drawer' href='#templates'><span class='icon reverse tooltip'>Templates</span></a>");
        return this;
    }
});

