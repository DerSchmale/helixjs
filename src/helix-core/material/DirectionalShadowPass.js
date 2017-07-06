import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {DirectionalLight} from "../light/DirectionalLight";
import {Shader} from "../shader/Shader";

function DirectionalShadowPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

DirectionalShadowPass.prototype = Object.create(MaterialPass.prototype);

DirectionalShadowPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = ShaderLibrary.get("snippets_geometry.glsl") + "\n" + DirectionalLight.SHADOW_FILTER.getGLSL() + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_dir_shadow_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_unlit_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

export { DirectionalShadowPass };