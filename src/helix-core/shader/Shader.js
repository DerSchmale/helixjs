/**
 *
 * @param vertexShaderCode
 * @param fragmentShaderCode
 * @constructor
 */
HX.Shader = function(vertexShaderCode, fragmentShaderCode)
{
    // can be vertex or fragment shader
    // Mesh object's vertexLayout should have a map of attrib names + offset into vertex buffer
    // - on meshInstance creation:
    //      -> create map of attribute index -> buffer offset
    //      -> this by binding programme and asking gl for attrib locations
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

    updateRenderState: function(worldMatrix, camera)
    {
        HX_GL.useProgram(this._program);

        var len = this._uniformSetters.length;
        for (var i = 0; i < len; ++i) {
            this._uniformSetters[i].execute(worldMatrix, camera);
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

    getVertexAttributeIndex: function(name)
    {
        return HX_GL.getAttribLocation(this._program, name);
    }
};