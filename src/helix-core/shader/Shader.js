/**
 *
 * @param vertexShaderCode
 * @param fragmentShaderCode
 * @constructor
 */
HX.Shader = function(vertexShaderCode, fragmentShaderCode)
{
    this._ready = false;
    this._vertexShader = null;
    this._fragmentShader = null;
    this._program = null;
    this._uniformSetters = null;

    if (vertexShaderCode && fragmentShaderCode)
        this.init(vertexShaderCode, fragmentShaderCode);
};

HX.Shader.ID_COUNTER = 0;

HX.Shader.prototype = {
    constructor: HX.Shader,

    isReady: function() { return this._ready; },

    init: function(vertexShaderCode, fragmentShaderCode)
    {
        vertexShaderCode = HX.GLSLIncludeGeneral + vertexShaderCode;
        fragmentShaderCode = HX.GLSLIncludeGeneral + fragmentShaderCode;

        vertexShaderCode = this._addDefineGuards(vertexShaderCode);
        fragmentShaderCode = this._addDefineGuards(fragmentShaderCode);

        this._vertexShader = HX_GL.createShader(HX_GL.VERTEX_SHADER);
        if (!this._initShader(this._vertexShader, vertexShaderCode)) {
            this.dispose();
            if (HX.OPTIONS.throwOnShaderError) {
                throw new Error("Failed generating vertex shader: \n" + vertexShaderCode);
            }
            else {
                console.warn("Failed generating vertex shader");
            }

            return;
        }

        this._fragmentShader = HX_GL.createShader(HX_GL.FRAGMENT_SHADER);
        if (!this._initShader(this._fragmentShader, fragmentShaderCode)) {
            this.dispose();
            if (HX.OPTIONS.throwOnShaderError)
                throw new Error("Failed generating fragment shader: \n" + fragmentShaderCode);
            console.warn("Failed generating fragment shader:");
            return;
        }

        this._program = HX_GL.createProgram();

        HX_GL.attachShader(this._program, this._vertexShader);
        HX_GL.attachShader(this._program, this._fragmentShader);
        HX_GL.linkProgram(this._program);

        if (!HX_GL.getProgramParameter(this._program, HX_GL.LINK_STATUS)) {
            var log = HX_GL.getProgramInfoLog(this._program);
            this.dispose();

            console.log("**********");
            HX.Debug.printShaderCode(vertexShaderCode);
            console.log("**********");
            HX.Debug.printShaderCode(fragmentShaderCode);

            if (HX.OPTIONS.throwOnShaderError)
                throw new Error("Error in program linking:" + log);

            console.warn("Error in program linking:" + log);

            return;
        }

        this._ready = true;

        this._uniformSetters = HX.UniformSetter.getSetters(this);
    },

    updateRenderState: function(camera, renderItem)
    {
        HX_GL.useProgram(this._program);

        var len = this._uniformSetters.length;
        for (var i = 0; i < len; ++i) {
            this._uniformSetters[i].execute(camera, renderItem);
        }
    },

    _initShader: function(shader, code)
    {
        HX_GL.shaderSource(shader, code);
        HX_GL.compileShader(shader);

        // Check the compile status, return an error if failed
        if (!HX_GL.getShaderParameter(shader, HX_GL.COMPILE_STATUS)) {
            console.warn(HX_GL.getShaderInfoLog(shader));
            HX.Debug.printShaderCode(code);
            return false;
        }

        return true;
    },

    dispose: function()
    {
        HX_GL.deleteShader(this._vertexShader);
        HX_GL.deleteShader(this._fragmentShader);
        HX_GL.deleteProgram(this._program);

        this._ready = false;
    },

    getProgram: function() { return this._program; },

    getUniformLocation: function(name)
    {
        return HX_GL.getUniformLocation(this._program, name);
    },

    getAttributeLocation: function(name)
    {
        return HX_GL.getAttribLocation(this._program, name);
    },

    _addDefineGuards: function(code)
    {
        code = this._guard(code, /^uniform\s+\w+\s+hx_\w+\s*;/gm);
        code = this._guard(code, /^attribute\s+\w+\s+hx_\w+\s*;/gm);


        return code;
    },

    // this makes sure reserved uniforms are only used once, makes it easier to combine several snippets
    _guard: function(code, regEx)
    {
        var result = code.match(regEx) || [];
        var covered = {};

        for (var i = 0; i < result.length; ++i) {
            var occ = result[i];
            if (covered[occ]) continue;
            var start = occ.indexOf("hx_");
            var end = occ.indexOf(";");
            var name = occ.substring(start, end);
            name = name.trim();
            covered[occ] = true;
            var defName = name.toUpperCase();
            var repl =  "#ifndef " + defName + "\n" +
                        "#define " + defName + "\n" +
                        occ + "\n" +
                        "#endif\n";
            var replReg = new RegExp(occ, "g");
            code = code.replace(replReg, repl);
        }

        return code;
    }
};