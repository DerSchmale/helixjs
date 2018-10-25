import {BoundingAABB} from "../scene/BoundingAABB";
import {ObjectPool} from "../core/ObjectPool";
import {SceneVisitor} from "../scene/SceneVisitor";
import {MaterialPass} from "../material/MaterialPass";
import {META} from "../Helix";
import {RenderItem} from "./RenderItem";
import {RenderSortFunctions} from "./RenderSortFunctions";
import {Float4} from "../math/Float4";

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
    this._cameraYAxis = new Float4();
    this._bounds = new BoundingAABB();
    this._cullPlanes = null;
    this._numCullPlanes = 0;
    this._renderList = [];
    this._renderItemPool = new ObjectPool(RenderItem);
}

CascadeShadowCasterCollector.prototype = Object.create(SceneVisitor.prototype);

CascadeShadowCasterCollector.prototype.getRenderList = function(index) { return this._renderList[index]; };

CascadeShadowCasterCollector.prototype.collect = function(camera, scene)
{
    this.reset();
    this._collectorCamera = camera;
    camera.worldMatrix.getColumn(1, this._cameraYAxis);
    this._bounds.clear();
    this._renderItemPool.reset();

    var numCascades = META.OPTIONS.numShadowCascades;
    for (var i = 0; i < numCascades; ++i) {
        this._renderList[i] = [];
    }

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

CascadeShadowCasterCollector.prototype.visitMeshInstance = function (meshInstance)
{
    if (!meshInstance.castShadows || !meshInstance.enabled || !meshInstance._lodVisible) return;

    var skeleton = meshInstance.skeleton;
	var skeletonMatrices = meshInstance.skeletonMatrices;
    var entity = meshInstance.entity;
    var worldBounds = this.getProxiedBounds(entity);
    this._bounds.growToIncludeBound(worldBounds);

    var passIndex = MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS;
    var numCascades = META.OPTIONS.numShadowCascades;
    var cameraYAxis = this._cameraYAxis;
    var cameraY_X = cameraYAxis.x, cameraY_Y = cameraYAxis.y, cameraY_Z = cameraYAxis.z;

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
                renderItem.worldMatrix = this.getProxiedMatrix(entity);
                renderItem.material = material;
                renderItem.skeleton = skeleton;
                renderItem.skeletonMatrices = skeletonMatrices;
                var center = worldBounds._center;
                renderItem.renderOrderHint = center.x * cameraY_X + center.y * cameraY_Y + center.z * cameraY_Z;
                renderItem.worldBounds = worldBounds;

                renderList.push(renderItem);
            }
        }
    }
};

CascadeShadowCasterCollector.prototype.visitMeshBatch = CascadeShadowCasterCollector.prototype.visitMeshInstance;

CascadeShadowCasterCollector.prototype.qualifiesBounds = function(bounds)
{
    return bounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes);
};

CascadeShadowCasterCollector.prototype.qualifies = function(object, forceBounds)
{
        return object.hierarchyVisible && (forceBounds || object.worldBounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes));
};

export { CascadeShadowCasterCollector };