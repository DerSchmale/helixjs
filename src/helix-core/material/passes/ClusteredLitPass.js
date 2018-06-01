import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {capabilities, META} from "../../Helix";
import {Shader} from "../../shader/Shader";


/**
 * @classdesc
 * This material pass renders all lighting in one fragment shader.
 *
 * @ignore
 *
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @param lights
 * @constructor
 */
function ClusteredLitPass(geometryVertex, geometryFragment, lightingModel)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel));
}

ClusteredLitPass.prototype = Object.create(MaterialPass.prototype);

ClusteredLitPass.prototype._generateShader = function (geometryVertex, geometryFragment, lightingModel)
{
    var extensions = "#derivatives\n";
    var defines = {
        HX_NUM_DIR_LIGHTS: META.OPTIONS.maxDirLights,
		HX_NUM_POINT_SPOT_LIGHTS: META.OPTIONS.maxPointSpotLights,
        HX_NUM_LIGHT_PROBES: META.OPTIONS.maxLightProbes,
        HX_CELL_STRIDE: META.OPTIONS.maxPointSpotLights + 1,
        HX_NUM_CELLS_X: META.OPTIONS.numLightingCellsX,
        HX_NUM_CELLS_Y: META.OPTIONS.numLightingCellsY,
		HX_CELL_ARRAY_LEN: Math.ceil(META.OPTIONS.numLightingCellsX * META.OPTIONS.numLightingCellsY * (META.OPTIONS.maxPointSpotLights + 1) / 4)
    };

    if (capabilities.EXT_SHADER_TEXTURE_LOD) {
        extensions += "#texturelod\n";
    }

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_clustered_vertex.glsl", defines);

    var fragmentShader =
        extensions +
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        lightingModel + "\n\n\n" +
        META.OPTIONS.shadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("directional_light.glsl", defines) + "\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        ShaderLibrary.get("spot_light.glsl") + "\n" +
        ShaderLibrary.get("light_probe.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_clustered_fragment.glsl");

    return new Shader(vertexShader, fragmentShader);
};

export {ClusteredLitPass};