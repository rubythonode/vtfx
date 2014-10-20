var fs = require('fs');
var tape = require('tape');
var vtfx = require('../index.js');
var beforepbf = fs.readFileSync(__dirname + '/before.pbf');
var mapnik = require('mapnik');
var UPDATE = process.env.UPDATE;

tape('before', function(t) {
    var vt = new mapnik.VectorTile(14,2621,6331);
    vt.setData(beforepbf);
    vt.parse();
    jsonEqual(vt.toGeoJSON('poi_label'), __dirname + '/before-poi_label.json', t);

    t.end();
});

tape('labelgrid', function(t) {
    vtfx(beforepbf, {'poi_label':[{id:'labelgrid', size:1024}]}, function(err, afterpbf) {
        pbfEqual(afterpbf, __dirname + '/after-labelgrid-poi_label.pbf', t);

        var vt = new mapnik.VectorTile(14,2621,6331);
        vt.setData(afterpbf);
        vt.parse();
        jsonEqual(vt.toGeoJSON('poi_label'), __dirname + '/after-labelgrid-poi_label.json', t);

        t.end();
    });
});

tape('orderby number', function(t) {
    vtfx(beforepbf, {'poi_label':[{id:'orderby', field:'scalerank', sort: 1}]}, function(err, afterpbf) {
        pbfEqual(afterpbf, __dirname + '/after-orderby-number-poi_label.pbf', t);

        var vt = new mapnik.VectorTile(14,2621,6331);
        vt.setData(afterpbf);
        vt.parse();
        jsonEqual(vt.toGeoJSON('poi_label'), __dirname + '/after-orderby-number-poi_label.json', t);

        t.end();
    });
});

tape('orderby string', function(t) {
    vtfx(beforepbf, {'poi_label':[{id:'orderby', field:'name', sort: -1}]}, function(err, afterpbf) {
        pbfEqual(afterpbf, __dirname + '/after-orderby-string-poi_label.pbf', t);

        var vt = new mapnik.VectorTile(14,2621,6331);
        vt.setData(afterpbf);
        vt.parse();
        jsonEqual(vt.toGeoJSON('poi_label'), __dirname + '/after-orderby-string-poi_label.json', t);

        t.end();
    });
});

tape('linelabel', function(t) {
    vtfx(beforepbf, {'road':[{id:'linelabel', labelfield:'class'}]}, function(err, afterpbf) {
        pbfEqual(afterpbf, __dirname + '/after-linelabel-road.pbf', t);

        var vt = new mapnik.VectorTile(14,2621,6331);
        vt.setData(afterpbf);
        vt.parse();
        jsonEqual(vt.toGeoJSON('road'), __dirname + '/after-linelabel-road.json', t);

        t.end();
    });
});

tape('test parameters', function(t) {
    var params = [
        {id:'drop', limit: 100},
        {id:'orderby', field: 'scalerank', sort: -1},
        {id:'linelabel', labelfield:'class'},
        {id:'labelgrid', size:1024}
    ]
    for (var i = 0; i < params.length; i++){
        var option = params[i];
        var parameters = vtfx.processors[option.id].parameters;
        console.log('##'+option.id);
        t.equal(parameters.name, option.id)
        delete option.id;

        t.equal(Object.keys(option).length, parameters.options.length);
        for (var ix in parameters.options){
            t.equal(parameters.options[ix].type, typeof option[parameters.options[ix].field]);
            // if (parameters.options[i].options){
            //     for (var ix in parameters.options[i].options){
            //         // t.equal(typeof Object.keys(parameters.options[i].options[ix])[0], parameters.options[i].type) 
            //     }
            // }
        }

        t.ok(parameters.display, 'display field exists');
        t.ok(parameters.description, 'description field exists');
    }
    t.end();
});


function pbfEqual(buffer, filepath, assert) {
    if (UPDATE) fs.writeFileSync(filepath, buffer);
    assert.deepEqual(buffer, fs.readFileSync(filepath));
}

function jsonEqual(data, filepath, assert, encoded) {
    if (encoded !== false){
        if (Array.isArray(data.features)) {
            for (var i = 0; i < data.features.length; i++) {
                data.features[i].geometry.coordinates = precision(data.features[i].geometry.coordinates);
            }
        }
    }
    if (UPDATE) fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    assert.deepEqual(data, JSON.parse(fs.readFileSync(filepath)));
}

function precision(coords) {
    if (typeof coords[0] === 'number') {
        for (var i = 0; i < coords.length; i++) {
            coords[i] = parseFloat(coords[i].toFixed(10));
        }
    } else if (Array.isArray(coords[0])) {
        for (var i = 0; i < coords.length; i++) {
            coords[i] = precision(coords[i]);
        }
    } else {
        throw new Error('Unhandled coords type ' + (typeof coords[0]));
    }
    return coords;
}

function encodePBF(pbf) {
    var protobuf = require('protocol-buffers');
    var path = require('path');

    // Gross!
    var proto = fs.readFileSync(path.dirname(require.resolve('mapnik-vector-tile')) + '/proto/vector_tile.proto', 'utf8');
    proto = proto.replace('package mapnik.vector;', '');
    proto = proto.replace('optional uint64 id = 1;', 'optional int64 id = 1;');
    proto = proto.replace('option optimize_for = LITE_RUNTIME;', '');
    proto = proto.replace('extensions 8 to max;', '');
    proto = proto.replace('extensions 16 to max;', '');
    proto = proto.replace('extensions 16 to 8191;', '');
    return mvt = protobuf(proto);
}

