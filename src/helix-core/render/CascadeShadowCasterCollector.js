/**
 *
 * @constructor
 */
HX.CascadeShadowCasterCollector = function(numCascades)
{
    HX.SceneVisitor.call(this);
    this._renderCameras = null;
    this._bounds = new HX.BoundingAABB();
    this._numCascades = numCascades;
    this._cullPlanes = null;
    this._splitPlanes = null;
    this._numCullPlanes = 0;
    this._renderLists = [];
    this._renderItemPool = new HX.RenderItemPool();
};

HX.CascadeShadowCasterCollector.prototype = Object.create(HX.SceneVisitor.prototype);

HX.CascadeShadowCasterCollector.prototype.getRenderList = function(index) { return this._renderLists[index]; };

HX.CascadeShadowCasterCollector.prototype.collect = function(camera, scene)
{
    this._collectorCamera = camera;
    this._bounds.clear();
    this._renderItemPool.reset();

    for (var i = 0; i < this._numCascades; ++i) {
        this._renderLists[i] = [];
    }

    scene.acceptVisitor(this);
};

HX.CascadeShadowCasterCollector.prototype.getBounds = function()
{
    return this._bounds;
};

HX.CascadeShadowCasterCollector.prototype.setRenderCameras = function(cameras)
{
    this._renderCameras = cameras;
};

HX.CascadeShadowCasterCollector.prototype.setCullPlanes = function(cullPlanes, numPlanes)
{
    this._cullPlanes = cullPlanes;
    this._numCullPlanes = numPlanes;
};

HX.CascadeShadowCasterCollector.prototype.setSplitPlanes = function(splitPlanes)
{
    this._splitPlanes = splitPlanes;
};

HX.CascadeShadowCasterCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    if (modelInstance._castShadows === false) return;

    this._bounds.growToIncludeBound(worldBounds);

    var passIndex = HX.MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS;

    var numCascades = this._numCascades;
    var numMeshes = modelInstance.numMeshInstances;
    var skeleton = modelInstance.skeleton;
    var skeletonMatrices = modelInstance.skeletonMatrices;

    //if (!worldBounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes)) return;

    // figure out in which cascade(s) the object is included
    // every cascade is bounded at the far end by a plane parallel to the view plane, the normal pointing into the screen
    // if an object is completely in front of this plane, it's not in the cascade.

    // TODO: This method doesn't actually work, since an object contained entirely in cascade 1 can still cast into
    // cascade 2 and vice versa. We need to find a way to figure out where the shadows will fall, but this may mean
    // 4-plane frustum tests for each mesh

    var lastCascade = numCascades - 1;
    for (var cascade = 0; cascade < numCascades; ++cascade) {

        var renderList = this._renderLists[cascade];
        var renderCamera = this._renderCameras[cascade];

        var planeSide;

        // always contained in lastCascade if we made it this far
        /*if (cascade === lastCascade)
            planeSide = HX.PlaneSide.BACK;
        else
            planeSide = worldBounds.classifyAgainstPlane(this._splitPlanes[cascade]);*/

        // front means it's not intersecting this partition
        // if (planeSide !== HX.PlaneSide.FRONT) {
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

                    renderList.push(renderItem);
                }
            }

            // completely contained in the partition, so it won't be in more distant slices
            // We can't do this, because an object completely in cascade A might still cast into cascade 2!
            // if (planeSide === HX.PlaneSide.BACK)
            //     return;
        // }
    }

    // no need to test the last split plane, if we got this far, it's bound to be in it

};

HX.CascadeShadowCasterCollector.prototype.qualifies = function(object)
{
    return object.visible && object.worldBounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes);
};