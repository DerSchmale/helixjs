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
    this._cameraZAxis = new Float4();
    this._bounds = new BoundingAABB();
    this._cullPlanes = null;
    // this._splitPlanes = null;
    this._numCullPlanes = 0;
    this._renderList = [];
    this._renderItemPool = new ObjectPool(RenderItem);
}

CascadeShadowCasterCollector.prototype = Object.create(SceneVisitor.prototype);

CascadeShadowCasterCollector.prototype.getRenderList = function(index) { return this._renderList[index]; };

CascadeShadowCasterCollector.prototype.collect = function(camera, scene)
{
    this._collectorCamera = camera;
    camera.worldMatrix.getColumn(2, this._cameraZAxis);
    this._bounds.clear();
    this._renderItemPool.reset();

    var numCascades = META.OPTIONS.numShadowCascades;
    for (var i = 0; i < numCascades; ++i) {
        this._renderList[i] = [];
    }

    scene.acceptVisitor(this);

    for (var i = 0; i < numCascades; ++i)
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

// CascadeShadowCasterCollector.prototype.setSplitPlanes = function(splitPlanes)
// {
//     this._splitPlanes = splitPlanes;
// };

CascadeShadowCasterCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    if (modelInstance._castShadows === false) return;

    this._bounds.growToIncludeBound(worldBounds);

    var passIndex = MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS;

    var numCascades = META.OPTIONS.numShadowCascades;
    var numMeshes = modelInstance.numMeshInstances;
    var skeleton = modelInstance.skeleton;
    var skeletonMatrices = modelInstance.skeletonMatrices;
    var cameraZAxis = this._cameraZAxis;
    var cameraZ_X = cameraZAxis.x, cameraZ_Y = cameraZAxis.y, cameraZ_Z = cameraZAxis.z;

    for (var cascade = 0; cascade < numCascades; ++cascade) {
        var renderList = this._renderList[cascade];
        var renderCamera = this._renderCameras[cascade];

        var contained = worldBounds.intersectsConvexSolid(renderCamera.frustum.planes, 4);

        if (contained) {
            for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
                var meshInstance = modelInstance.getMeshInstance(meshIndex);
                var material = meshInstance.material;

                if (material.hasPass(passIndex)) {
                    var renderItem = this._renderItemPool.getItem();
                    renderItem.pass = material.getPass(passIndex);
                    renderItem.meshInstance = meshInstance;
                    renderItem.worldMatrix = worldMatrix;
                    renderItem.camera = renderCamera;
                    renderItem.material = material;
                    renderItem.skeleton = skeleton;
                    renderItem.skeletonMatrices = skeletonMatrices;
                    var center = worldBounds._center;
                    renderItem.renderOrderHint = center.x * cameraZ_X + center.y * cameraZ_Y + center.z * cameraZ_Z;

                    renderList.push(renderItem);
                }
            }
        }
    }
};

CascadeShadowCasterCollector.prototype.qualifies = function(object)
{
    return object.visible && object.worldBounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes);
};

export { CascadeShadowCasterCollector };