import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";
import {GL} from "../core/GL";
import {Comparison, CullMode, ElementType} from "../Helix";
import {RectMesh} from "../mesh/RectMesh";
import {VertexLayout} from "../mesh/VertexLayout";
import {VertexLayoutCache} from "../mesh/VertexLayoutCache";

/**
 * @param fragmentShader
 * @constructor
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CustomCopyShader(fragmentShader, mesh)
{
    Shader.call(this);
    this.init(ShaderLibrary.get("copy_vertex.glsl"), fragmentShader);

    var gl = GL.gl;
    var textureLocation = gl.getUniformLocation(this.program, "sampler");

    this._mesh = mesh || RectMesh.DEFAULT;
    this._layout = new VertexLayout(this._mesh, this);

    gl.useProgram(this.program);
    gl.uniform1i(textureLocation, 0);
}

CustomCopyShader.prototype = Object.create(Shader.prototype);

CustomCopyShader.prototype.execute = function(texture)
{
    GL.setDepthTest(Comparison.DISABLED);
    GL.setCullMode(CullMode.NONE);
    GL.setShader(this);
	GL.setVertexLayout(this._layout);

    texture.bind(0);

    GL.drawElements(ElementType.TRIANGLES, 6);
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
    this._colorLocation = GL.gl.getUniformLocation(this.program, "blendColor");
    this.setBlendColor(1, 1, 1, 1);
}

BlendColorCopyShader.prototype = Object.create(CustomCopyShader.prototype);

BlendColorCopyShader.prototype.setBlendColor = function(r, g, b, a)
{
    var gl = GL.gl;
    gl.useProgram(this.program);
    gl.uniform4f(this._colorLocation, r, g, b, a);
};


/**
 * @classdesc
 * Copies the texture from linear space to gamma space.
 *
 * @ignore
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ApplyGammaShader()
{
    CustomCopyShader.call(this, ShaderLibrary.get("copy_to_gamma_fragment.glsl"));
}

ApplyGammaShader.prototype = Object.create(CustomCopyShader.prototype);

function EncFloatShader(channel)
{
	channel = channel || "x";

	var define = "#define extractChannels(src) ((src)." + channel + ")\n";
	CustomCopyShader.call(this, define + ShaderLibrary.get("rgbe_enc.glsl"));
}

EncFloatShader.prototype = Object.create(CustomCopyShader.prototype);

function DebugNormalsShader()
{
    CustomCopyShader.call(this, ShaderLibrary.get("debug_normals_fragment.glsl"))
}

DebugNormalsShader.prototype = Object.create(CustomCopyShader.prototype);

function DebugDepthShader()
{
    CustomCopyShader.call(this, ShaderLibrary.get("debug_depth_fragment.glsl"))
}

DebugDepthShader.prototype = Object.create(CustomCopyShader.prototype);

function DebugMotionVectorShader()
{
    CustomCopyShader.call(this, ShaderLibrary.get("debug_motion_vector_fragment.glsl"))
}

DebugMotionVectorShader.prototype = Object.create(CustomCopyShader.prototype);

export { CustomCopyShader, CopyChannelsShader, BlendColorCopyShader, ApplyGammaShader, DebugNormalsShader, DebugDepthShader, DebugMotionVectorShader };