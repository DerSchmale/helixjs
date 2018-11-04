import {ObjectPool} from "../core/ObjectPool";
import {SceneVisitor} from "../scene/SceneVisitor";
import {RenderItem} from "./RenderItem";
import {RenderSortFunctions} from "./RenderSortFunctions";
import {Float4} from "../math/Float4";

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function OmniShadowCasterCollector()
{
    SceneVisitor.call(this);
    this._lightBounds = null;
    this._renderLists = [];
    this._renderItemPool = new ObjectPool(RenderItem);
    this._octantPlanes = [];
    this._cameraPos = null;
	this._viewCameraPos = new Float4();

    this._octantPlanes[0] = new Float4(0.0, 1.0, -1.0, 0.0);
    this._octantPlanes[1] = new Float4(1.0, 0.0, -1.0, 0.0);
    this._octantPlanes[2] = new Float4(-1.0, 0.0, -1.0, 0.0);
    this._octantPlanes[3] = new Float4(0.0, -1.0, -1.0, 0.0);
    this._octantPlanes[4] = new Float4(1.0, 1.0, 0.0, 0.0);
    this._octantPlanes[5] = new Float4(-1.0, 1.0, 0.0, 0.0);

    for (var i = 0; i < 6; ++i) {
        this._octantPlanes[i].normalize();
    }
}

OmniShadowCasterCollector.prototype = Object.create(SceneVisitor.prototype);

OmniShadowCasterCollector.prototype.getRenderList = function(faceIndex) { return this._renderLists[faceIndex]; };

OmniShadowCasterCollector.prototype.setLightBounds = function(value)
{
    this._lightBounds = value;
};

OmniShadowCasterCollector.prototype.collect = function(camera, scene, viewCamera)
{
    this.reset();
    this._camera = camera;
    this._renderLists = [];

	viewCamera.worldMatrix.getColumn(3, this._viewCameraPos);

    var pos = this._cameraPos = camera.position;

    for (var i = 0; i < 6; ++i) {
        var plane = this._octantPlanes[i];
        plane.w = -(pos.x * plane.x + pos.y * plane.y + pos.z * plane.z);
        this._renderLists[i] = [];
    }

    this._renderItemPool.reset();

    scene.acceptVisitor(this);

    for (i = 0; i < 6; ++i)
        this._renderLists[i].sort(RenderSortFunctions.sortOpaques);
};

OmniShadowCasterCollector.prototype.visitEntity = function(entity)
{
	var meshInstances = entity.components.meshInstance;

	if (meshInstances) {
		var worldBounds = this.getProxiedBounds(entity);
		var worldMatrix = this.getProxiedMatrix(entity);
		var center = worldBounds._center;
		var cameraPos = this._viewCameraPos;
		var dx = (center.x - cameraPos.x), dy = (center.y - cameraPos.y), dz = (center.z - cameraPos.z);
		var lodDistSqr = dx * dx + dy * dy + dz * dz;

		for (var i = 0, len = meshInstances.length; i < len; ++i) {
			var instance = meshInstances[i];

			if (instance.enabled && instance.castShadows && lodDistSqr >= instance._lodRangeStartSqr && lodDistSqr < instance._lodRangeEndSqr)
				this.visitMeshInstance(instance, worldMatrix, worldBounds, lodDistSqr);
		}
	}
};

OmniShadowCasterCollector.prototype.visitMeshInstance = function(meshInstance, worldMatrix, worldBounds, renderOrderHint)
{
    // basically, this does 6 frustum tests at once
    var planes = this._octantPlanes;
    var side0 = worldBounds.classifyAgainstPlane(planes[0]);
    var side1 = worldBounds.classifyAgainstPlane(planes[1]);
    var side2 = worldBounds.classifyAgainstPlane(planes[2]);
    var side3 = worldBounds.classifyAgainstPlane(planes[3]);
    var side4 = worldBounds.classifyAgainstPlane(planes[4]);
    var side5 = worldBounds.classifyAgainstPlane(planes[5]);

    if (side1 >= 0 && side2 <= 0 && side4 >= 0 && side5 <= 0)
        this._addTo(meshInstance, 0, worldBounds, worldMatrix, renderOrderHint);

    if (side1 <= 0 && side2 >= 0 && side4 <= 0 && side5 >= 0)
        this._addTo(meshInstance, 1, worldBounds, worldMatrix, renderOrderHint);

    if (side0 >= 0 && side3 <= 0 && side4 >= 0 && side5 >= 0)
        this._addTo(meshInstance, 2, worldBounds, worldMatrix, renderOrderHint);

    if (side0 <= 0 && side3 >= 0 && side4 <= 0 && side5 <= 0)
        this._addTo(meshInstance, 3, worldBounds, worldMatrix, renderOrderHint);

    if (side0 <= 0 && side1 <= 0 && side2 <= 0 && side3 <= 0)
        this._addTo(meshInstance, 4, worldBounds, worldMatrix, renderOrderHint);

    if (side0 >= 0 && side1 >= 0 && side2 >= 0 && side3 >= 0)
        this._addTo(meshInstance, 5, worldBounds, worldMatrix, renderOrderHint);
};

OmniShadowCasterCollector.prototype._addTo = function(meshInstance, cubeFace, worldBounds, worldMatrix, renderOrderHint)
{
    var skeleton = meshInstance.skeleton;
    var skeletonMatrices = meshInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;

    var renderList = this._renderLists[cubeFace];
    var material = meshInstance.material;
    var renderItem = renderPool.getItem();

    renderItem.material = material;
    renderItem.meshInstance = meshInstance;
    renderItem.skeleton = skeleton;
    renderItem.skeletonMatrices = skeletonMatrices;

    renderItem.renderOrderHint = renderOrderHint;
    renderItem.worldMatrix = worldMatrix;
    renderItem.worldBounds = worldBounds;

    renderList.push(renderItem);
};

OmniShadowCasterCollector.prototype.qualifiesBounds = function(bounds)
{
	return bounds.intersectsBound(this._lightBounds);
};

OmniShadowCasterCollector.prototype.qualifies = function(object, forceBounds)
{
    // for now, only interested if it intersects the point light volume at all
    return object.hierarchyVisible && (forceBounds || object.worldBounds.intersectsBound(this._lightBounds));
};

export { OmniShadowCasterCollector };