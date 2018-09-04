import {EntitySystem} from "../entity/EntitySystem";
import {PointLight} from "./PointLight";
import {LightProbe} from "./LightProbe";
import {SpotLight} from "./SpotLight";
import {DirectionalLight} from "./DirectionalLight";
import {MeshInstance} from "../mesh/MeshInstance";
import {AsyncTaskQueue} from "../utils/AsyncTaskQueue";

/**
 * @classdesc
 *
 * FixedLightsSystem is System that automatically assigns all lights in a scene to all materials in the scene.
 *
 * @constructor
 */
function FixedLightsSystem()
{
	EntitySystem.call(this);
	this._onLightAddedFuncs = {};
	this._onLightRemovedFuncs = {};
	this._queue = null;
}

FixedLightsSystem.prototype = Object.create(EntitySystem.prototype);

/**
 * @ignore
 */
FixedLightsSystem.prototype.onStarted = function()
{
	this._lights = [];
	this._meshSet = this.getEntitySet([MeshInstance]);
	this._meshSet.onEntityAdded.bind(this._onMeshInstanceAdded, this);
	this._pointSet = this._initSet(PointLight);
	this._spotSet = this._initSet(SpotLight);
	this._dirSet = this._initSet(DirectionalLight);
	this._probeSet = this._initSet(LightProbe);
	this._assignLights();
};

/**
 * @ignore
 * @private
 */
FixedLightsSystem.prototype.onStopped = function()
{
	this._meshSet.onEntityAdded.unbind(this._onMeshInstanceAdded);
	this._destroySet(this._pointSet, PointLight);
	this._destroySet(this._spotSet, SpotLight);
	this._destroySet(this._dirSet, DirectionalLight);
	this._destroySet(this._probeSet, LightProbe);
	this._meshSet.free();
};

/**
 * @ignore
 * @private
 */
FixedLightsSystem.prototype._initSet = function(type)
{
	var set = this.getEntitySet([type]);
	this._onLightAddedFuncs[type] = this._onLightAdded.bind(this, type);
	this._onLightRemovedFuncs[type] = this._onLightRemoved.bind(this, type);
	set.onEntityAdded.bind(this._onLightAddedFuncs[type]);
	set.onEntityRemoved.bind(this._onLightRemovedFuncs[type]);
	addLights(this._lights, set, type);
	return set;
};

/**
 * @ignore
 * @private
 */
FixedLightsSystem.prototype._destroySet = function(set, type)
{
	set.onEntityAdded.unbind(this._onLightAddedFuncs[type]);
	set.onEntityRemoved.unbind(this._onLightRemovedFuncs[type]);
	set.free();
};


/**
 * @ignore
 */
FixedLightsSystem.prototype._onLightAdded = function(lightType, entity)
{
	var light = entity.getFirstComponentByType(lightType);
	this._lights.push(light);
	this._assignLights();
};

FixedLightsSystem.prototype._onLightRemoved = function(lightType, entity)
{
	var light = entity.getFirstComponentByType(lightType);
	var index = this._lights.indexOf(light);
	this._lights.splice(index, 1);
	this._assignLights();
};

/**
 * @ignore
 * @private
 */
FixedLightsSystem.prototype._onMeshInstanceAdded = function(entity)
{
	this._queueOrAssign(entity, this._lights);
};

/**
 * @ignore
 * @private
 */
FixedLightsSystem.prototype._assignLights = function()
{
	// all lights need to be re-assigned, cancel this
	if (this._queue)
		this._queue.cancel();

	// this will invalidate all materials, so do things one at a time
	for (var i = 0, len = this._meshSet.numEntities; i < len; ++i)
		this._queueOrAssign(this._meshSet.getEntity(i));
};

/**
 * @ignore
 * @material
 */
FixedLightsSystem.prototype._queueOrAssign = function(entity)
{
	if (!this._queue || !this._queue.isRunning)
		this._queue = new AsyncTaskQueue();

	// if material isn't initialized, it's okay to assign lights directly, since the material will be compiled on render
	// anyway
	var meshInstance = entity.getFirstComponentByType(MeshInstance);
	var material = meshInstance.material;
	if (material._initialized)
		this._queue.queue(assignLights, material, this._lights);
	else
		assignLights(material, this._lights);

	if (!this._queue.isRunning)
		this._queue.execute();
};

function assignLights(material, lights)
{
	material.fixedLights = lights;
	material.init();
}

function addLights(lights, set, componentType)
{
	for (var i = 0, len = set.numEntities; i < len; ++i) {
		var light = set.getEntity(i).getFirstComponentByType(componentType);
		lights.push(light);
	}
}

export { FixedLightsSystem };