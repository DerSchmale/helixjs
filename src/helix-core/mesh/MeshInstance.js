import {BoundingAABB} from "../scene/BoundingAABB";
import {GL} from "../core/GL";
import {Component} from "../entity/Component";
import {SkeletonPose} from "../animation/skeleton/SkeletonPose";
import {Matrix4x4} from "../math/Matrix4x4";
import {VertexLayoutCache} from "./VertexLayoutCache";
import {META} from "../Helix";

var nameCounter = 0;
var layoutCache = new VertexLayoutCache();

/**
 * @classdesc
 * MeshInstance allows bundling a {@linkcode Mesh} with a {@linkcode Material} for rendering, allowing both the geometry
 * and materials to be shared regardless of the combination of both.
 *
 * @property {boolean} castShadows Defines whether or not this MeshInstance should cast shadows.
 * @property mesh The {@linkcode Mesh} providing the geometry for this instance.
 * @property material The {@linkcode Material} to use to render the given Mesh.
 * @property {Mesh} mesh The {@linkcode Mesh} providing the geometry for this instance.
 * @property {Material} material The {@linkcode Material} to use to render the given Mesh.
 * @property {Skeleton} skeleton The {@linkcode Skeleton} that deforms the vertex positions.
 * @property {Array|Texture2D} skeletonMatrices The skeleton matrices of the current skeleton pose.
 * @property {MorphPose} morphPose The {@linkcode MorphPose} defining the weights for each morph target.
 * @property {number} lodRangeStart The minimum distance to render this MeshInstance. Can be used with other
 * MeshInstances to enable LOD support, or singly for pop-in or impostors.
 * @property {number} lodRangeEnd The maximum distance to render this MeshInstance. Can be used with other
 * MeshInstances to enable LOD support, or singly for pop-in or impostors.
 *
 * @param {Mesh} mesh The {@linkcode Mesh} providing the geometry for this instance.
 * @param {Material} material The {@linkcode Material} to use to render the given Mesh.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MeshInstance(mesh, material)
{
	Component.call(this);

	this.name = "hx_meshinstance_" + (nameCounter++);
	this.castShadows = true;
	this._lodRangeStart = 0.0;
	this._lodRangeEnd = 0.0;
	this._lodRangeStartSqr = 0.0;
	this._lodRangeEndSqr = Number.POSITIVE_INFINITY;
	this.skeletonPose = null;
	this.bindShapeMatrix = null;
	this.bindShapeMatrixInverse = null;
	this._bounds = new BoundingAABB();
	this._morphPositions = null;
	this._morphNormals = null;
	this._morphWeights = null;
	this._vertexLayouts = null;
	this._morphPose = null;
	this._skeleton = null;
	this.mesh = mesh;
	this.material = material;
}

MeshInstance.prototype = Object.create(Component.prototype, {
	lodRangeStart: {
		get: function()
		{
			return this._lodRangeStart;
		},

		set: function(value)
		{
			this._lodRangeStart = value;
			this._lodRangeStartSqr = value * value;
		}
	},
	lodRangeEnd: {
		get: function()
		{
			return this._lodRangeEnd;
		},

		set: function(value)
		{
			this._lodRangeEnd = value;
			this._lodRangeEndSqr = value * value;
		}
	},
	skeleton: {
		get: function()
		{
			return this._skeleton;
		},

		set: function(value)
		{
			var pose = new SkeletonPose();
			pose.copyBindPose(value);
			this._bindSkeleton(value, pose, null);
		}
	},

	/**
	 * The global matrices defining the skeleton pose. This could be a Float32Array with flat matrix data, or a texture
	 * containing the data (depending on the capabilities). This is usually set by {@linkcode SkeletonAnimation}, and
	 * should not be handled manually.
	 *
	 * @ignore
	 */
	skeletonMatrices: {
		get: function()
		{
			return this.skeletonPose? this.skeletonPose.getBindMatrices(this._skeleton) : null;
		}
	},

	morphPose: {
		get: function() {
			return this._morphPose;
		},

		set: function(value) {
			var oldPose = this._morphPose;
			if (oldPose)
				oldPose.onChange.unbind(this._onMorphChanged);

			this._morphPose = value;

			if (this._morphPose) {
				this._morphPose.onChange.bind(this._onMorphChanged, this);
				this._onMorphChanged();
			}
			else if (oldPose)
				this._clearMorph();
		}
	},

	mesh: {
		get: function()
		{
			return this._mesh;
		},

		set: function(mesh)
		{
			if (this._mesh === mesh) return;

			if (this._mesh) {
				this._mesh.onLayoutChanged.unbind(this._invalidateVertexLayouts);
				this._mesh.onBoundsChanged.unbind(this.invalidateBounds);
				this._mesh.onMorphDataCreated.unbind(this._initMorphData);
			}

			this._mesh = mesh;

			mesh.onLayoutChanged.bind(this._invalidateVertexLayouts, this);
			mesh.onBoundsChanged.bind(this.invalidateBounds, this);
			mesh.onMorphDataCreated.bind(this._initMorphData, this);

			this._initMorphData();
			this._invalidateVertexLayouts();
			this.invalidateBounds();
		}
	},

	/**
	 * The {@linkcode Material} used to render the Mesh.
	 */
	material: {
		get: function()
		{
			return this._material;
		},

		set: function(value)
		{
			if (this._material)
				this._material.onChange.unbind(this._invalidateVertexLayouts);

			this._material = value;

			if (this._material) {
				this._material.onChange.bind(this._invalidateVertexLayouts, this);

				// TODO: Should this be set explicitly on the material by the user?
				this._material._setUseSkinning(!!this._skeleton);
				this._material._setUseMorphing(
					this._mesh.hasMorphData,
					this._mesh.hasMorphNormals
				);
			}

			this._invalidateVertexLayouts();
		}
	}
});

