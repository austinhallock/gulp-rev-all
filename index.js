var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var toolsFactory = require('./tools');
var through = require('through2');
var chalk = require('chalk');
var gutil = require('gulp-util');

module.exports = function(options) {

    var first = true;    
    options = options || {};
    options.hashLength = options.hashLength || 8;
    options.ignore = options.ignore || options.ignoredExtensions || [ /^\/favicon.ico$/g ];
    options.skip = options.skip || [];
    
    // Taken from gulp-rev: https://github.com/sindresorhus/gulp-rev
    var md5 = function (str) {
        return crypto.createHash('md5').update(str, 'utf8').digest('hex');
    };
    
    // new hash for index.html (forced, not based on contents)
    options.rootHash = md5(Math.random().toString()).slice(0, options.hashLength);

    return through.obj(function (file, enc, callback) {

        var tools = toolsFactory(options);

        if (first) {
            options.rootDir = options.rootDir || file.base;
            gutil.log('gulp-rev-all:', 'Root directory [', options.rootDir, ']');
            first = !first;
        }

        if (file.isNull()) {
            return callback(null, file);
        } else if (file.isStream()) {
            throw new Error('Streams are not supported!');
        } 

        // Only process references in these types of files, otherwise we'll corrupt images etc
        if(!tools.isFileSkipped(file)) {
	        switch(path.extname(file.path)) {
	            case '.js':
	            case '.css':
	            case '.html':
	            case '.appcache':
	                tools.revReferencesInFile(file);
	        }
	      }

        // Rename this file with the revion hash if doesn't match ignore list
        if (!tools.isFileIgnored(file)) {            
            var filenameReved = path.basename(tools.revFile(file.path));
            var base = path.dirname(file.path);
            file.path = path.join(base, filenameReved);
        }

        callback(null, file);
    });


};
