HX.TextureUtils =
{
    /**
     * Resizes a texture (empty) if its size doesn't match. Returns true if the size has changed.
     * @param width The target width
     * @param height The target height
     * @param texture The texture to be resized if necessary
     * @param fbo (optional) Any fbos to be reinitialized if necessary
     * @returns {boolean} Returns true if the texture has been resized, false otherwise.
     */
    assureSize: function(width, height, texture, fbo, format, dataType)
    {
        if (width === texture.width && height === texture.height)
            return false;

        texture.initEmpty(width, height, format, dataType);
        if (fbo) fbo.init();
        return true;
    },

    isPowerOfTwo: function(value)
    {
        return value? ((value & -value) === value) : false;
    },

    equirectangularToCube: function(source, size, generateMipmaps, target)
    {
        generateMipmaps = generateMipmaps || true;
        size = size || source.height;

        if (!HX.TextureUtils._EQUI_TO_CUBE_SHADER)
            HX.TextureUtils._EQUI_TO_CUBE_SHADER = new HX.Shader(HX.ShaderLibrary.get("2d_to_cube_vertex.glsl"), HX.ShaderLibrary.get("equirectangular_to_cube_fragment.glsl"));

        this._createRenderCubeGeometry();

        target = target || new HX.TextureCube();
        target.initEmpty(size, source.format, source.dataType);
        var faces = [ HX_GL.TEXTURE_CUBE_MAP_POSITIVE_X, HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_X, HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Y, HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Y, HX_GL.TEXTURE_CUBE_MAP_POSITIVE_Z, HX_GL.TEXTURE_CUBE_MAP_NEGATIVE_Z ];

        HX.TextureUtils._EQUI_TO_CUBE_SHADER.updateRenderState();

        var textureLocation = HX.TextureUtils._EQUI_TO_CUBE_SHADER.getUniformLocation("source");
        var posLocation = HX.TextureUtils._EQUI_TO_CUBE_SHADER.getAttributeLocation("hx_position");
        var cornerLocation = HX.TextureUtils._EQUI_TO_CUBE_SHADER.getAttributeLocation("corner");

        HX_GL.uniform1i(textureLocation, 0);
        source.bind(0);

        HX.TextureUtils._TO_CUBE_VERTICES.bind();
        HX.TextureUtils._TO_CUBE_INDICES.bind();
        HX_GL.vertexAttribPointer(posLocation, 2, HX_GL.FLOAT, false, 20, 0);
        HX_GL.vertexAttribPointer(cornerLocation, 3, HX_GL.FLOAT, false, 20, 8);

        HX.enableAttributes(2);

        for (var i = 0; i < 6; ++i) {
            var fbo = new HX.FrameBuffer(target, null, faces[i]);
            fbo.init();

            HX.pushRenderTarget(fbo);

            HX.drawElements(HX_GL.TRIANGLES, 6, i * 6);
            HX.popRenderTarget(fbo);

            fbo.dispose();
        }

        if (generateMipmaps)
            target.generateMipmap();

        return target;
    },

    _createRenderCubeGeometry: function()
    {
        if (HX.TextureUtils._TO_CUBE_VERTICES) return;
        var vertices = [
            // pos X
            1.0, 1.0, 1.0, -1.0, -1.0,
            -1.0, 1.0, 1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0, 1.0, 1.0,
            1.0, -1.0, 1.0, 1.0, -1.0,

            // neg X
            1.0, 1.0, -1.0, -1.0, 1.0,
            -1.0, 1.0, -1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0, 1.0, -1.0,
            1.0, -1.0, -1.0, 1.0, 1.0,

            // pos Y
            -1.0, -1.0, -1.0, 1.0, -1.0,
            1.0, -1.0, 1.0, 1.0, -1.0,
            1.0, 1.0, 1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0, 1.0, 1.0,

            // neg Y
            -1.0, -1.0, -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0, -1.0, 1.0,
            1.0, 1.0, 1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0, -1.0, -1.0,

            // pos Z
            1.0, 1.0, 1.0, -1.0, 1.0,
            -1.0, 1.0, -1.0, -1.0, 1.0,
            -1.0, -1.0, -1.0, 1.0, 1.0,
            1.0, -1.0, 1.0, 1.0, 1.0,

            // neg Z
            1.0, 1.0, -1.0, -1.0, -1.0,
            -1.0, 1.0, 1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0, 1.0, -1.0,
            1.0, -1.0, -1.0, 1.0, -1.0
        ];
        var indices = [
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23
        ];
        HX.TextureUtils._TO_CUBE_VERTICES = new HX.VertexBuffer();
        HX.TextureUtils._TO_CUBE_INDICES = new HX.IndexBuffer();
        HX.TextureUtils._TO_CUBE_VERTICES.uploadData(new Float32Array(vertices));
        HX.TextureUtils._TO_CUBE_INDICES.uploadData(new Uint16Array(indices));
    }
};