/**
 * @ignore
 * @param vertexShaderCode
 * @param fragmentShaderCode
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
import { GLSLIncludes } from './GLSLIncludes';
import { GL } from '../core/GL';
import { META } from '../Helix';
import {UniformSetter} from "./UniformSetter";
import {Debug} from "../debug/Debug";
import {Profiler} from "../debug/Profiler";

function Shader(vertexShaderCode, fragmentShaderCode)
{
    this._ready = false;
    this._vertexShader = null;
    this._fragmentShader = null;
    this._program = null;
    this._uniformSettersInstance = null;
    this._uniformSettersPass = null;

    if (vertexShaderCode && fragmentShaderCode)
        this.init(vertexShaderCode, fragmentShaderCode);
}

Shader.ID_COUNTER = 0;

Shader.prototype = {
    constructor: Shader,

    isReady: function() { return this._ready; },

    init: function(vertexShaderCode, fragmentShaderCode)
    {
        var gl = GL.gl;
        vertexShaderCode = "#define HX_VERTEX_SHADER\n" + GLSLIncludes.GENERAL + vertexShaderCode;
        fragmentShaderCode = "#define HX_FRAGMENT_SHADER\n" + GLSLIncludes.GENERAL + fragmentShaderCode;

        vertexShaderCode = this._processShaderCode(vertexShaderCode);
        fragmentShaderCode = this._processShaderCode(fragmentShaderCode);

        this._vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (!this._initShader(this._vertexShader, vertexShaderCode)) {
            this.dispose();
            if (META.OPTIONS.throwOnShaderError) {
                throw new Error("Failed generating vertex shader: \n" + vertexShaderCode);
            }
            else {
                console.warn("Failed generating vertex shader");
            }

            return;
        }

        this._fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!this._initShader(this._fragmentShader, fragmentShaderCode)) {
            this.dispose();
            if (META.OPTIONS.throwOnShaderError)
                throw new Error("Failed generating fragment shader: \n" + fragmentShaderCode);
            else
                console.warn("Failed generating fragment shader:");
            return;
        }

        this._program = gl.createProgram();

        gl.attachShader(this._program, this._vertexShader);
        gl.attachShader(this._program, this._fragmentShader);
        gl.linkProgram(this._program);

        if (META.OPTIONS.debug && !gl.getProgramParameter(this._program, gl.LINK_STATUS)) {
            var log = gl.getProgramInfoLog(this._program);
            this.dispose();

            console.log("**********");
            Debug.printShaderCode(vertexShaderCode);
            console.log("**********");
            Debug.printShaderCode(fragmentShaderCode);

            if (META.OPTIONS.throwOnShaderError)
                throw new Error("Error in program linking:" + log);

            console.warn("Error in program linking:" + log);

            return;
        }

        this._ready = true;

        Profiler.stopTiming("Shader::init");

        this._uniformSettersInstance = UniformSetter.getSettersPerInstance(this);
        this._uniformSettersPass = UniformSetter.getSettersPerPass(this);
    },

    updatePassRenderState: function(camera, renderer)
    {
        GL.gl.useProgram(this._program);

        var len = this._uniformSettersPass.length;
        for (var i = 0; i < len; ++i)
            this._uniformSettersPass[i].execute(camera, renderer);
    },

    updateInstanceRenderState: function(camera, renderItem)
    {
        var len = this._uniformSettersInstance.length;
        for (var i = 0; i < len; ++i)
            this._uniformSettersInstance[i].execute(camera, renderItem);
    },

    _initShader: function(shader, code)
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
    },

    dispose: function()
    {
        var gl = GL.gl;
        gl.deleteShader(this._vertexShader);
        gl.deleteShader(this._fragmentShader);
        gl.deleteProgram(this._program);

        this._ready = false;
    },

    getProgram: function() { return this._program; },

    getUniformLocation: function(name)
    {
        return GL.gl.getUniformLocation(this._program, name);
    },

    getAttributeLocation: function(name)
    {
        return GL.gl.getAttribLocation(this._program, name);
    },

    _processShaderCode: function(code)
    {
        code = this._processExtensions(code, /^\s*#derivatives\s*$/m, "GL_OES_standard_derivatives");
        code = this._processExtensions(code, /^\s*#texturelod\s*$/m, "GL_EXT_shader_texture_lod");
        code = this._processExtensions(code, /^\s*#drawbuffers\s*$/m, "GL_EXT_draw_buffers");
        code = this._guard(code, /^\s*uniform\s+\w+\s+hx_\w+(\[\w+])?\s*;/gm);
        code = this._guard(code, /^\s*attribute\s+\w+\s+hx_\w+\s*;/gm);
        return code;
    },

    _processExtensions: function(code, regEx, extension)
    {

        var index = code.search(regEx);
        if (index < 0) return code;
        code = "#extension " + extension + " : enable\n" + code.replace(regEx, "");
        return code;
    },

    // this makes sure reserved uniforms are only used once, makes it easier to combine several snippets
    // it's quite slow, tho
    _guard: function(code, regEx)
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
            var repl =  "\n#ifndef " + defName + "\n" +
                        "#define " + defName + "\n" +
                        occ + "\n" +
                        "#endif\n";

            occ = occ.replace(/\[/g, "\\[");
            var replReg = new RegExp(occ, "g");
            code = code.replace(replReg, repl);
        }

        return code;
    }
};

export { Shader };