/**
 *
 * @param vertexShaderCode
 * @param fragmentShaderCode
 * @param preVertexCode Can contain defines and other things that need to be in there before any other includes (fe: extensions)
 * @param preFragmentCode Can contain defines and other things that need to be in there before any other includes
 * @constructor
 */
HX.Shader = function(vertexShaderCode, fragmentShaderCode, preVertexCode, preFragmentCode)
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

    if (vertexShaderCode && fragmentShaderCode) {
        this.init(vertexShaderCode, fragmentShaderCode, preVertexCode, preFragmentCode);
    }
};

HX.Shader.ID_COUNTER = 0;

HX.Shader.prototype = {
    constructor: HX.Shader,

    isReady: function() { return this._ready; },

    init: function(vertexShaderCode, fragmentShaderCode, preVertexCode, preFragmentCode)
    {
        preVertexCode = (preVertexCode || "") + "\n";
        preFragmentCode = (preFragmentCode || "") + "\n";
        vertexShaderCode = preVertexCode + HX.GLSLIncludeGeneral + vertexShaderCode;
        fragmentShaderCode = preFragmentCode + HX.GLSLIncludeGeneral + fragmentShaderCode;

        this._vertexShader = HX.GL.createShader(HX.GL.VERTEX_SHADER);
        if (!this._initShader(this._vertexShader, vertexShaderCode)) {
            this.dispose();
            if (HX.OPTIONS.throwOnShaderError) {
                throw new Error("Failed generating vertex shader: \n" + vertexShaderCode);
            }
            else {
                console.log("Failed generating vertex shader");
                console.log(vertexShaderCode);
            }

            return;
        }

        this._fragmentShader = HX.GL.createShader(HX.GL.FRAGMENT_SHADER);
        if (!this._initShader(this._fragmentShader, fragmentShaderCode)) {
            this.dispose();
            if (HX.OPTIONS.throwOnShaderError) {
                throw new Error("Failed generating fragment shader: \n" + fragmentShaderCode);
            }
            else {
                console.log("Failed generating fragment shader:");
                console.log(fragmentShaderCode);
            }
            return;
        }

        this._program = HX.GL.createProgram();

        HX.GL.attachShader(this._program, this._vertexShader);
        HX.GL.attachShader(this._program, this._fragmentShader);
        HX.GL.linkProgram(this._program);

        if (!HX.GL.getProgramParameter(this._program, HX.GL.LINK_STATUS)) {
            this.dispose();
            if (HX.OPTIONS.throwOnShaderError) {
                throw new Error("Error in program linking:" + HX.GL.getProgramInfoLog(this._program));
            }
            else {
                console.warn("Error in program linking:" + HX.GL.getProgramInfoLog(this._program));
            }

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
            throw new Error(HX.GL.getShaderInfoLog(shader));
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