import {ShaderLibrary} from "../shader/ShaderLibrary";
import {CullMode} from "../Helix";
import {UnlitPass} from "./passes/UnlitPass";
import {MaterialPass} from "./MaterialPass";
import {Material} from "./Material";

/**
 * @classdesc
 * SkyboxMaterial forms the default material to render skyboxes.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkyboxMaterial(texture)
{
    Material.call(this);

    var vertexShader = ShaderLibrary.get("default_skybox_vertex.glsl");
    var fragmentShader = ShaderLibrary.get("default_skybox_fragment.glsl");

    this.writeDepth = false;
    this.cullMode = CullMode.NONE;

    var pass = new UnlitPass(vertexShader, fragmentShader);

    // if no draw buffers, normals and specular don't need to be updated
    this.setPass(MaterialPass.BASE_PASS, pass);
    this._initialized = true;
    this._renderOrder = Number.POSITIVE_INFINITY;

    this.setTexture("hx_skybox", texture);
}

SkyboxMaterial.prototype = Object.create(Material.prototype);

export { SkyboxMaterial };