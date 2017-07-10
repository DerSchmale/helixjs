import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";
import {TextureCube} from "../texture/TextureCube";

function ForwardLitProbePass(geometryVertex, geometryFragment, lightingModel, ssao)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel, ssao));
    this._diffuseSlot = this.getTextureSlot("hx_diffuseProbeMap");
    this._specularSlot = this.getTextureSlot("hx_specularProbeMap");
    this._ssaoSlot = this.getTextureSlot("hx_ssao");
    if (!ForwardLitProbePass.dummyTexture) {
        var data = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        data = [ data, data, data, data, data, data ];
        ForwardLitProbePass.dummyTexture = new TextureCube();
        ForwardLitProbePass.dummyTexture.uploadData(data, 1, true);
    }
}

ForwardLitProbePass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
ForwardLitProbePass.prototype.updatePassRenderState = function(renderer, probe)
{
    // TODO: if a texture is not supported, insert dummy black textures
    // TODO: allow setting locality of probes
    this._diffuseSlot.texture = probe.diffuseTexture;
    this._specularSlot.texture = probe.specularTexture;
    MaterialPass.prototype.updatePassRenderState.call(this, renderer);
};

ForwardLitProbePass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel, ssao)
{
    var defines = {
        HX_APPLY_SSAO: ssao? 1 : 0
    };

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_probe_vertex.glsl", defines);

    var fragmentShader =
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