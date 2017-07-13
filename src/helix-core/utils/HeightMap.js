import {Texture2D} from "../texture/Texture2D";
import {FrameBuffer} from "../texture/FrameBuffer";
import {CustomCopyShader} from "../render/UtilShaders";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {GL} from "../core/GL";
import {RectMesh} from "../mesh/RectMesh";
export var HeightMap =
{
    from8BitTexture: function(texture, generateMipmaps, target)
    {
        var gl = GL.gl
        generateMipmaps = generateMipmaps || true;
        var tex1 = target || new Texture2D();
        tex1.initEmpty(texture.width, texture.height);
        var fbo1 = new FrameBuffer(tex1);
        fbo1.init();

        var tex2 = new Texture2D();
        tex2.initEmpty(texture.width, texture.height);
        var fbo2 = new FrameBuffer(tex2);
        fbo2.init();

        var toRGBA8 = new CustomCopyShader(ShaderLibrary.get("greyscale_to_rgba8.glsl"));
        var oldRT = GL.getCurrentRenderTarget();

        GL.setRenderTarget(fbo1);
        GL.clear();
        toRGBA8.execute(RectMesh.DEFAULT, texture);

        if (generateMipmaps)
            target.generateMipmap();

        var smooth = new CustomCopyShader(ShaderLibrary.get("smooth_heightmap_fragment.glsl"));
        var textureLocation = gl.getUniformLocation(smooth._program, "reference");
        var offsetLocation = gl.getUniformLocation(smooth._program, "stepSize");
        gl.uniform1i(textureLocation, 1);

        texture.bind(1);

        GL.setRenderTarget(fbo2);
        GL.clear();
        gl.uniform2f(offsetLocation, 1.0 / texture.width, 0.0);
        smooth.execute(RectMesh.DEFAULT, tex1);
        tex2.generateMipmap();

        GL.setRenderTarget(fbo1);
        GL.clear();
        gl.uniform2f(offsetLocation, 0.0, 1.0 / texture.height);
        smooth.execute(RectMesh.DEFAULT, tex2);

        fbo2.dispose();

        if (generateMipmaps)
            target.generateMipmap();

        GL.setRenderTarget(oldRT);
        fbo1.dispose();

        return tex1;
    }
};
