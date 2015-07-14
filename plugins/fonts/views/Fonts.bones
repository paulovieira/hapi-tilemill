view = Backbone.View.extend();

view.prototype.events = {
    'click a.font': 'insert',
    'keydown a.font input': 'keydown'
};

view.prototype.initialize = function(options) {
    _(this).bindAll('insert', 'keydown');
//    this.render();
};

view.prototype.render = function() {
    if (this.$('.fonts').size()) return this;
    var groups = {};
    var fonts = _(abilities.fonts).map(function(font) {
        var group = font.toUpperCase().charCodeAt(0);
        groups[group] = groups[group] || 0;
        groups[group]++
        return { name:font, group:group };
    });
    this.$('.content').html(templates.Fonts({
        fonts: fonts,
        groups: groups
    }));
    return this;
};

// Select font text.
view.prototype.insert = function(ev) {
    var target = $(ev.currentTarget);
    target.addClass('insert').siblings().removeClass('insert');
    $('input', target).select();
    return false;
};

// Catch non-action keypress (e.g. Ctrl-C) events when a font input field
// is selected to prevent users from tampering with a font name.
view.prototype.keydown = function(ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    return false;
}

// Hook in to projet view with an augment.
views.Project.augment({
    events: { 'click a[href=#fonts]': 'fonts' },
    fonts: function() {
        new view({ el:$('#drawer') })
    },
    render: function(p) {
        p.call(this);
        // this.$('.palette').prepend("<a class='drawer' href='#fonts'><span class='icon reverse fonts'>Fonts</span></a>");
        return this;
    }
});

