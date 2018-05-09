import {MaterialPass} from "../MaterialPass";
import {DirectionalLight} from "../../light/DirectionalLight";
import {PointLight} from "../../light/PointLight";
import {LightProbe} from "../../light/LightProbe";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {capabilities, META} from "../../Helix";
import {Float4} from "../../math/Float4";
import {Matrix4x4} from "../../math/Matrix4x4";
import {MathX} from "../../math/MathX";
import {Shader} from "../../shader/Shader";
import {GL} from "../../core/GL";
import {SpotLight} from "../../light/SpotLight";


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
    var extensions = "";
    var defines = {
        HX_NUM_DIR_LIGHTS: META.OPTIONS.maxDirLights
    };

    if (capabilities.EXT_SHADER_TEXTURE_LOD) {
        extensions += "#texturelod\n";
    }

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_clustered_vertex.glsl", defines);

    var fragmentShader =
        extensions +
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        lightingModel + "\n\n\n" +
        META.OPTIONS.directionalShadowFilter.getGLSL() + "\n" +
        META.OPTIONS.spotShadowFilter.getGLSL() + "\n" +
        META.OPTIONS.pointShadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("directional_light.glsl", defines) + "\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        ShaderLibrary.get("spot_light.glsl") + "\n" +
        ShaderLibrary.get("light_probe.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_clustered_fragment.glsl");

    return new Shader(vertexShader, fragmentShader);
};

export {ClusteredLitPass};