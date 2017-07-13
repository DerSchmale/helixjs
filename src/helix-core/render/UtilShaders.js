import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";
import {GL} from "../core/GL";
import {Comparison, CullMode, ElementType} from "../Helix";

/**
 * @param fragmentShader
 * @constructor
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CustomCopyShader(fragmentShader)
{
    Shader.call(this);
    this.init(ShaderLibrary.get("copy_vertex.glsl"), fragmentShader);

    var gl = GL.gl;
    var textureLocation = gl.getUniformLocation(this._program, "sampler");

    this._positionAttributeLocation = gl.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(this._program, "hx_texCoord");

    gl.useProgram(this._program);
    gl.uniform1i(textureLocation, 0);
}

CustomCopyShader.prototype = Object.create(Shader.prototype);

CustomCopyShader.prototype.execute = function(rect, texture)
{
    var gl = GL.gl;
    GL.setDepthTest(Comparison.DISABLED);
    GL.setCullMode(CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updatePassRenderState();

    texture.bind(0);

    gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

    GL.enableAttributes(2);

    GL.drawElements(ElementType.TRIANGLES, 6, 0);
};



/**
 * Copies one texture's channels (in configurable ways) to another's.
 * @param channel Can be either x, y, z, w or any 4-component swizzle. default is xyzw, meaning a simple copy
 * @constructor
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CopyChannelsShader(channel, copyAlpha)
{
    channel = channel || "xyzw";
    copyAlpha = copyAlpha === undefined? true : copyAlpha;

    var define = "#define extractChannels(src) ((src)." + channel + ")\n";

    if (copyAlpha) define += "#define COPY_ALPHA\n";

    CustomCopyShader.call(this, define + ShaderLibrary.get("copy_fragment.glsl"));
}

CopyChannelsShader.prototype = Object.create(CustomCopyShader.prototype);



/**
 * Copies one texture's channels while applying the same logic as gl.blendColor. This because it is broken for float textures.
 * @constructor
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
function BlendColorCopyShader()
{
    CustomCopyShader.call(this, ShaderLibrary.get("blend_color_copy_fragment.glsl"));
    this._colorLocation = GL.gl.getUniformLocation(this._program, "blendColor");
    this.setBlendColor(1, 1, 1, 1);
}

BlendColorCopyShader.prototype = Object.create(CustomCopyShader.prototype);

BlendColorCopyShader.prototype.setBlendColor = function(r, g, b, a)
{
    var gl = GL.gl;
    gl.useProgram(this._program);
    gl.uniform4f(this._colorLocation, r, g, b, a);
};


/**
 * Copies the texture from linear space to gamma space.
 *
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
function ApplyGammaShader()
{
    CustomCopyShader.call(this, ShaderLibrary.get("copy_to_gamma_fragment.glsl"));
}

ApplyGammaShader.prototype = Object.create(CustomCopyShader.prototype);

export { CustomCopyShader, CopyChannelsShader, BlendColorCopyShader, ApplyGammaShader };