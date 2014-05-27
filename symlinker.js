var mkdirp = require('mkdirp');

var fs = require('fs');

/* basic functions */

function clone(obj){
	if(obj == null || typeof(obj) != 'object')
		return obj;

	var temp = obj.constructor();

	for(var key in obj)
		temp[key] = clone(obj[key]);
	return temp;
}

function open (options) {
	var rawFile;
	// options:
	// -path
	// -type
	// -(sourcePath)
	// -(destinationPath)
	// -(options.forceCreation)

	/* Validating */
	try {
		rawFile = fs.readFileSync(options.path, 'utf8');
	} catch (err) {
		console.log("Could not read the provided Symlinker file.\n" + options.path);
		process.exit(1);
	}

	/* Parsing Symlinker File */

	var task = new Array();

	switch (options.type) {
		case "text-newline":
			try {
					task = [{
					'input': options.sourcePath,
					'items': rawFile.replace(/(\r)/gm,"").split("\n"),
					'output': options.destinationPath
				}];
			} catch (err) {
				console.log("Could not parse the provided Symlinker file.\n" + options.path);
				process.exit(1);
			}
		break;
		case "json":
			try {
				task = [{
					'input': options.sourcePath,
					'items': JSON.parse(rawFile),
					'output': options.destinationPath
				}];
			} catch (err) {
				console.log("Could not parse the provided Symlinker file.\n" + options.path);
				process.exit(1);
			}
		break;
		case "advanced-newline":
			try {

				var temp = rawFile.replace(/(\r)/gm,"").split("\n");

				var queue = new Object();
				
				for (var i = 0; i < temp.length; i++) {
					
					var content = temp[i].slice(1);

					switch(temp[i][0]) {
						case '$':
							queue = {'input': content,'items':[]};
						break;
						case '-':
							queue.items.push(content);
						break;
						case '>':
							queue.output = content;
							task.push(clone(queue));
						break;
						case undefined: break;
						case '#': break;
						default:
							console.log("invalid file syntax " + JSON.stringify(temp[i]) + " in line " + i);
					}
				}
			} catch (err) {
				console.error("Could not parse the provided Symlinker file.\n" + options.path);
				process.exit(1);
			}
		break;
		default:
			console.error("Invalid value for Symlinker-file type.");
			process.exit(1);
	}

	for (var i = 0; i < task.length; i++) {
		var q = task[i];

		// checking if source folder is valid
		var valid = fs.existsSync(q.input);

		if (!valid && !options.forceCreation) {
			console.error('Path isn\'t valid: ' + q.input)
		} else {
			console.log('\n$' + q.input);
			for (var j = 0; j < q.items.length; j++) {
				try {
					var outputPath = q.output + '/' + q.items[j];
					var inputPath = q.input + '/' + q.items[j];
					var dirs = outputPath.slice(0,outputPath.lastIndexOf('/'));
					mkdirp.sync(dirs);
					try {
						if (fs.lstatSync(outputPath).isSymbolicLink()) {
							if (!options.forceRecreation) {
								console.log("Symbolic link " + outputPath  + " already exists.\nUse -r to force symbolic link recreation.");
								process.exit(1);
							} else {
								fs.unlinkSync(outputPath);
							}
						}
					} catch (err) {
						// file doesn't exist
					}
					var stats = fs.lstatSync(inputPath);
					if (stats.isDirectory()) {
						fs.symlinkSync(inputPath, outputPath, 'dir');
					} else if (stats.isFile()) {
						fs.symlinkSync(inputPath, outputPath, 'file');
					} else if (!options.isIgnoring) {
						console.log("Could not create symbolic link. " + inputPath + " is neither a file nor a folder. Use -i to allow Symlinker to continue after this error.");
						process.exit(1);
					}
					console.log('-' + q.items[j]);
				} catch (err) {
					console.error(err);
					console.error('Error creating symlink ' + q.input + ' -> ' + q.output);
					process.exit(1);
				}
			}
			console.log('>' + q.output);
		}
	}
}

// exporting functions
exports.open = open;