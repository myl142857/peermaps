#!/usr/bin/env node

var fs = require('fs');
var through = require('through2');
var file = __dirname + '/../data/planet-140528.osm.pbf.torrent';
var torrentFile = fs.readFileSync(file);
var geohash = require('geohasher');
var parseOSM = require('osm-pbf-parser');

var level = require('level');
var db = level(__dirname + '/../data/hashes.db', { valueEncoding: 'json' });
var offset = parseInt(process.argv[2] || 0);

var torrentStream = require('torrent-stream');
var engine = torrentStream(torrentFile, { tmp: __dirname + '/../data' });
engine.once('ready', function () {
    var rs = engine.files[0].createReadStream({ start: offset });
    var topts = { highWaterMark: 16 };
    var osm = parseOSM();
    var start = 0;
    rs.pipe(osm).pipe(through.obj(topts, function (row, enc, next) {
        console.log(row.type, start + offset, osm._offset + offset);
        start = osm._offset;
        
        if (row.type === 'nodes') {
            row.nodes.forEach(function (r) {
                var h = geohash.encode(r.lat, r.lon) + '!' + r.id;
                db.put(h, r);
            });
        }
        next();
    }));
});
