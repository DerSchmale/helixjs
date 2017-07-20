import {ObjectPool} from "../core/ObjectPool";
import {Float4} from "../math/Float4";
import {Color} from "../core/Color";
import {SceneVisitor} from "../scene/SceneVisitor";
import {META} from "../Helix";
import {RenderItem} from "./RenderItem";

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function RenderCollector()
{
    SceneVisitor.call(this);

    this._renderItemPool = new ObjectPool(RenderItem);

    this._opaques = [];
    this._unlitOpaques = [];
    this._transparents = []; // add in individual pass types
    this._camera = null;
    this._cameraZAxis = new Float4();
    this._frustum = null;
    this._lights = null;
    this._ambientColor = new Color();
    this._shadowCasters = null;
    this._effects = null;
    this._needsNormalDepth = false;
    this._needsGBuffer = false;
    this._needsBackbuffer = false;
}

RenderCollector.prototype = Object.create(SceneVisitor.prototype, {
    ambientColor: {
        get: function() { return this._ambientColor; }
    },

    needsNormalDepth: {
        get: function() { return this._needsNormalDepth; }
    },

    needsGBuffer: {
        get: function() { return this._needsGBuffer; }
    },

    needsBackbuffer: {
        get: function() { return this._needsBackbuffer; }
    }
});

RenderCollector.prototype.getOpaqueRenderList = function() { return this._opaques; };
RenderCollector.prototype.getUnlitOpaqueRenderList = function() { return this._unlitOpaques; };
RenderCollector.prototype.getTransparentRenderList = function() { return this._transparents; };
RenderCollector.prototype.getLights = function() { return this._lights; };
RenderCollector.prototype.getShadowCasters = function() { return this._shadowCasters; };
RenderCollector.prototype.getEffects = function() { return this._effects; };

RenderCollector.prototype.collect = function(camera, scene)
{
    this._camera = camera;
    camera.worldMatrix.getColumn(2, this._cameraZAxis);
    this._frustum = camera.frustum;
    this._reset();

    scene.acceptVisitor(this);

    this._unlitOpaques.sort(this._sortOpaques);
    this._opaques.sort(this._sortOpaques);
    this._transparents.sort(this._sortTransparents);

    this._lights.sort(this._sortLights);

    var effects = this._camera._effects;
    // add camera effects at the end
    if (effects) {
        var len = effects.length;

        for (var i = 0; i < len; ++i) {
            var effect = effects[i];
            this._needsNormalDepth = this._needsNormalDepth || effect._needsNormalDepth;
            this._effects.push(effect);
        }
    }
};

RenderCollector.prototype.qualifies = function(object)
{
    return object.visible && object.worldBounds.intersectsConvexSolid(this._frustum._planes, 6);
};

RenderCollector.prototype.visitScene = function (scene)
{
    var skybox = scene._skybox;
    if (skybox)
        this.visitModelInstance(skybox._modelInstance, scene._rootNode.worldMatrix, scene._rootNode.worldBounds);
};

RenderCollector.prototype.visitEffects = function(effects)
{
    // camera does not pass effects
    //if (ownerNode === this._camera) return;
    var len = effects.length;

    for (var i = 0; i < len; ++i) {
        this._effects.push(effects[i]);
    }
};

RenderCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    var numMeshes = modelInstance.numMeshInstances;
    var cameraZAxis = this._cameraZAxis;
    var cameraZ_X = cameraZAxis.x, cameraZ_Y = cameraZAxis.y, cameraZ_Z = cameraZAxis.z;
    var skeleton = modelInstance.skeleton;
    var skeletonMatrices = modelInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;
    var camera = this._camera;
    var deferredLightingModel = META.OPTIONS.deferredLightingModel;
    var opaques = this._opaques;
    var unlitOpaques = this._unlitOpaques;
    var transparents = this._transparents;

    for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
        var meshInstance = modelInstance.getMeshInstance(meshIndex);
        if (!meshInstance.visible) continue;

        var material = meshInstance.material;

        // if (!material._initialized) continue;

        var lightingModel = material._lightingModel;

        // only required for the default lighting model (if not unlit)
        this._needsGBuffer = this._needsGBuffer || (!!lightingModel && lightingModel === deferredLightingModel);
        this._needsNormalDepth = this._needsNormalDepth || material._needsNormalDepth;
        this._needsBackbuffer = this._needsBackbuffer || material._needsBackbuffer;

        var renderItem = renderPool.getItem();

        renderItem.material = material;
        renderItem.meshInstance = meshInstance;
        renderItem.skeleton = skeleton;
        renderItem.skeletonMatrices = skeletonMatrices;
        // distance along Z axis:
        var center = worldBounds._center;
        renderItem.renderOrderHint = center.x * cameraZ_X + center.y * cameraZ_Y + center.z * cameraZ_Z;
        renderItem.worldMatrix = worldMatrix;
        renderItem.camera = camera;
        renderItem.worldBounds = worldBounds;


        var list = (material.blendState || material._needsBackbuffer)? transparents : (material.lightingModel? opaques : unlitOpaques);
        list.push(renderItem);
    }
};

RenderCollector.prototype.visitAmbientLight = function(light)
{
    var color = light._scaledIrradiance;
    this._ambientColor.r += color.r;
    this._ambientColor.g += color.g;
    this._ambientColor.b += color.b;
};

RenderCollector.prototype.visitLight = function(light)
{
    this._lights.push(light);
    if (light._castShadows) this._shadowCasters.push(light._shadowMapRenderer);
};

RenderCollector.prototype._reset = function()
{
    this._renderItemPool.reset();

    this._opaques = [];
    this._unlitOpaques = [];
    this._transparents = [];
    this._lights = [];
    this._shadowCasters = [];
    this._effects = [];
    this._needsNormalDepth = false;
    this._ambientColor.set(0, 0, 0, 1);
};

RenderCollector.prototype._sortTransparents = function(a, b)
{
    var diff = a.material._renderOrder - b.material._renderOrder;
    if (diff !== 0) return diff;
    return b.renderOrderHint - a.renderOrderHint;
};

RenderCollector.prototype._sortOpaques = function(a, b)
{
    var diff;

    diff = a.material._renderOrder - b.material._renderOrder;
    if (diff !== 0) return diff;

    diff = a.material._renderOrderHint - b.material._renderOrderHint;
    if (diff !== 0) return diff;

    return a.renderOrderHint - b.renderOrderHint;
};

RenderCollector.prototype._sortLights = function(a, b)
{
    return  a._type === b._type?
            a._castShadows? 1 : -1 :
            a._type - b._type;
};

export { RenderCollector };