

var chunkFile = '/Users/nec/github/dash-live-loop/out/chick-video_dash23.m4s'
var chunkCount = 120;

var fs = require('fs');
var util = require('util');
var isoBmff = require('iso-bmff');


var chunkStream = fs.createReadStream(chunkFile, { 
	flags: 'r',
 	encoding: null,
 	fd: null,
 	mode: 0666,
 	autoClose: true
});

var unboxing = new isoBmff(function (err, data) {
	console.log(data)
})






chunkStream
	.pipe(unboxing)
	






