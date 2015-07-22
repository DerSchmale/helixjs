var gulp = require('gulp');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var concatCallback = require('gulp-concat-callback');
var del = require('del');

var sourceFiles = [
    "src/Helix.js",
    "./build/tmp/*.js",
    "src/shader/glslinclude.js",

    // TODO: find better way, so order doesn't matter
    // base classes first
    "src/shader/Shader.js",
    "src/shader/Material.js",
    "src/scene/Scene.js",
    "src/scene/Light.js",
    "src/render/SceneVisitor.js",
    "src/render/Renderer.js",

    "src/math/*.js",
    "src/core/*.js",
    "src/shader/*.js",
    "src/shader/*.js",
    "src/scene/*.js",
    "src/mesh/*.js",
    "src/mesh/primitives/*.js",
    "src/texture/*.js",
    "src/render/*.js",
    "src/effect/*.js",
    "src/io/*.js",
    "src/utils/*.js"
];

gulp.task('package', ['glsl', 'main', 'clean']);

gulp.task('default', ['glsl', 'minimize', 'clean']);

gulp.task('main', [ 'glsl' ], function() {
    return gulp.src(sourceFiles, {base: './src/'})
        .pipe(concat('helix.js'))
        .pipe(gulp.dest('./build/'));
});

gulp.task('minimize', [ 'main' ], function() {
    gulp.src(['./build/helix.js'], {base: './build/'})
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('./build/'));
});

gulp.task('glsl', function() {
    return gulp.src('./src/glsl/**/*.glsl')
        .pipe(concatCallback('shaderlib.js', appendGLSL))
        .pipe(gulp.dest('./build/tmp/'));
});

gulp.task('clean', ['main', 'glsl'], function() {
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
    return index < 0? file.path : file.path.substring(index + 1);
}
