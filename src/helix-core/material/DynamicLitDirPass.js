import {MaterialPass} from "./MaterialPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Shader} from "../shader/Shader";

function DynamicLitDirPass(geometryVertex, geometryFragment, shadows)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, shadows));
}

DynamicLitDirPass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
DynamicLitDirPass.prototype.updatePassRenderState = function(renderer, light)
{
    MaterialPass.prototype.updatePassRenderState.call(this, renderer);

    // SO, START FROM HERE: Update light data
    // if ! first pass (how do we know?), update blend state to be additive
};

DynamicLitDirPass.prototype._generateShader = function(geometryVertex, geometryFragment, shadows)
{
    var defines = {};

    if (shadows)
        defines.HX_SHADOW_MAP = 1;

    var fragmentShader = ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_lit_dynamic_dir_fragment.glsl", defines);
    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_lit_dynamic_dir_vertex.glsl", defines);
    return new Shader(vertexShader, fragmentShader);
};

export { DynamicLitDirPass };