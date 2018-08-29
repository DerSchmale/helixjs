import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {GL} from "../../core/GL";
import {MathX} from "../../math/MathX";
import {capabilities, DEFAULTS} from "../../Helix";

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ProbeLightingPass(geometryVertex, geometryFragment, lightingModel)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel));
    this._diffuseSlot = this.getTextureSlot("hx_diffuseProbeMap");
    this._specularSlot = this.getTextureSlot("hx_specularProbeMap");
    this._numMipsLocation = this.getUniformLocation("hx_specularProbeNumMips");
    this._localLocation = this.getUniformLocation("hx_probeLocal");
    this._sizeLocation = this.getUniformLocation("hx_probeSize");
    this._positionLocation = this.getUniformLocation("hx_probePosition");
}

ProbeLightingPass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
ProbeLightingPass.prototype.updatePassRenderState = function(camera, renderer, probe)
{
    var gl = GL.gl;
    gl.useProgram(this.shader.program);

    // TODO: allow setting locality of probes
    this._diffuseSlot.texture = probe.diffuseTexture || DEFAULTS.DARK_CUBE_TEXTURE;
    var specularTex = probe.specularTexture || DEFAULTS.DARK_CUBE_TEXTURE;

    this._specularSlot.texture = specularTex;
    gl.uniform1f(this._numMipsLocation, Math.floor(MathX.log2(specularTex.size)));
    gl.uniform1f(this._localLocation, probe._size? 1.0 : 0.0);
    gl.uniform1f(this._sizeLocation, probe._size || 0.0);
    var m = probe.entity.worldMatrix._m;
    gl.uniform3f(this._positionLocation, m[12], m[13], m[14]);
    MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);
};

ProbeLightingPass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel)
{
    var extensions = "";
    if (capabilities.EXT_SHADER_TEXTURE_LOD) {
        extensions += "#texturelod\n";
    }

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_probe_vertex.glsl");

    var fragmentShader =
        extensions +
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        lightingModel + "\n\n\n" +
        ShaderLibrary.get("light_probe.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_probe_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { ProbeLightingPass };