var tumblr = require('tumblr.js');
var OAuth = require('oauth').OAuth;
var express = require('express');

var REQUEST_TOKEN_URL = "http://www.tumblr.com/oauth/request_token";
var AUTHORIZE_URL = "http://www.tumblr.com/oauth/authorize";
var ACCESS_TOKEN_URL = "http://www.tumblr.com/oauth/access_token";

var config = require('./config.json');

var client;

var app = express();

app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
	secret: config.sessionSecret || 'the default session secret.'
}));

app.get('/', function (req, res) {
	if (!req.session.oauth_access_token) {
		return res.redirect('/tumblr_login');
	}
	return res.redirect('dashboard');
});

app.get('/tumblr_login', function (req, res) {
	var oa = new OAuth(REQUEST_TOKEN_URL, ACCESS_TOKEN_URL, config.consumerKey, config.consumerSecret, '1.0', null, 'HMAC-SHA1');
	oa.getOAuthRequestToken(function (error, requestToken, requestTokenSecret, requestResults) {
		if (error) {
			console.log('OAuthRequest Error:', error);
			return res.send(500, 'Something went horribly wrong with OAuthRequest.');
		}

		console.log('requestResults', requestResults);

		oa.getOAuthAccessToken(requestToken, requestTokenSecret, function (error, accessToken, accessTokenSecret, accessResults) {
			if (error) {
				console.log('OAuthAccess Error:', error);
				return res.send(500, 'Something went horribly wrong with OAuthAccess.');
			}

			client = tumblr.createClient({
				consumer_key: config.consumerKey,
				consumer_secret: config.consumerSecret,
				token: accessToken,
				token_secret: accessTokenSecret
			});

			client.userInfo(function (err, data) {
				if (err) {
					console.log('TumblrClient Error:', err);
					return res.send(500, 'Something went horribly wrong with TumblrClient.');
				}

				var out = '';

				data.blogs.forEach(function (blog) {
					out.concat(blog.name);
				});

				res.send(200, out);
			});
		});
	});
});

app.listen(3333);

