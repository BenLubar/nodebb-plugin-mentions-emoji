var async = require.main.require('async');
var nconf = require.main.require('nconf');
var XRegExp = require.main.require('xregexp');
var User = require.main.require('./src/user');
var utils = require.main.require('./public/src/utils.js');

var regex = XRegExp(':@([\\p{L}\\d\\-_.]+):', 'g');

exports.parsePost = function(data, callback) {
	if (!data || !data.postData || !data.postData.content) {
		return callback(null, data);
	}

	exports.parseRaw(data.postData.content, function(err, content) {
		if (err) {
			return callback(err);
		}

		data.postData.content = content;
		callback(null, data);
	});
};

exports.parseRaw = function(raw, callback) {
	var split = raw.split(/(<a[\s\S]*?<\/a>|<code[\s\S]*?<\/code>)/gm);

	var matches = [];
	split.forEach(function(cleaned, i) {
		if ((i & 1) === 0) {
			matches = matches.concat(cleaned.match(regex) || []);
		}
	});

	if (!matches.length) {
		return callback(null, raw);
	}

	matches = matches.filter(function(cur, idx) {
		// Eliminate duplicates
		return idx === matches.indexOf(cur);
	});

	async.each(matches, function(match, next) {
		var slug = utils.slugify(match.slice(2, -1));

		User.getUidByUserslug(slug, function(err, uid) {
			if (err) {
				return next(err);
			}

			if (!uid) {
				return next(null);
			}

			User.getUserField(uid, 'picture', function(err, picture) {
				if (err) {
					return next(err);
				}

				if (!picture) {
					return next(null);
				}

				split = split.map(function(content, i) {
					if ((i & 1) === 1) {
						return content;
					}

					var re = new RegExp('((?:^|>)[^<]*)' + match, 'gm');

					return content.replace(re, function recurse(all, prefix) {
						return prefix.replace(re, recurse) + '<a class="plugin-mentions-emoji-a" href="' + nconf.get('url') + '/uid/' + uid + '"><img src="' + picture + '" class="plugin-mentions-emoji not-responsive" alt="' + match.slice(2, -1) + '" title="' + match.slice(2, -1) + '" width="20" height="20" /></a>';
					});
				});

				next(null);
			});
		});
	}, function(err) {
		callback(err, split.join(''));
	});
};
