var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var gutil = require('gulp-util');
var slash = require('slash');

module.exports = function(options) {

    var filepathRegex = /.*?(?:\'|\"|^)([a-z0-9_\-\/\.]+?\.[a-z]{2,8})(?:(?:\?|\#)[^'"]*?|)(?:\'|\"|$).*?/igm;
    var fileMap = {};
    
    // Taken from gulp-rev: https://github.com/sindresorhus/gulp-rev
    var md5 = function (str) {
        return crypto.createHash('md5').update(str, 'utf8').digest('hex');
    };
    
    // new hash for index.html (forced, not based on contents)
    var rootHash = options.rootHash;

    var isFileIgnored = function (file) {

        var filename = (typeof file === 'string') ? file : file.path;
        filename = filename.substr(options.rootDir.length);

        for (var i = options.ignore.length; i--;) {
            var regex = (options.ignore[i] instanceof RegExp) ? options.ignore[i] : new RegExp(options.ignore[i] + '$', "ig");
            if (filename.match(regex)) return true;
        }
        return false;
    };

    var isFileSkipped = function (file) {

        var filename = (typeof file === 'string') ? file : file.path;
        filename = filename.substr(options.rootDir.length);

        for (var i = options.skip.length; i--;) {
            var regex = (options.skip[i] instanceof RegExp) ? options.skip[i] : new RegExp(options.skip[i] + '$', "ig");
            if (filename.match(regex)) return true;
        }
        return false;
    };

    // Taken from gulp-rev: https://github.com/sindresorhus/gulp-rev
    var revFile = function (filePath) {
        if (fileMap[filePath]) {
          return fileMap[filePath];
        }

        var filename,
            filenameReved,
            ext = path.extname(filePath);
       
        if (isFileIgnored(filePath)) {
            filename = path.basename(filePath);
        } else if(options.root && options.root == path.basename(filePath)) { // hack to revision index.html differently so it always gets a new revision (otherwise cache-key.appcache doesn't cause change)
            var hash = rootHash;
            filename = path.basename(filePath, ext) + '-' + hash + ext;
        } else {
            var contents = fs.readFileSync(filePath).toString();
            var hash = md5(contents).slice(0, options.hashLength);
            filename = path.basename(filePath, ext) + '-' + hash + ext;
        } 

        filePathReved = path.join(path.dirname(filePath), filename);
				
				// since windows likes to make this \\ instead of /
				if (process.platform === 'win32') {
				  filePathReved = slash(filePathReved);
				}
				
        fileMap[filePath] = filePathReved;
        return fileMap[filePath];
    };

    var revReferencesInFile = function (file) {

        var replaceMap = {};

        gutil.log('gulp-rev-all:', 'Finding references in [', file.path, ']');
        // Create a map of file references and their proper revisioned name
        var contents = String(file.contents);
        var result;
        while (result = filepathRegex.exec(contents)) {

            // Skip if we've already resolved this reference
            if (typeof replaceMap[result[1]] !== 'undefined') continue;
            replaceMap[result[1]] = false;

            // In the case where the referenced file is relative to the base path
            var fullpath = path.join(options.rootDir, result[1]);

            if (fs.existsSync(fullpath)) {
                replaceMap[result[1]] = slash(path.join(path.dirname(result[1]), path.basename(revFile(fullpath))));
                gutil.log('gulp-rev-all:', 'Found root reference [', result[1], '] -> [', replaceMap[result[1]], ']');
                continue;
            }

            // In the case where the file referenced is relative to the file being processed
            var fullpath = path.join(path.dirname(file.path), result[1]);
            if (fs.existsSync(fullpath)) {
                replaceMap[result[1]] = path.join(path.dirname(result[1]), path.basename(revFile(fullpath)));
                gutil.log('gulp-rev-all:', 'Found relative reference [', result[1], '] -> [', replaceMap[result[1]], ']');
                continue;
            }

        }

        for (var key in replaceMap) {
            if (!replaceMap[key]) continue;
            contents = contents.replace(RegExp(key, 'g'), replaceMap[key]);
        }

        file.contents = new Buffer(contents); // Update file contents with new reved references

    };


    return {
        revFile: revFile,
        revReferencesInFile: revReferencesInFile,
        isFileIgnored: isFileIgnored,
        isFileSkipped: isFileSkipped
    };

};
