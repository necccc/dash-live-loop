
var express = require('express');
var app = express();
var fs = require('fs');
var isoBmff = require('iso-bmff');
var _ = require('lodash')


// some defaults for this media
var setup  = {
	video: {
		chunks: 119,
		length: 2910720
	},
	audio: {
		chunks: 114,
		length: 10039296
	}
}

function getData(request, response) {

	var segment = request.params.segment;
	var segmentId = segment.match(/(\d+)/)[0];
	var segmentType = /video/.test(segment) ? 'video' : 'audio';


	var loopCount = Math.floor(segmentId / setup[segmentType].chunks);
	var currentSegment = segmentId % setup[segmentType].chunks;

	var chunkFile = './media/'  + segment.replace(/(\d+)/, '') + currentSegment +'.m4s';

	var chunkStream = fs.createReadStream(chunkFile, {
		flags: 'r',
		encoding: null,
		fd: null,
		mode: 0666,
		autoClose: true
	});

	chunkStream.on('error', function () {
		response.sendStatus(404);
	});


	var unboxing = new isoBmff.Parser(function (err, data) {
		if (err) {
			return response.sendStatus(500);
		}

		response.type('application/json');

		var sidx = _.find(data, {'type': 'sidx'});

		var earliestPresentationTime = sidx.content.earliestPresentationTime

		console.log();


		var foo = {
			segmentId: segmentId,
			segmentType: segmentType,
			loop: loopCount,

			earliestPresentationTime: earliestPresentationTime,
			startTime: setup[segmentType].length * loopCount + earliestPresentationTime
		}


		response.send(JSON.stringify(foo))
	});

	chunkStream
		.pipe(unboxing);
}









app.get('/', function (req, res) {
	res.send('Hello World!')
})

app.get('/chunk/:segment.m4s',getData);

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Example app listening at http://%s:%s', host, port)
});