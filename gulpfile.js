var gulp = require('gulp');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var concatCallback = require('gulp-concat-callback');
var del = require('del');

var libs = [
    "libs/pako/pako_inflate.js"
];

var coreGLSLFiles = [
    './src/helix-core/glsl/**/*.glsl'
];

var coreFiles = [
    "src/helix-core/Helix.js",
    "./build/tmp/*.js",
    "src/helix-core/shader/glslinclude.js",

    "src/helix-core/math/*.js",
    "src/helix-core/core/*.js",
    "src/helix-core/io/FileUtils.js",
    "src/helix-core/io/URLLoader.js",
    "src/helix-core/io/BulkURLLoader.js",

    // TODO: find better way for dependency management, but don't want horrible module management
    // base classes first
    "src/helix-core/shader/Shader.js",
    "src/helix-core/material/Material.js",
    "src/helix-core/io/AssetLoader.js",
    "src/helix-core/scene/SceneNode.js",
    "src/helix-core/entity/*.js",
    "src/helix-core/light/Light.js",
    "src/helix-core/scene/SceneVisitor.js",
    "src/helix-core/animation/SkeletonBlendNode.js",

    "src/helix-core/shader/*.js",
    "src/helix-core/material/*.js",
    "src/helix-core/scene/*.js",
    "src/helix-core/mesh/*.js",
    "src/helix-core/light/*.js",
    "src/helix-core/mesh/primitives/*.js",
    "src/helix-core/texture/*.js",
    "src/helix-core/render/*.js",
    "src/helix-core/effect/*.js",
    "src/helix-core/animation/*.js",
    "src/helix-core/io/*.js",
    "src/helix-core/utils/*.js"
];

var parserFiles = [
    "src/helix-parsers/**/*.js"
];

gulp.task('package', ['glsl', 'main', 'clean']);

gulp.task('default', ['glsl', 'minimize', 'clean']);

// core only compiles the core game engine
gulp.task('core', ['glsl'], function ()
{
    var sources = libs.concat(coreFiles);
    return gulp.src(sources, {base: './'})
        .pipe(concat('helix.js'))
        .pipe(gulp.dest('./build/'));
});

gulp.task('parsers', [], function ()
{
    var sources = libs.concat(parserFiles);
    return gulp.src(sources, {base: './'})
        .pipe(concat('helix-parsers.js'))
        .pipe(gulp.dest('./build/'));
});

// main compiles everything, including optionals
gulp.task('main', ['core', 'parsers']);

gulp.task('minimize', ['main'], function ()
{
    gulp.src(['./build/helix.js', './build/helix-parsers.js'], {base: './build/'})
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('./build/'));
});

gulp.task('glsl', function ()
{
    return gulp.src(coreGLSLFiles)
        .pipe(concatCallback('shaderlib.js', appendGLSL))
        .pipe(gulp.dest('./build/tmp/'));
});

gulp.task('clean', ['main', 'glsl'], function ()
{
    del('./build/tmp');
});

function appendGLSL(contents, file)
{
    contents = contents.replace(/\n/g, "\\n");
    contents = contents.replace(/\r/g, "");
    contents = contents.replace(/\'/g, "\\'");
    contents = contents.replace(/\"/g, "\\\"");
    return "HX.ShaderLibrary['" + getFileName(file) + "'] = '" + contents + "';\n";
}

function getFileName(file)
{
    var index = file.path.lastIndexOf("\\");
    index = Math.max(file.path.lastIndexOf("/"), index);
    return index < 0 ? file.path : file.path.substring(index + 1);
}