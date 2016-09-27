HX.HeightMap =
{
    from8BitTexture: function(texture, generateMipmaps, target)
    {
        generateMipmaps = generateMipmaps || true;
        var tex1 = target || new HX.Texture2D();
        tex1.initEmpty(texture.width, texture.height);
        var fbo1 = new HX.FrameBuffer(tex1);
        fbo1.init();

        var tex2 = new HX.Texture2D();
        tex2.initEmpty(texture.width, texture.height);
        var fbo2 = new HX.FrameBuffer(tex2);
        fbo2.init();

        var toRGBA8 = new HX.CustomCopyShader(HX.ShaderLibrary.get("greyscale_to_rgba8.glsl"));
        var oldRT = HX.getCurrentRenderTarget();

        HX.setRenderTarget(fbo1);
        HX.clear();
        toRGBA8.execute(HX.RectMesh.DEFAULT, texture);

        if (generateMipmaps)
            target.generateMipmap();

        var smooth = new HX.CustomCopyShader(HX.ShaderLibrary.get("smooth_heightmap_fragment.glsl"));
        var textureLocation = HX_GL.getUniformLocation(smooth._program, "reference");
        var offsetLocation = HX_GL.getUniformLocation(smooth._program, "stepSize");
        HX_GL.uniform1i(textureLocation, 1);

        texture.bind(1);

        HX.setRenderTarget(fbo2);
        HX.clear();
        HX_GL.uniform2f(offsetLocation, 1.0 / texture.width, 0.0);
        smooth.execute(HX.RectMesh.DEFAULT, tex1);
        tex2.generateMipmap();

        HX.setRenderTarget(fbo1);
        HX.clear();
        HX_GL.uniform2f(offsetLocation, 0.0, 1.0 / texture.height);
        smooth.execute(HX.RectMesh.DEFAULT, tex2);

        fbo2.dispose();

        if (generateMipmaps)
            target.generateMipmap();

        HX.setRenderTarget(oldRT);
        fbo1.dispose();

        return tex1;
    }
};
