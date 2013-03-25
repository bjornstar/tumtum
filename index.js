var tumblr = require('tumblr.js');
var OAuth = require('oauth').OAuth;
var express = require('express');

var REQUEST_TOKEN_URL = "http://www.tumblr.com/oauth/request_token";
var AUTHORIZE_URL = "http://www.tumblr.com/oauth/authorize";
var ACCESS_TOKEN_URL = "http://www.tumblr.com/oauth/access_token";

var config = require('./config.json');

var oa = new OAuth(REQUEST_TOKEN_URL, ACCESS_TOKEN_URL, config.consumerKey, config.consumerSecret, '1.0', null, 'HMAC-SHA1');

var client;

var app = express();

app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
	secret: config.sessionSecret || 'the default session secret.'
}));

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

		req.session.oauth.accessToken = accessToken;
		req.session.oauth.accessTokenSecret = accessTokenSecret;
		res.redirect('/dashboard');
	});
});

app.get('/dashboard', function (req, res) {
	res.send(200, 'Welcome to tumtum.');
});


app.listen(3333);

