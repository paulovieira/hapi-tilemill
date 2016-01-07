var assert = require('assert');
var fs = require('fs');
var path = require('path');
var diff = require('difflet')({ indent : 2 });
var core;
var tile;

function readJSON(name) {
    var json = fs.readFileSync(path.resolve(__dirname + '/fixtures/' + name + '.json'), 'utf8');
    return JSON.parse(json);
}

describe('datasource', function() {

before(function(done) {
    require('./support/start').startPostgis(function(command) {
        core = command.servers['Core'];
        tile = command.servers['Tile'];
        done();
    });
});

after(function(done) {
    core.close();
    tile.close();
    done();
});

it('GET sqlite', function(done) {
    assert.response(tile,
        { url: '/datasource/world?file=' + encodeURIComponent(__dirname + '/fixtures/countries.sqlite') + '&table=countries&id=world&type=sqlite&project=demo_01&srs=%2Bproj%3Dmerc+%2Ba%3D6378137+%2Bb%3D6378137+%2Blat_ts%3D0.0+%2Blon_0%3D0.0+%2Bx_0%3D0.0+%2By_0%3D0+%2Bk%3D1.0+%2Bunits%3Dm+%2Bnadgrids%3D%40null+%2Bwktext+%2Bno_defs+%2Bover' },
        { status: 200 },
        function(res) {
            var body = JSON.parse(res.body);
            var datasource = readJSON('datasource-sqlite');
            datasource.url = __dirname + '/fixtures/countries.sqlite';
            assert.equal(datasource.id, body.id);
            assert.equal(datasource.project, body.project);
            assert.deepEqual(datasource.fields, body.fields);
            assert.deepEqual(datasource.features, body.features);
            assert.equal(datasource.type, body.type);
            assert.equal(datasource.geometry_type, body.geometry_type);
            assert.equal(datasource.extent, body.extent);
            done();
        }
    );
});

it('GET shapefile datasource', function(done) {
    assert.response(tile,
        { url: '/datasource/world?file=http%3A%2F%2Ftilemill-data.s3.amazonaws.com%2Fworld_borders_merc.zip&type=shape&id=world&project=demo_01' },
        { status: 200 },
        function(res) {
            var body = JSON.parse(res.body);
            var datasource = readJSON('datasource-shp');
            assert.equal(datasource.id, body.id);
            assert.equal(datasource.project, body.project);
            assert.deepEqual(datasource.fields, body.fields);
            assert.deepEqual(datasource.features, body.features);
            assert.equal(datasource.type, body.type);
            assert.equal(datasource.geometry_type, body.geometry_type);
            done();
        }
    );
});

it('GET shapefile datasource with features', function(done) {
    assert.response(tile,
        { url: '/datasource/world?file=http%3A%2F%2Ftilemill-data.s3.amazonaws.com%2Fworld_borders_merc.zip&type=shape&id=world&project=demo_01&features=true' },
        { status: 200 },
        function(res) {
            var body = JSON.parse(res.body);
            var datasource = readJSON('datasource-shp-features');
            assert.equal(datasource.id, body.id);
            assert.equal(datasource.project, body.project);
            assert.deepEqual(datasource.fields, body.fields);
            assert.deepEqual(datasource.features, body.features);
            assert.equal(datasource.type, body.type);
            assert.equal(datasource.geometry_type, body.geometry_type);
            done();
        }
    );
});

it('GET postgis datasource', function(done) {
    assert.response(tile,
        { url: '/datasource/postgis?table%3D%2210m-admin-0-boundary-lines-land%22&key_field=&geometry_field=&extent=-15312095%2C-6980576.5%2C15693558%2C11093272&type=postgis&dbname=tilemill_test&id=postgis&srs=%2Bproj%3Dmerc+%2Ba%3D6378137+%2Bb%3D6378137+%2Blat_ts%3D0.0+%2Blon_0%3D0.0+%2Bx_0%3D0.0+%2By_0%3D0+%2Bk%3D1.0+%2Bunits%3Dm+%2Bnadgrids%3D%40null+%2Bwktext+%2Bno_defs+%2Bover&project=demo_01' },
        { status: 200 },
        function(res) {
            var body = JSON.parse(res.body);
            var datasource = readJSON('datasource-postgis');
            assert.equal(datasource.id, body.id);
            assert.equal(datasource.project, body.project);
            assert.deepEqual(datasource.fields, body.fields);
            assert.deepEqual(datasource.features, body.features);
            assert.equal(datasource.type, body.type);
            assert.equal(datasource.geometry_type, body.geometry_type);
            assert.equal(datasource.extent, body.extent);
            done();
        }
    );
});

it('GET postgis datasource with features', function(done) {
    assert.response(tile,
        { url: '/datasource/postgis?table%3D%2210m-admin-0-boundary-lines-land%22&key_field=&geometry_field=&extent=-15312095%2C-6980576.5%2C15693558%2C11093272&type=postgis&dbname=tilemill_test&id=postgis&srs=%2Bproj%3Dmerc+%2Ba%3D6378137+%2Bb%3D6378137+%2Blat_ts%3D0.0+%2Blon_0%3D0.0+%2Bx_0%3D0.0+%2By_0%3D0+%2Bk%3D1.0+%2Bunits%3Dm+%2Bnadgrids%3D%40null+%2Bwktext+%2Bno_defs+%2Bover&project=demo_01&features=true' },
        { status: 200 },
        function(res) {
            var body = JSON.parse(res.body);
            var datasource = readJSON('datasource-postgis-features');
            assert.deepEqual(datasource.fields, body.fields, diff.compare(datasource.fields, body.fields));
            assert.deepEqual(datasource.features, body.features, diff.compare(datasource.features, body.features));
            done();
        }
    );
});

});
