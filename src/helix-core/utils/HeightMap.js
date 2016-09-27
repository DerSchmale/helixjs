HX.HeightMap =
{
    from8BitTexture: function(texture, smoothing, generateMipmaps, target)
    {
        generateMipmaps = generateMipmaps || true;
        var tex1 = target || new HX.Texture2D();
        tex1.initEmpty(texture.width, texture.height);
        var fbo1 = new HX.FrameBuffer(tex1);
        fbo1.init();

        //if (smoothing) {
        //    var tex2 = new HX.Texture2D();
        //    tex2.initEmpty(texture.width, texture.height);
        //    var fbo2 = new HX.FrameBuffer(tex2);
        //    fbo2.init();
        //}

        var toRGBA8 = new HX.CustomCopyShader(HX.ShaderLibrary.get("greyscale_to_rgba8.glsl"));
        var oldRT = HX.getCurrentRenderTarget();

        HX.setRenderTarget(fbo1);
        toRGBA8.execute(HX.RectMesh.DEFAULT, texture);

        if (smoothing) {

        }

        if (generateMipmaps)
            target.generateMipmap();

        HX.setRenderTarget(oldRT);
        fbo1.dispose();

        return tex1;
    }
};
