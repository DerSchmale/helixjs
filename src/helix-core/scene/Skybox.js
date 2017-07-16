import {SkyboxMaterial} from "../material/SkyboxMaterial";
import {Material} from "../material/Material";
import {BoxPrimitive} from "../mesh/primitives/BoxPrimitive";
import {BoundingVolume} from "../scene/BoundingVolume";
import {ModelInstance} from "../mesh/ModelInstance";


/**
 * @classdesc
 * Skybox provides a backdrop "at infinity" for the scene.
 *
 * @param materialOrTexture Either a {@linkcode TextureCube} or a {@linkcode Material} used to render the skybox. If a
 * texture is passed, {@linkcode SkyboxMaterial} is used as material.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Skybox(materialOrTexture)
{
    if (!(materialOrTexture instanceof Material))
        materialOrTexture = new SkyboxMaterial(materialOrTexture);

    //var model = new HX.PlanePrimitive({alignment: HX.PlanePrimitive.ALIGN_XY, width: 2, height: 2});
    var model = new BoxPrimitive({width: 1, invert: true});
    model.localBounds.clear(BoundingVolume.EXPANSE_INFINITE);
    this._modelInstance = new ModelInstance(model, materialOrTexture);
}

Skybox.prototype = {};

export { Skybox };