import {BoundingAABB} from "../scene/BoundingAABB";
import {ObjectPool} from "../core/ObjectPool";
import {SceneVisitor} from "../scene/SceneVisitor";
import {MaterialPass} from "../material/MaterialPass";
import {META} from "../Helix";
import {RenderItem} from "./RenderItem";
import {RenderSortFunctions} from "./RenderSortFunctions";
import {Float4} from "../math/Float4";
import {BoundingVolume} from "../scene/BoundingVolume";

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CascadeShadowCasterCollector()
{
    SceneVisitor.call(this);
    this._renderCameras = null;
	this._viewCameraPos = new Float4();
    this._bounds = new BoundingAABB();
    this._cullPlanes = null;
    this._numCullPlanes = 0;
    this._renderList = [];
    this._renderItemPool = new ObjectPool(RenderItem);
}

CascadeShadowCasterCollector.prototype = Object.create(SceneVisitor.prototype);

CascadeShadowCasterCollector.prototype.getRenderList = function(index) { return this._renderList[index]; };

CascadeShadowCasterCollector.prototype.collect = function(camera, scene, viewCamera)
{
    this.reset();
	viewCamera.worldMatrix.getColumn(3, this._viewCameraPos);

    this._renderItemPool.reset();
	this._bounds.clear();

    var numCascades = META.OPTIONS.numShadowCascades;
    for (var i = 0; i < numCascades; ++i)
        this._renderList[i] = [];

    scene.acceptVisitor(this);

    for (i = 0; i < numCascades; ++i)
        this._renderList[i].sort(RenderSortFunctions.sortOpaques);
};

CascadeShadowCasterCollector.prototype.getBounds = function()
{
    return this._bounds;
};

CascadeShadowCasterCollector.prototype.setRenderCameras = function(cameras)
{
    this._renderCameras = cameras;
};

CascadeShadowCasterCollector.prototype.setCullPlanes = function(cullPlanes, numPlanes)
{
    this._cullPlanes = cullPlanes;
    this._numCullPlanes = numPlanes;
};

CascadeShadowCasterCollector.prototype.visitEntity = function(entity)
{
	var meshInstances = entity.components.meshInstance;

	if (meshInstances) {
		var worldBounds = this.getProxiedBounds(entity);
		var worldMatrix = this.getProxiedMatrix(entity);
		var center = worldBounds._center;
		var cameraPos = this._viewCameraPos;
		var dx = (center.x - cameraPos.x), dy = (center.y - cameraPos.y), dz = (center.z - cameraPos.z);
		var lodDistSqr = dx * dx + dy * dy + dz * dz;

		if (worldBounds.expanse === BoundingVolume.EXPANSE_FINITE)
			this._bounds.growToIncludeBound(worldBounds);

		for (var i = 0, len = meshInstances.length; i < len; ++i) {
			var instance = meshInstances[i];

			if (instance.enabled && instance.castShadows && lodDistSqr >= instance._lodRangeStartSqr && lodDistSqr < instance._lodRangeEndSqr)
				this.visitMeshInstance(instance, worldMatrix, worldBounds, lodDistSqr);
		}
	}
};

CascadeShadowCasterCollector.prototype.visitMeshInstance = function(meshInstance, worldMatrix, worldBounds, renderOrderHint)
{
	var skeleton = meshInstance.skeleton;
	var skeletonMatrices = meshInstance.skeletonMatrices;

    var passIndex = MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS;
    var numCascades = META.OPTIONS.numShadowCascades;

    for (var cascade = 0; cascade < numCascades; ++cascade) {
        var renderList = this._renderList[cascade];
        var renderCamera = this._renderCameras[cascade];

        var contained = worldBounds.intersectsConvexSolid(renderCamera.frustum.planes, 4);

        if (contained) {
            var material = meshInstance.material;

            if (material.hasPass(passIndex)) {
                var renderItem = this._renderItemPool.getItem();
                renderItem.pass = material.getPass(passIndex);
                renderItem.meshInstance = meshInstance;
                renderItem.worldMatrix = worldMatrix;
                renderItem.material = material;
                renderItem.skeleton = skeleton;
                renderItem.skeletonMatrices = skeletonMatrices;
                renderItem.renderOrderHint = renderOrderHint;
                renderItem.worldBounds = worldBounds;

                renderList.push(renderItem);
            }
        }
    }
};

CascadeShadowCasterCollector.prototype.qualifiesBounds = function(bounds)
{
    return bounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes);
};

CascadeShadowCasterCollector.prototype.qualifies = function(object, forceBounds)
{
	return object.hierarchyVisible && (forceBounds || object.worldBounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes));
};

export { CascadeShadowCasterCollector };