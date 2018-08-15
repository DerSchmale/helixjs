var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var insert = require('gulp-insert');
var concatCallback = require('gulp-concat-callback');
var del = require('del');
var rollup = require('gulp-better-rollup');
var commonjs = require("rollup-plugin-commonjs");
var nodeResolve = require("rollup-plugin-node-resolve");
var jsdoc = require("gulp-jsdoc3");

// TODO: For the IO module, would be useful if we could have a target that allows picking a few exporters

gulp.task('package', ['glsl', 'main', 'clean']);

gulp.task('default', ['glsl', 'minimize', 'clean']);
gulp.task('docs', ['docs-core', 'docs-io', 'docs-physics']);

// core only compiles the core game engine
gulp.task('core', ['glsl'], function ()
{
    return gulp.src(['./src/helix-core/HX.js'])
        .pipe(rollup(
            {
				plugins: [
					nodeResolve({
						jsnext: true,
						main: true
					}),
					commonjs({
						include: 'node_modules/**'
					})
				]
			},
			{
				name: 'HX',
				format: 'umd'
			}
		))
        .pipe(rename('helix.js'))
        .pipe(gulp.dest('./build/'));
});

gulp.task('io', [], function ()
{
    return gulp.src(['./src/helix-io/HX_IO.js'])
        .pipe(rollup(
        	{
				external: [ 'helix', 'pako' ]
        	},
			{
				name: 'HX_IO',
				globals: {
					'helix': 'HX',
					'pako': 'pako'
				},
				format: 'umd'
			}
		))
        .pipe(rename('helix-io.js'))
        .pipe(gulp.dest('./build/'));
});

gulp.task('physics', [], function ()
{
    return gulp.src(['./src/helix-physics/HX_Physics.js'])
        .pipe(rollup(
			{
				external: ['helix', 'cannon']
			},
			{
				name: 'HX_PHYS',
				globals: {
					'helix': 'HX',
					'cannon': 'CANNON'
				},
				format: 'umd'
			}
        ))
        .pipe(rename('helix-physics.js'))
        .pipe(gulp.dest('./build/'));
});

// main compiles everything, including optionals
gulp.task('main', ['core', 'io', 'physics']);

gulp.task('minimize', ['main'], function ()
{
    gulp.src(['./build/helix.js', './build/helix-io.js', './build/helix-physics.js'], {base: './build/'})
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('./build/'));
});

gulp.task('glsl', function ()
{
    return gulp.src('./src/helix-core/glsl/**/*.glsl')
        .pipe(concatCallback('shaderlib.js', appendGLSL))
        .pipe(insert.prepend("import { ShaderLibrary } from '../../src/helix-core/shader/ShaderLibrary';\n"))
        .pipe(gulp.dest('./build/tmp/'));
});

gulp.task('clean', ['main', 'glsl'], function ()
{
    del('./build/tmp');
});

gulp.task('docs-core', function (cb) {
    var config = require('./jsdoc-core.json');
    gulp.src(['README.md', './src/helix-core/**/*.js'], {read: false})
        .pipe(jsdoc(config, cb));
});

gulp.task('docs-io', function(cb) {
    var config = require('./jsdoc-io.json');
    gulp.src(['README.md', './src/helix-io/**/*.js'], {read: false})
        .pipe(jsdoc(config, cb));
});

gulp.task('docs-physics', function(cb) {
    var config = require('./jsdoc-physics.json');
    gulp.src(['README.md', './src/helix-physics/**/*.js'], {read: false})
        .pipe(jsdoc(config, cb));
});

function appendGLSL(contents, file)
{
    contents = contents.replace(/\n/g, "\\n");
    contents = contents.replace(/\r/g, "");
    contents = contents.replace(/\'/g, "\\'");
    contents = contents.replace(/\"/g, "\\\"");
    return "ShaderLibrary._files['" + getFileName(file) + "'] = '" + contents + "';\n";
}

function getFileName(file)
{
    var index = file.path.lastIndexOf("\\");
    index = Math.max(file.path.lastIndexOf("/"), index);
    return index < 0 ? file.path : file.path.substring(index + 1);
}