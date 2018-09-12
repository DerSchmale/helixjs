import {Component} from "../entity/Component";
import {Entity} from "../entity/Entity";
import {CylinderPrimitive} from "../mesh/primitives/CylinderPrimitive";
import {BasicMaterial} from "../material/BasicMaterial";
import {LightingModel} from "../render/LightingModel";
import {MaterialPass} from "../material/MaterialPass";
import {Comparison} from "../Helix";
import {MeshInstance} from "../mesh/MeshInstance";
import {SpherePrimitive} from "../mesh/primitives/SpherePrimitive";

function ShowSkeleton()
{
	Component.call(this);
}

Component.create(ShowSkeleton);

ShowSkeleton.prototype.onAdded = function()
{
	var skeleton = this.entity.skeleton;
	if (!skeleton) return;
	this._debugEntity = new Entity();
	this.entity.attach(this._debugEntity);
	this._entities = [];

	var material = new BasicMaterial();
	var sphere = new SpherePrimitive({radius: 0.15});
	var cylinder = new CylinderPrimitive({radius: 0.1, height: 1.0, alignment: CylinderPrimitive.ALIGN_Y});
	cylinder.translate(0.0, 0.5, 0.0);
	material.color = 0xff00ff;
	material.lightingModel = LightingModel.Unlit;
	material.renderOrder = 100000;
	material.getPass(MaterialPass.BASE_PASS).depthTest = Comparison.ALWAYS;

	for (var i = 0; i < skeleton.joints.length; ++i) {
		var parentIndex = skeleton.joints[i].parentIndex;
		var entity = new Entity();
		var geom = parentIndex === -1? sphere : cylinder;
		var meshInstance = new MeshInstance(geom, material);

		entity.addComponent(meshInstance);
		this._entities[i] = entity;
		this._debugEntity.attach(entity);
	}
};

ShowSkeleton.prototype.onRemoved = function()
{
	if (!this._debugEntity) return;
	this.entity.detach(this._debugEntity);
};

ShowSkeleton.prototype.onUpdate = function(dt)
{
	if (!this._debugEntity) return;

	var skeleton = this.entity.skeleton;
	var joints = skeleton.joints;
	var skeletonPose = this.entity.skeletonPose;

	for (var i = 0, len = joints.length; i < len; ++i) {
		var joint = joints[i];
		var pose = skeletonPose.getGlobalMatrix(skeleton, i);
		var parentIndex = joint.parentIndex;
		var entity = this._entities[i];

		pose.getColumn(3, entity.position);

		if (parentIndex > -1) {
			parent = this._entities[parentIndex];

			var matrix = entity.matrix;
			var dist = parent.position.distanceTo(entity.position);
			matrix.lookAt(parent.position, entity.position);
			matrix.prependScale(1.0, dist, 1.0);
			entity.matrix = matrix;
		}
	}
};

export { ShowSkeleton };