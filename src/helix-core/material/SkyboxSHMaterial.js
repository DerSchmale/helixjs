import {ShaderLibrary} from "../shader/ShaderLibrary";
import {CullMode} from "../Helix";
import {UnlitPass} from "./passes/UnlitPass";
import {MaterialPass} from "./MaterialPass";
import {Material} from "./Material";
import {RenderPath} from "../render/RenderPath";

/**
 * @classdesc
 * SkyboxSHMaterial forms the material to render skyboxes from {@linkcode SphericalHarmonicsRGB}.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkyboxSHMaterial(sh)
{
    Material.call(this);

    var vertexShader = ShaderLibrary.get("default_skybox_vertex.glsl");
    var fragmentShader = ShaderLibrary.get("sh_skybox_fragment.glsl");

    this.writeDepth = false;
    this.cullMode = CullMode.NONE;

    var pass = new UnlitPass(vertexShader, fragmentShader);

    // if no draw buffers, normals and specular don't need to be updated
    this.setPass(MaterialPass.BASE_PASS, pass);
    this._renderPath = RenderPath.FORWARD_FIXED;
    this._initialized = true;
    this._renderOrder = Number.POSITIVE_INFINITY;

    this.setUniformArray("hx_sh", sh._coefficients);
}

SkyboxSHMaterial.prototype = Object.create(Material.prototype);

export { SkyboxSHMaterial };