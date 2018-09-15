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

OmniShadowCasterCollector.prototype.collect = function(cameras, scene)
{
    this.reset();
    this._cameras = cameras;
    this._renderLists = [];

    var pos = this._cameraPos = cameras[0].position;

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

OmniShadowCasterCollector.prototype.visitMeshInstance = function (meshInstance)
{
	if (!meshInstance.castShadows || !meshInstance.enabled) return;

	var entity = meshInstance.entity;
	var worldBounds = this.getProxiedBounds(entity);
	var worldMatrix = this.getProxiedMatrix(entity);
    // basically, this does 6 frustum tests at once
    var planes = this._octantPlanes;
    var side0 = worldBounds.classifyAgainstPlane(planes[0]);
    var side1 = worldBounds.classifyAgainstPlane(planes[1]);
    var side2 = worldBounds.classifyAgainstPlane(planes[2]);
    var side3 = worldBounds.classifyAgainstPlane(planes[3]);
    var side4 = worldBounds.classifyAgainstPlane(planes[4]);
    var side5 = worldBounds.classifyAgainstPlane(planes[5]);

    if (side1 >= 0 && side2 <= 0 && side4 >= 0 && side5 <= 0)
        this._addTo(meshInstance, 0, worldBounds, worldMatrix);

    if (side1 <= 0 && side2 >= 0 && side4 <= 0 && side5 >= 0)
        this._addTo(meshInstance, 1, worldBounds, worldMatrix);

    if (side0 >= 0 && side3 <= 0 && side4 >= 0 && side5 >= 0)
        this._addTo(meshInstance, 2, worldBounds, worldMatrix);

    if (side0 <= 0 && side3 >= 0 && side4 <= 0 && side5 <= 0)
        this._addTo(meshInstance, 3, worldBounds, worldMatrix);

    if (side0 <= 0 && side1 <= 0 && side2 <= 0 && side3 <= 0)
        this._addTo(meshInstance, 4, worldBounds, worldMatrix);

    if (side0 >= 0 && side1 >= 0 && side2 >= 0 && side3 >= 0)
        this._addTo(meshInstance, 5, worldBounds, worldMatrix);
};

OmniShadowCasterCollector.prototype._addTo = function(meshInstance, cubeFace, worldBounds, worldMatrix)
{
    var skeleton = meshInstance.skeleton;
    var skeletonMatrices = meshInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;
    var camPos = this._cameraPos;
    var camPosX = camPos.x, camPosY = camPos.y, camPosZ = camPos.z;
    var renderList = this._renderLists[cubeFace];
    var material = meshInstance.material;
    var renderItem = renderPool.getItem();

    renderItem.material = material;
    renderItem.meshInstance = meshInstance;
    renderItem.skeleton = skeleton;
    renderItem.skeletonMatrices = skeletonMatrices;
    var center = worldBounds._center;
    var dx = camPosX - center.x;
    var dy = camPosY - center.y;
    var dz = camPosZ - center.z;
    renderItem.renderOrderHint = dx * dx + dy * dy + dz * dz;
    renderItem.worldMatrix = worldMatrix;
    renderItem.worldBounds = worldBounds;

    renderList.push(renderItem);
};

OmniShadowCasterCollector.prototype.qualifies = function(object, forceBounds)
{
    // for now, only interested if it intersects the point light volume at all
    return object.hierarchyVisible && (forceBounds || object.worldBounds.intersectsBound(this._lightBounds));
};

export { OmniShadowCasterCollector };