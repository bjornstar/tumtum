var appConfig;

try {
	appConfig = require('./config.json');
} catch (e) {
	appConfig = {};
	console.log(e);
	console.warn('Could not find config.json');
}

module.exports = appConfig;
