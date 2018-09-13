import {SkyboxMaterial} from "../material/SkyboxMaterial";
import {Material} from "../material/Material";
import {BoxPrimitive} from "../mesh/primitives/BoxPrimitive";
import {BoundingVolume} from "../scene/BoundingVolume";
import {Entity} from "../entity/Entity";
import {MeshInstance} from "../mesh/MeshInstance";


/**
 * @classdesc
 * Skybox provides a backdrop "at infinity" for the scene.
 *
 * @param materialOrTexture Either a {@linkcode TextureCube} or a {@linkcode Material} used to render the skybox. If a
 * texture is passed, {@linkcode SkyboxMaterial} is used as material.
 * @constructor
 *
 * @property material The material used by the texture.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Skybox(materialOrTexture)
{
    Entity.call(this);

    if (!(materialOrTexture instanceof Material))
        materialOrTexture = new SkyboxMaterial(materialOrTexture);

    //var model = new HX.PlanePrimitive({alignment: HX.PlanePrimitive.ALIGN_XY, width: 2, height: 2});
    var mesh = new BoxPrimitive({width: 1, invert: true});
	mesh.bounds.clear(BoundingVolume.EXPANSE_INFINITE);
	mesh._boundsInvalid = false;

    this._meshInstance = new MeshInstance(mesh, materialOrTexture);
    this.addComponent(this._meshInstance);
}

Skybox.prototype = Object.create(Entity.prototype, {
	material: {
		get: function() {
			return this._meshInstance.material;
		},

		set: function(value) {
			this._meshInstance.material = value;
		}
	}
});

/**
 * @ignore
 */
Skybox.prototype.setTexture = function(texture)
{
	this.material.setTexture("hx_skybox", texture);
};

/**
 * @ignore
 */
Skybox.prototype.copyFrom = function(src)
{
	Entity.prototype.copyFrom.call(this, src);

};

/**
 * @inheritDoc
 */
Skybox.prototype.clone = function()
{
	var clone = new Skybox(this._meshInstance.material);
	clone.copyFrom(this);
	return clone;
};

export { Skybox };