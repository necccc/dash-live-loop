
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

function getChunk(request, response) {

	var segment = request.params.segment;
	var segmentId = segment.match(/(\d+)/)[0];
	var segmentType = /video/.test(segment) ? 'video' : 'audio';


	var loopCount = Math.floor(segmentId / setup[segmentType].chunks);
	var currentSegment = segmentId % setup[segmentType].chunks;

	if (currentSegment === 0) {
		loopCount = loopCount > 0 ? loopCount- 1:loopCount;
		currentSegment = setup[segmentType].chunks;
	}

	console.log('chunk request', segmentType, segmentId, loopCount, currentSegment);


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

		var newBaseTime = setup[segmentType].length * loopCount;

		data.forEach(function (d) {

			if (d.type == 'sidx') {
				d.content.earliestPresentationTime += newBaseTime;
			}

			if (d.type == 'moof') {
				d.content.forEach(function (m) {
					if (m.type == 'traf') {
						m.content.forEach(function (t) {
							if (t.type == 'tfdt') {
								t.content.baseMediaDecodeTime += newBaseTime;
							}
						});
					}
				});
			}
		});




		var build = new isoBmff.Builder(data, function (err, chunk) {
			response.set('Access-Control-Allow-Origin', '*');
			response.type(segmentType + '/mp4');
			response.send(chunk);

			unboxing = null;
			build = null


		});
		return data;

	});

	chunkStream
		.pipe(unboxing);
}



function getInit (request, response) {


	var segment = request.params.segment;
	var segmentType = /video/.test(segment) ? 'video' : 'audio';

	console.log('init segment request', segment );

	response.set('Access-Control-Allow-Origin', '*');
	response.type(segmentType + '/mp4');
	responseFileStream('./media/chick-' + segmentType + '_dashinit.mp4', response);

}

function getMpd (request, response) {

	console.log('MPD request' );

	response.set('Access-Control-Allow-Origin', '*');
	response.type('application/xml');
	responseFileStream('./chick.mpd', response)

}



function responseFileStream (file, response) {

	var fileStream = fs.createReadStream(file, {
		flags: 'r',
		encoding: null,
		fd: null,
		mode: 0666,
		autoClose: true
	});

	fileStream.on('error', function () {
		response.sendStatus(404);
	});

	fileStream.pipe(response)

}



app.all('/', function (req, res) {
	res.send('Hello World!')
})

app.all('/chunk/:segment.m4s', getChunk);
app.all('/init/:segment.mp4', getInit);
app.all('/chick.mpd', getMpd);

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Example app listening at http://%s:%s', host, port)
});