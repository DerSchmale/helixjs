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
    this._renderOrderHint = ++HX.Shader.ID_COUNTER;

    if (vertexShaderCode && fragmentShaderCode) {
        vertexShaderCode = HX.GLSLIncludeGeneral + "\n" + vertexShaderCode;
        fragmentShaderCode = HX.GLSLIncludeGeneral + "\n" + fragmentShaderCode;
        this.init(vertexShaderCode, fragmentShaderCode);
    }
};

HX.Shader.ID_COUNTER = 0;

HX.Shader.prototype = {
    constructor: HX.Shader,

    isReady: function() { return this._ready; },

    init: function(vertexShaderCode, fragmentShaderCode)
    {
        vertexShaderCode = vertexShaderCode.replace("#includeHelix", HX.GLSLIncludeGeneral);
        fragmentShaderCode = fragmentShaderCode.replace("#includeHelix", HX.GLSLIncludeGeneral);

        this._vertexShader = HX.GL.createShader(HX.GL.VERTEX_SHADER);
        if (!this._initShader(this._vertexShader, vertexShaderCode)) {
            console.log("Failed generating vertex shader");
            console.log(vertexShaderCode);
            this.dispose();
            return;
        }

        this._fragmentShader = HX.GL.createShader(HX.GL.FRAGMENT_SHADER);
        if (!this._initShader(this._fragmentShader, fragmentShaderCode)) {
            console.log("Failed generating fragment shader:");
            console.log(fragmentShaderCode);
            this.dispose();
            return;
        }

        this._program = HX.GL.createProgram();

        HX.GL.attachShader(this._program, this._vertexShader);
        HX.GL.attachShader(this._program, this._fragmentShader);
        HX.GL.linkProgram(this._program);

        if (!HX.GL.getProgramParameter(this._program, HX.GL.LINK_STATUS)) {
            console.warn("Error in program linking:" + HX.GL.getProgramInfoLog(this._program));
            this.dispose();
            return;
        }

        this._ready = true;
    },

    updateRenderState: function()
    {
        HX.GL.useProgram(this._program);
    },

    _initShader: function(shader, code)
    {
        HX.GL.shaderSource(shader, code);
        HX.GL.compileShader(shader);

        // Check the compile status, return an error if failed
        if (!HX.GL.getShaderParameter(shader, HX.GL.COMPILE_STATUS)) {
            console.warn(HX.GL.getShaderInfoLog(shader));
            return false;
        }

        return true;
    },

    dispose: function()
    {
        HX.GL.deleteShader(this._vertexShader);
        HX.GL.deleteShader(this._fragmentShader);
        HX.GL.deleteProgram(this._program);

        this._ready = false;
    },

    getProgram: function() { return this._program; },

    getVertexAttributeIndex: function(name)
    {
        return HX.GL.getAttribLocation(this._program, name);
    }
};