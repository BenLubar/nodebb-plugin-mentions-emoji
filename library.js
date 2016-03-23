var async = module.parent.require('async');
var nconf = module.parent.require('nconf');
var XRegExp = module.parent.require('xregexp');
var User = module.parent.require('./user.js');
var utils = module.parent.require('../public/src/utils.js');

var regex = XRegExp('(?:>|\\s):@([\\p{L}\\d\\-_.]+):', 'g');

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
	var cleaned = raw.replace(/<code>.*<\/code>/gm, '');

	var matches = cleaned.match(regex);

	matches = matches.filter(function(cur, idx) {
		// Eliminate duplicates
		return idx === matches.indexOf(cur);
	}).map(function(match) {
		return match.slice(match.indexOf('@') + 1, -1);
	});

	async.each(matches, function(match, next) {
		var slug = Utils.slugify(match.slice(1));

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
				}

				raw = raw.replace(new RegExp('([>|\\s])' + match, 'g'), function(match, before) {
					return before + '<a class="plugin-mentions-emoji-a" href="' + nconf.get('url') + '/user/' + slug + '"><img src="' + picture + '" class="plugin-mentions-emoji" alt="' + match + '" title="' + match + '" /></a>'
				});

				next(null);
			});
		});
	}, function(err) {
		callback(err, raw);
	});
};