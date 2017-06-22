HX.MorphData = function()
{
    this.positions = [];
    this.masks = [];
    this._numVertices = 0;
};

HX.MorphPose = function()
{
    this._positionTexture = new HX.Texture2D();
    this._positionTexture.filter = HX.TextureFilter.NEAREST_NOMIP;
    this._positionTexture.wrapMode = HX.TextureWrapMode.CLAMP;
    this._positionFBO = new HX.FrameBuffer(this._positionTexture);
};

HX.MorphPose.getTextureDimensions = function(numVertices)
{
    var f = new HX.Float2();
    f.x = Math.ceil(Math.sqrt(numVertices));
    f.y = Math.ceil(numVertices / f.x);
    return f;
};


HX.MorphPose.prototype =
{
    get numVertices()
    {
        return this._numVertices;
    },

    get positionTexture()
    {
        return this._positionTexture;
    },

    get positionFBO()
    {
        return this._positionFBO;
    },

    /**
     *
     * @param positions An Array of 3 floats per vertex
     * @param masks An Array of 1 float per vertex
     */
    initFromMorphData: function(data)
    {
        var positions = data.positions;
        var masks = data.masks;
        this._numVertices = positions.length / 3;
        var dim = HX.MorphPose.getTextureDimensions(this._numVertices);
        var texData = [];
        var type = HX.EXT_HALF_FLOAT_TEXTURES? HX.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES : HX_GL.FLOAT;

        var t = 0;
        var p = 0;
        for (var i = 0; i < this._numVertices; ++i) {
            texData[t++] = positions[p++];
            texData[t++] = positions[p++];
            texData[t++] = positions[p++];
            texData[t++] = masks[i];
        }

        var len = dim.x * dim.y * 4;
        for (i = texData.length; i < len; ++i)
            texData[i] = 0.0;

        this._positionTexture.uploadData(new Float32Array(texData), dim.x, dim.y, false, HX_GL.RGBA, type);
        this._positionFBO.init();
    },

    initFromMeshData: function(meshData)
    {
        this._numVertices = meshData.numVertices;
        var dim = HX.MorphPose.getTextureDimensions(meshData.numVertices);
        var posAttrib = meshData.getVertexAttribute("hx_position");
        var stride = meshData.getVertexStride(posAttrib.streamIndex);
        var data = meshData.getVertexData(posAttrib.streamIndex);
        var texData = [];
        var type = HX.EXT_HALF_FLOAT_TEXTURES? HX.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES : HX_GL.FLOAT;

        var t = 0;
        for (var i = posAttrib.offset; i < data.length; i += stride) {
            texData[t++] = data[i];
            texData[t++] = data[i + 1];
            texData[t++] = data[i + 2];
            texData[t++] = 1.0;
        }

        // fill up texture
        var len = dim.x * dim.y * 4;
        while (t < len)
            texData[t++] = 0.0;

        this._positionTexture.uploadData(new Float32Array(texData), dim.x, dim.y, false, HX_GL.RGBA, type);
        this._positionFBO.init();
    },

    clone: function()
    {
        var copy = new HX.MorphPose();
        copy.copyFrom(this);
        return copy;
    },

    copyFrom: function(pose)
    {
        if (pose.positionTexture.width !== this._positionTexture.width || pose.positionTexture.height !== this._positionTexture.height) {
            var type = HX.EXT_HALF_FLOAT_TEXTURES? HX.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES : HX_GL.FLOAT;
            this._positionTexture.initEmpty(pose.positionTexture.width, pose.positionTexture.height, HX_GL.RGBA, type);
            this._positionFBO.init();
        }
        HX.TextureUtils.copy(pose.positionTexture, this._positionFBO);
    }
};