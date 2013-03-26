var util = require('util');

var tumblr = require('tumblr.js');
var OAuth = require('oauth').OAuth;
var express = require('express');
var mongodb = require('mongodb');

var REQUEST_TOKEN_URL = "http://www.tumblr.com/oauth/request_token";
var AUTHORIZE_URL = "http://www.tumblr.com/oauth/authorize";
var ACCESS_TOKEN_URL = "http://www.tumblr.com/oauth/access_token";

var config = require('./config');
var package = require('./package.json');

console.log('Started', package.name, 'v' + package.version);

var dbServer = new mongodb.Server(config.mongo.host, config.mongo.port);
var db = new mongodb.Db(config.mongo.database, dbServer, {w:1});
var users = db.collection('users');

db.open(function (err) {
	if (err) {
		return console.log('db.open Error:', err);
	}

	console.log('db.open successful.');
});

var oa = new OAuth(REQUEST_TOKEN_URL, ACCESS_TOKEN_URL, config.consumerKey, config.consumerSecret, '1.0', null, 'HMAC-SHA1');

var sessionMap = {};

var app = express();

app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
	secret: config.sessionSecret || 'the default session secret.'
}));

function checkOAuth(req, res, next) {
	if (!req.session.oauth || !req.session.oauth.accessToken) {
		return res.redirect('/');
	}
	return next();
}

app.get('/', function (req, res) {
	if (!req.session.oauth || !req.session.oauth.accessToken) {
		return res.redirect('/tumblr_login');
	}
	return res.redirect('dashboard');
});

app.get('/tumblr_login', function (req, res) {
	oa.getOAuthRequestToken(function (error, requestToken, requestTokenSecret, requestResults) {
		if (error) {
			console.log('OAuthRequest Error:', error);
			return res.send(500, 'Something went horribly wrong with OAuthRequest.');
		}

		req.session.oauth = {
			requestToken: requestToken,
			requestTokenSecret: requestTokenSecret
		};

		res.redirect(AUTHORIZE_URL.concat('?oauth_token=').concat(requestToken));
	});
});

app.get('/tumblr_cb', function (req, res) {
	if (!req.session.oauth) {
		console.log('No OAuth to verify, bailing out.');
		return res.send(500, 'Something went horribly wrong with your OAuth session.');
	}

	req.session.oauth.verifier = req.query.oauth_verifier;
	
	var sessionOAuth = req.session.oauth;

	oa.getOAuthAccessToken(sessionOAuth.requestToken, sessionOAuth.requestTokenSecret, sessionOAuth.verifier, function (error, accessToken, accessTokenSecret, results) {
		if (error) {
			console.log('OAuthAccess Error:', error);
			return res.send(500, 'Something went horribly wrong with OAuthAccess.');
		}

		delete req.session.oauth.verifier;
		delete req.session.oauth.requestToken;
		delete req.session.oauth.requestTokenSecret;

		req.session.oauth.accessToken = accessToken;
		req.session.oauth.accessTokenSecret = accessTokenSecret;

		res.redirect('/dashboard');
	});
});

function getTumblrClient(oauth) {
	return new tumblr.createClient({
		consumer_key: config.consumerKey,
		consumer_secret: config.consumerSecret,
		token: oauth.accessToken,
		token_secret: oauth.accessTokenSecret
	});
}

app.get('/dashboard', checkOAuth, function (req, res) {
	var client = getTumblrClient(req.session.oauth);

	client.userInfo(function (error, data) {
		res.send(200, 'Welcome to tumtum, ' + data.user.name + '.');
	});
	console.log(util.inspect(req.session));
});


app.listen(3333);

