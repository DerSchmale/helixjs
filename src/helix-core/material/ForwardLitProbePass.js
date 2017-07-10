import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";
import {TextureCube} from "../texture/TextureCube";
import {GL} from "../core/GL";
import {MathX} from "../math/MathX";
import {capabilities} from "../Helix";

function ForwardLitProbePass(geometryVertex, geometryFragment, lightingModel, ssao)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel, ssao));
    this._diffuseSlot = this.getTextureSlot("hx_diffuseProbeMap");
    this._specularSlot = this.getTextureSlot("hx_specularProbeMap");
    this._ssaoSlot = this.getTextureSlot("hx_ssao");
    this._numMipsLocation = this.getUniformLocation("hx_specularProbeNumMips");
    if (!ForwardLitProbePass.dummyTexture) {
        var data = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        data = [ data, data, data, data, data, data ];
        ForwardLitProbePass.dummyTexture = new TextureCube();
        ForwardLitProbePass.dummyTexture.uploadData(data, 1, true);
    }
}

ForwardLitProbePass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
ForwardLitProbePass.prototype.updatePassRenderState = function(camera, renderer, probe)
{
    var gl = GL.gl;
    gl.useProgram(this._shader._program);

    // TODO: allow setting locality of probes
    this._diffuseSlot.texture = probe.diffuseTexture || ForwardLitProbePass.dummyTexture;
    var specularTex = probe.specularTexture || ForwardLitProbePass.dummyTexture;

    this._specularSlot.texture = specularTex;
    gl.uniform1f(this._numMipsLocation, Math.floor(MathX.log2(specularTex.size)));
    MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);
};

ForwardLitProbePass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel, ssao)
{
    var defines = {
        HX_APPLY_SSAO: ssao? 1 : 0
    };

    var extensions = "";
    if (capabilities.EXT_SHADER_TEXTURE_LOD) {
        extensions += "#texturelod\n";
    }

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_probe_vertex.glsl", defines);

    var fragmentShader =
        extensions +
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        lightingModel + "\n\n\n" +
        ShaderLibrary.get("light_probe.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_probe_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

ForwardLitProbePass.prototype._setSSAOTexture = function(texture)
{
    this._ssaoSlot.texture = texture;
};

export { ForwardLitProbePass };