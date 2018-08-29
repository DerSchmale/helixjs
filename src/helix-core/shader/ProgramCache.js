import {GLSLIncludes} from "./GLSLIncludes";
import {Debug} from "../debug/Debug";
import {GL} from "../core/GL";
import {META} from "../Helix";
import {CachedProgram} from "./CachedProgram";

var cache = {};
var list = [];
var purgeIndex = 0;
var FRAMES_BEFORE_PURGE = 2000; // at 60fps this is a little over 2 minutes until a program is considered "unused"
var orderCounter = 0;

export var ProgramCache =
{
	purge: function(frameMark)
	{
		var cached = list[purgeIndex];

		// check the amount of frames since last use of cached
		if (frameMark - cached.frameMark > FRAMES_BEFORE_PURGE) {
			delete cache[cached.key];
			list.splice(purgeIndex, 1);
			// this allows the Shader to check whether its copy is still in the cache
			cached.isCached = false;
		}
		else
			++purgeIndex;

		if (purgeIndex === list.length)
			purgeIndex = 0;
	},

	// If the cached version was dropped, but a program turns out to still have a copy, it needs to be recached or replaced
	resolveLost: function(lost)
	{
		var cached = cache[lost.key];

		// a new version was already created for the same cached version, we need to replace this so the old cache can be
		// destroyed
		if (cached)
			return cached;

		// recache if not replaced
		cache[lost.key] = lost;
		list.push(lost);
		return lost;
	},

	getProgram: function(vertexShaderCode, fragmentShaderCode)
	{
		var key = vertexShaderCode + "///" + fragmentShaderCode;
		var cached = cache[key];

		if (cached) {
			cached.frameMark = META.CURRENT_FRAME_MARK;
			return cached;
		}

		var gl = GL.gl;
		vertexShaderCode = "#define HX_VERTEX_SHADER\n" + GLSLIncludes.GENERAL + vertexShaderCode;
		fragmentShaderCode = "#define HX_FRAGMENT_SHADER\n" + GLSLIncludes.GENERAL + fragmentShaderCode;

		var vertexShader = getShader(vertexShaderCode, gl.VERTEX_SHADER);
		var fragmentShader = getShader(fragmentShaderCode, gl.FRAGMENT_SHADER);

		if (!vertexShader || !fragmentShader)
			return;

		var program = gl.createProgram();

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (META.OPTIONS.debug && !gl.getProgramParameter(program, gl.LINK_STATUS)) {
			var log = gl.getProgramInfoLog(program);

			console.log("**********");
			Debug.printShaderCode(vertexShaderCode);
			console.log("**********");
			Debug.printShaderCode(fragmentShaderCode);

			if (META.OPTIONS.throwOnShaderError)
				throw new Error("Error in program linking:" + log);

			console.warn("Error in program linking:" + log);

			return;
		}

		cached = new CachedProgram();
		cached.program = program;
		cached.frameMark = META.CURRENT_FRAME_MARK;
		cached.key = key;
		cached.isCached = true;
		cached.renderOrderHint = orderCounter++;
		cache[key] = cached;
		list.push(cached);

		return cached;
	}
};

function processExtensions(code, regEx, extension)
{
	var index = code.search(regEx);
	if (index < 0) return code;
	code = "#extension " + extension + " : enable\n" + code.replace(regEx, "");
	return code;
}

// this makes sure reserved uniforms are only used once, makes it easier to combine several snippets
// it's quite slow, tho
function guard(code, regEx)
{
	var result = code.match(regEx) || [];
	var covered = {};

	for (var i = 0; i < result.length; ++i) {
		var occ = result[i];
		occ = occ.replace(/(\r|\n)/g, "");

		if (occ.charCodeAt(0) === 10)
			occ = occ.substring(1);

		var start = occ.indexOf("hx_");
		var end = occ.indexOf(";");

		// in case of arrays
		var sq = occ.indexOf("[");
		if (sq >= 0 && sq < end) end = sq;

		var name = occ.substring(start, end);
		name = name.trim();

		if (covered[name]) continue;

		covered[name] = true;

		var defName = "HX_GUARD_" + name.toUpperCase();
		var repl = "\n#ifndef " + defName + "\n" +
			"#define " + defName + "\n" +
			occ + "\n" +
			"#endif\n";

		occ = occ.replace(/\[/g, "\\[");
		var replReg = new RegExp(occ, "g");
		code = code.replace(replReg, repl);
	}

	return code;
}

function initShader(shader, code)
{
	var gl = GL.gl;
	gl.shaderSource(shader, code);
	gl.compileShader(shader);

	// Check the compile status, return an error if failed
	if (META.OPTIONS.debug && !gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.warn(gl.getShaderInfoLog(shader));
		Debug.printShaderCode(code);
		return false;
	}

	return true;
}

function getShader(code, type)
{
	// is there a way to safely cache this so we don't have to do it over an over?
	code = processShaderCode(code);

	var shader = GL.gl.createShader(type);
	if (!initShader(shader, code)) {
		if (META.OPTIONS.throwOnShaderError) {
			throw new Error("Failed generating shader: \n" + code);
		}
		else {
			console.warn("Failed generating shader");
		}

		return null;
	}
	return shader;
}

function processShaderCode(code)
{
	code = processExtensions(code, /^\s*#derivatives\s*$/gm, "GL_OES_standard_derivatives");
	code = processExtensions(code, /^\s*#texturelod\s*$/gm, "GL_EXT_shader_texture_lod");
	code = processExtensions(code, /^\s*#drawbuffers\s*$/gm, "GL_EXT_draw_buffers");
	code = guard(code, /^\s*uniform\s+\w+\s+hx_\w+(\[\w+])?\s*;/gm);
	code = guard(code, /^\s*attribute\s+\w+\s+hx_\w+\s*;/gm);
	code = GLSLIncludes.VERSION + code;
	return code;
}