import {ObjectPool} from "../core/ObjectPool";
import {SceneVisitor} from "../scene/SceneVisitor";
import {RenderItem} from "./RenderItem";
import {RenderSortFunctions} from "./RenderSortFunctions";
import {Float4} from "../math/Float4";
import {RenderCollector} from "./RenderCollector";

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpotShadowCasterCollector()
{
    SceneVisitor.call(this);
    this._frustumPlanes = null;
    this._renderList = [];
    this._renderItemPool = new ObjectPool(RenderItem);
    this._cameraYAxis = new Float4();
};

SpotShadowCasterCollector.prototype = Object.create(SceneVisitor.prototype);

SpotShadowCasterCollector.prototype.getRenderList = function() { return this._renderList; };

SpotShadowCasterCollector.prototype.collect = function(camera, scene)
{
    this.reset();
    this._camera = camera;
    this._renderList = [];
    camera.worldMatrix.getColumn(1, this._cameraYAxis);
    this._frustumPlanes = camera.frustum.planes;
    this._renderItemPool.reset();

    scene.acceptVisitor(this);

    this._renderList.sort(RenderSortFunctions.sortOpaques);
};

SpotShadowCasterCollector.prototype.visitMeshInstance = function (meshInstance)
{
    if (!meshInstance.castShadows || !meshInstance.enabled || !meshInstance._lodVisible) return;

    var entity = meshInstance.entity;
    var worldBounds = this.getProxiedBounds(entity);
    var cameraYAxis = this._cameraYAxis;
    var cameraY_X = cameraYAxis.x, cameraY_Y = cameraYAxis.y, cameraY_Z = cameraYAxis.z;
    var skeleton = meshInstance.skeleton;
    var skeletonMatrices = meshInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;
    var renderList = this._renderList;
    var material = meshInstance.material;
    var renderItem = renderPool.getItem();

    renderItem.material = material;
    renderItem.meshInstance = meshInstance;
    renderItem.skeleton = skeleton;
    renderItem.skeletonMatrices = skeletonMatrices;
    // distance along Z axis:
    var center = worldBounds._center;
    renderItem.renderOrderHint = center.x * cameraY_X + center.y * cameraY_Y + center.z * cameraY_Z;
    renderItem.worldMatrix = this.getProxiedMatrix(entity);
    renderItem.worldBounds = worldBounds;

    renderList.push(renderItem);
};

SpotShadowCasterCollector.prototype.visitMeshBatch = SpotShadowCasterCollector.prototype.visitMeshInstance;

SpotShadowCasterCollector.prototype.qualifiesBounds = function(bounds)
{
    return bounds.intersectsConvexSolid(this._frustumPlanes, 6);
};

SpotShadowCasterCollector.prototype.qualifies = function(object, forceBounds)
{
    return object.visible && (forceBounds || object.worldBounds.intersectsConvexSolid(this._frustumPlanes, 6));
};

export { SpotShadowCasterCollector };