/**
 * Sets state for this mesh/material combination.
 * @param passType
 * @ignore
 */
MeshInstance.prototype.updateRenderState = function(passType)
{
	if (!this._vertexLayouts)
		this._initVertexLayouts();

	GL.setVertexLayout(this._vertexLayouts[passType].layout, this);
};

/**
 * @ignore
 * @private
 */
MeshInstance.prototype._initVertexLayouts = function()
{
	this._vertexLayouts = layoutCache.getLayouts(this);
};

/**
 * @ignore
 * @private
 */
MeshInstance.prototype._invalidateVertexLayouts = function()
{
	if (this._vertexLayouts)
		layoutCache.free(this);
	this._vertexLayouts = null;
};


/**
 * @ignore
 */
MeshInstance.prototype.toString = function()
{
	return "[MeshInstance(mesh=" + this._mesh.name + ")]";
};

/**
 * @ignore
 * @private
 */
MeshInstance.prototype._onMorphChanged = function()
{
	for (var t = 0; t < 8; ++t) {
		var name = this._morphPose.getMorphTargetName(t);
		var target = null;

		if (name)
			target = this._mesh.getMorphTarget(name);

		if (target) {
			var weight = this._morphPose.getWeight(name);

			var pos = target.positionBuffer;
			var normal = target.hasNormals? target.normalBuffer : null;

			this._setMorphTarget(t, pos, normal, weight);
		}
		else {
			this._setMorphTarget(t, null, null, 0.0);
		}
	}
};

/**
 * @ignore
 * @private
 */
MeshInstance.prototype._clearMorph = function()
{
	for (var t = 0; t < 8; ++t) {
		this._setMorphTarget(t, null, null, 0);
	}
};

/**
 * @ignore
 */
MeshInstance.prototype._setMorphTarget = function(targetIndex, positionBuffer, normalBuffer, weight)
{
	// it's possible this mesh doesn't have morph targets, so check for _morphWeights' existence
	if (!this._morphWeights || targetIndex >= this._morphWeights.length) return;

	this._morphPositions[targetIndex] = positionBuffer;
	if (normalBuffer && this._morphNormals)
		this._morphNormals[targetIndex] = normalBuffer;

	this._morphWeights[targetIndex] = positionBuffer? weight : 0.0;
};

MeshInstance.prototype._updateBounds = function()
{
	this._bounds = this._mesh.bounds;
};

MeshInstance.prototype._initMorphData = function()
{
	this._morphPositions = null;
	this._morphNormals = null;
	this._morphWeights = null;

	if (!this._mesh.hasMorphData) return;

	this._morphPositions = [];

	var numMorphs = 8;

	if (this._mesh.hasMorphNormals) {
		this._morphNormals = [];
		numMorphs = 4;
	}

	this._morphWeights = new Float32Array(numMorphs);

	for (var i = 0; i < numMorphs; ++i) {
		this._morphWeights[i] = 0;
	}

	if (this._material) {
		this._material._setUseMorphing(
			this._mesh.hasMorphData,
			this._mesh.hasMorphNormals
		);
	}
};

MeshInstance.prototype.clone = function()
{
	var clone = new MeshInstance(this._mesh, this._material);
	clone.castShadows = this.castShadows;
	if (this.skeleton)
		clone.skeleton = this.skeleton;
	if (this.skeletonPose)
		clone.skeletonPose = this.skeletonPose.clone();
	return clone;
};


/**
 * @ignore
 */
MeshInstance.prototype._bindSkeleton = function(skeleton, pose, bindShapeMatrix)
{
	this._skeleton = skeleton;
	this.skeletonPose = pose;
	this.bindShapeMatrix = bindShapeMatrix;
	this.bindShapeMatrixInverse = null;

	if (bindShapeMatrix) {
		this.bindShapeMatrixInverse = new Matrix4x4();
		this.bindShapeMatrixInverse.inverseAffineOf(bindShapeMatrix);
	}

	if (this._material)
		this._material._setUseSkinning(!!this._skeleton);
};

MeshInstance.prototype.onRemoved = function()
{
	// clear vertex layout usage from the cache
	this._invalidateVertexLayouts();
};

Component.register("meshInstance", MeshInstance);

export { MeshInstance };