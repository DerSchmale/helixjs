import {capabilities, Comparison, CullMode, ElementType, META} from "../../Helix";
import {GL} from "../../core/GL";
import {Shader} from "../../shader/Shader";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {RectMesh} from "../../mesh/RectMesh";
import {MathX} from "../../math/MathX";

function DeferredLightProbeShader(probe)
{
    Shader.call(this);
    var defines = {};

    var extensions = "";
    if (capabilities.EXT_SHADER_TEXTURE_LOD) {
        extensions += "#texturelod\n";
    }

    if (probe.size)
        defines.HX_LOCAL_PROBE = 1;

    this._probe = probe;

    if (probe.diffuseTexture)
        defines.HX_DIFFUSE_PROBE = 1;

    if (probe.specularTexture)
        defines.HX_SPECULAR_PROBE = 1;

    var vertex = ShaderLibrary.get("deferred_probe_vertex.glsl", defines);
    var fragment =
        extensions +
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        META.OPTIONS.defaultLightingModel + "\n\n\n" +
        ShaderLibrary.get("light_probe.glsl") + "\n" +
        ShaderLibrary.get("deferred_probe_fragment.glsl");

    this.init(vertex, fragment);

    var gl = GL.gl;
    var p = this._program;
    gl.useProgram(p);

    this._colorLocation = gl.getUniformLocation(p, "hx_directionalLight.color");
    this._dirLocation = gl.getUniformLocation(p, "hx_directionalLight.direction");

    if (probe.size) {
        this._sizeLocation = gl.getUniformLocation(p, "hx_probeSize");
        this._positionLocation = gl.getUniformLocation(p, "hx_probePosition");
    }

    this._positionAttributeLocation = gl.getAttribLocation(p, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(p, "hx_texCoord");

    var albedoSlot = gl.getUniformLocation(p, "hx_gbufferAlbedo");
    var normalDepthSlot = gl.getUniformLocation(p, "hx_gbufferNormalDepth");
    var specularSlot = gl.getUniformLocation(p, "hx_gbufferSpecular");
    var specProbeSlot = gl.getUniformLocation(p, "hx_specularProbeMap");
    var diffuseProbeSlot = gl.getUniformLocation(p, "hx_diffuseProbeMap");
    var ssaoSlot = gl.getUniformLocation(p, "hx_ssao");

    this._numMipsLocation = this.getUniformLocation("hx_specularProbeNumMips");

    gl.uniform1i(albedoSlot, 0);
    gl.uniform1i(normalDepthSlot, 1);
    gl.uniform1i(specularSlot, 2);
    gl.uniform1i(ssaoSlot, 3);
    gl.uniform1i(specProbeSlot, 4);
    gl.uniform1i(diffuseProbeSlot, 5);
}

DeferredLightProbeShader.prototype = Object.create(Shader.prototype);

DeferredLightProbeShader.prototype.execute = function(renderer)
{
    var gl = GL.gl;

    gl.useProgram(this._program);

    var texs = renderer._gbuffer.textures;
    texs[0].bind(0);
    texs[1].bind(1);
    texs[2].bind(2);

    var specularProbe = this._probe.specularTexture;
    var diffuseProbe = this._probe.diffuseTexture;

    if ((specularProbe && specularProbe.size === 0) ||
        (diffuseProbe && diffuseProbe.size === 0)) return;

    renderer._ssaoTexture.bind(3);

    if (specularProbe) {
        specularProbe.bind(4);
        gl.uniform1f(this._numMipsLocation, Math.floor(MathX.log2(specularProbe.size)));
    }

    if (diffuseProbe)
        diffuseProbe.bind(5);

    if (this._sizeLocation) {
        var m = this._probe.worldMatrix._m;
        gl.uniform1f(this._sizeLocation, this._probe._size * .5);
        gl.uniform3f(this._positionLocation, m[12], m[13], m[14]);
    }

    GL.setCullMode(CullMode.NONE);

    this.updatePassRenderState(renderer._camera, renderer);

    var rect = RectMesh.DEFAULT;
    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

    GL.enableAttributes(2);

    GL.drawElements(ElementType.TRIANGLES, 6, 0);
};

export { DeferredLightProbeShader };