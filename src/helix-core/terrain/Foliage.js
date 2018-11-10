import {Component} from "../entity/Component";
import {MeshBatch} from "../mesh/MeshBatch";
import {Entity} from "../entity/Entity";
import {SceneNode} from "../scene/SceneNode";

/**
 * Foliage provides an LOD mechanism for largely instanced objects over a large area. Internally, the area is divided
 * into hexagonal cells to make LOD distance calculations match more closely.
 *
 * @property {number} worldSize The world size for the entire foliage range.
 * @property {number} numCells The amount of cells to divide the world into. Higher numbers increase the amount of draw
 * calls as well as the amount of frustum tests, but can work better if it causes a better fit with the frustum size.
 *
 *
 * @extends SceneNode
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Foliage(worldSize, numCells)
{
	Component.call(this);
	this._numCells = numCells;
	this._worldSize = worldSize;
	this._classes = {};
	this._batchEntities = [];
	this._container = new SceneNode();

	for (var i = 0; i < numCells * numCells; ++i) {
		var entity = new Entity();
		this._batchEntities.push(entity);
		this._container.attach(entity);
	}
}

Foliage.prototype = Object.create(Component.prototype);

/**
 * This registers a MeshInstance to be used for a certain class type. Multiple MeshInstance objects can be assigned to
 * the same className. All of them will be used when creating instances. The MeshInstance's name, mesh, material,
 * lod range and castShadows properties are used when converting to a MeshBatch internally.
 * @param className The class name to assign the mesh instance to.
 * @param meshInstance The MeshInstance to use as the prototype for the instances.
 */
Foliage.prototype.addLOD = function(className, meshInstance)
{
	var batches = [];
	this._classes[className] = this._classes[className] || [];
	this._classes[className].push(batches);

	for (var i = 0, len = this._numCells * this._numCells; i < len; ++i) {
		var batch = new MeshBatch(meshInstance.mesh, meshInstance.material, false);
		batch.name = meshInstance.name + "_batch_" + i;
		batch.className = meshInstance.name;
		batch.castShadows = meshInstance.castShadows;
		batch.lodRangeStart = meshInstance.lodRangeStart;
		batch.lodRangeEnd = meshInstance.lodRangeEnd;
		batches.push(batch);
		this._batchEntities[i].addComponent(batch);
	}
};

/**
 * Creates an instance of the given class name.
 * @param className The class name for which to create an instance. All LODs with the given name will be added (if
 * filterFunc, when passed, returns true).
 * @param transform The transform to apply to the instance.
 * @param [filterFunc] An optional function that is called with the batch as parameter. This allows to check the batch
 * name and deciding whether or not to add the mesh. For example, if a batch class "tree" had LODs added with names
 * "bark" and "leaves", filterFunc could sometimes be made to return false if the name is "leaves" to simulate dead or
 * winter trees.
 */
Foliage.prototype.createInstance = function(className, transform, filterFunc)
{
	var cellIndex = this._getCell(transform);
	var batches = this._classes[className];

	for (var i = 0, len = batches.length; i < len; ++i) {
		var batch = batches[i][cellIndex];
		if (!filterFunc || filterFunc(batch))
			batch.createInstance(transform);
	}
};

/**
 * @ignore
 * @private
 */
Foliage.prototype._getCell = function (transform)
{
	// position in "cell space"
	var numCells = this._numCells;
	var cellX = (transform.position.x / this._worldSize + .5) * numCells;
	var cellY = (transform.position.y / this._worldSize + .5) * numCells;
	var minDist = Number.POSITIVE_INFINITY;
	var cellIndex = 0;

	var sx = Math.max(0, Math.floor(cellX) - 2);
	var ex = Math.min(sx + 4, numCells);
	var sy = Math.max(0, Math.floor(cellY) - 2);
	var ey = Math.min(sy + 4, numCells);

	for (var y = sy; y < ey; ++y) {
		for (var x = sx; x < ex; ++x) {
			var dx = x - cellX + .5;
			var dy = y - cellY + .5;

			// hexagonal cell offset:
			if (x & 1)
				dy += .5;

			var distSqr = dx * dx + dy * dy;
			if (distSqr < minDist) {
				minDist = distSqr;
				cellIndex = x + y * numCells;
			}
		}
	}

	return cellIndex;
};

/**
 * @ignore
 */
Foliage.prototype.onAdded = function()
{
	this.entity.attach(this._container);
};

/**
 * @ignore
 */
Foliage.prototype.onRemoved = function()
{
	this.entity.detach(this._container);
};

/**
 * @inheritDoc
 */
Foliage.prototype.clone = function()
{
	var foliage = new Foliage(this._worldSize, this._numCells);

	// TODO: Copy instances

	return foliage;
};

Component.register("foliage", Foliage);

export {Foliage};