
var express = require('express');
var exphbs  = require('express-handlebars');
var app = express();
var fs = require('fs');
var isoBmff = require('iso-bmff');
var _ = require('lodash')


// some defaults for this media
var setup  = {
	video: {
		chunks: 85,
		length: 2848768
	},
	audio: {
		chunks: 85,
		length: 10008576
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

	console.log(request.method, 'chunk request', segmentType, segmentId, loopCount, currentSegment);


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

	console.log(request.method, 'init segment request', segment );

	response.set('Access-Control-Allow-Origin', '*');
	response.type(segmentType + '/mp4');
	responseFileStream('./media/chick-' + segmentType + '_dashinit.mp4', response);

}
function getCORS (request, response) {

	console.log(request.method, 'crossdomain.xml request' );

	response.set('Access-Control-Allow-Origin', '*');
	response.type('application/xml');
	responseFileStream('./crossdomain.xml', response);

}

function getMpd (request, response) {

	console.log(request.method, 'MPD request' );

	var randMinute = getRandomInt(1, 10)

	response.set('Access-Control-Allow-Origin', '*');
	response.type('application/xml');
	response.render('mpd', {
		availabilityStartTime: (new Date(+new Date() - (randMinute * 60 * 1000))).toISOString(),
		publishTime: (new Date()).toISOString()
	});

}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
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
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.set('views', './views');


app.all('/', function (req, res) {
	res.send('Hello World!')
})

app.all('/chunk/:segment.m4s', getChunk);
app.all('/init/:segment.mp4', getInit);
app.all('/crossdomain.xml', getCORS);
app.all('/chick.mpd', getMpd);

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Example app listening at http://%s:%s', host, port)
});