/**
 *
 * @constructor
 */
HX.RenderCollector = function()
{
    HX.SceneVisitor.call(this);

    this._renderItemPool = new HX.RenderItemPool();

    // linked lists of RenderItem
    this._opaquePasses = new Array( HX.MaterialPass.NUM_PASS_TYPES ); // add in individual pass types
    this._transparentPasses = new Array( HX.MaterialPass.NUM_PASS_TYPES ); // add in individual pass types
    this._camera = null;
    this._cameraZAxis = new HX.Float4();
    this._frustum = null;
    this._lights = null;
    this._ambientColor = new HX.Color();
    this._shadowCasters = null;
    this._effects = null;
    this._globalSpecularProbe = null;
    this._globalIrradianceProbe = null;
};

HX.RenderCollector.prototype = Object.create(HX.SceneVisitor.prototype);

HX.RenderCollector.prototype.getOpaqueRenderList = function(passType) { return this._opaquePasses[passType]; };
// only contains GBUFFER passes:
HX.RenderCollector.prototype.getTransparentRenderList = function(passType) { return this._transparentPasses[passType]; };
HX.RenderCollector.prototype.getLights = function() { return this._lights; };
HX.RenderCollector.prototype.getShadowCasters = function() { return this._shadowCasters; };
HX.RenderCollector.prototype.getEffects = function() { return this._effects; };
HX.RenderCollector.prototype.getGlobalSpecularProbe = function() { return this._globalSpecularProbe; };
HX.RenderCollector.prototype.getGlobalIrradianceProbe = function() { return this._globalIrradianceProbe; };

Object.defineProperties(HX.RenderCollector.prototype, {
    ambientColor: {
        get: function() { return this._ambientColor; }
    }
});

HX.RenderCollector.prototype.collect = function(camera, scene)
{
    this._camera = camera;
    camera.worldMatrix.getColumn(2, this._cameraZAxis);
    this._frustum = camera.frustum;
    this._nearPlane = this._frustum._planes[HX.Frustum.PLANE_NEAR];
    this._reset();

    scene.acceptVisitor(this);

    this._opaquePasses[HX.MaterialPass.GEOMETRY_PASS].sort(this._sortOpaques);
    this._opaquePasses[HX.MaterialPass.POST_PASS].sort(this._sortOpaques);

    this._transparentPasses[HX.MaterialPass.GEOMETRY_PASS].sort(this._sortTransparents);
    this._transparentPasses[HX.MaterialPass.POST_PASS].sort(this._sortTransparents);

    if (!HX.EXT_DRAW_BUFFERS) {
        this._copyLegacyPasses(this._opaquePasses);
        this._copyLegacyPasses(this._transparentPasses);
    }

    this._lights.sort(this._sortLights);

    var effects = this._camera._effects;
    // add camera effects at the end
    if (effects) {
        var len = effects.length;

        for (var i = 0; i < len; ++i) {
            this._effects.push(effects[i]);
        }
    }
};

HX.RenderCollector.prototype.qualifies = function(object)
{
    return object.visible && object.worldBounds.intersectsConvexSolid(this._frustum._planes, 6);
};

HX.RenderCollector.prototype.visitScene = function (scene)
{
    var skybox = scene._skybox;
    if (skybox) {
        this.visitModelInstance(skybox._modelInstance, scene._rootNode.worldMatrix, scene._rootNode.worldBounds);
        this._globalSpecularProbe = skybox.getGlobalSpecularProbe();
        this._globalIrradianceProbe = skybox.getGlobalIrradianceProbe();
    }
};

HX.RenderCollector.prototype.visitEffects = function(effects, ownerNode)
{
    if (ownerNode === this._camera) return;
    var len = effects.length;

    for (var i = 0; i < len; ++i) {
        this._effects.push(effects[i]);
    }
};

HX.RenderCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    var numMeshes = modelInstance.numMeshInstances;

    for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
        var meshInstance = modelInstance.getMeshInstance(meshIndex);
        var material = meshInstance.material;

        for (var passIndex = 0; passIndex < HX.MaterialPass.NUM_PASS_TYPES; ++passIndex) {
            var pass = material.getPass(passIndex);
            if (pass && pass._enabled) {
                var list = material._transparencyMode === HX.TransparencyMode.OPAQUE? this._opaquePasses : this._transparentPasses;
                var renderItem = this._renderItemPool.getItem();

                renderItem.material = material;
                renderItem.pass = pass;
                renderItem.meshInstance = meshInstance;
                renderItem.skeleton = modelInstance.skeleton;
                renderItem.skeletonMatrices = modelInstance.skeletonMatrices;
                // distance along Z axis:
                var center = worldBounds._center;
                renderItem.renderOrderHint = center.x * this._cameraZAxis.x + center.y * this._cameraZAxis.y + center.z * this._cameraZAxis.z;
                renderItem.worldMatrix = worldMatrix;
                renderItem.camera = this._camera;
                list[passIndex].push(renderItem);
            }
        }
    }
};

HX.RenderCollector.prototype.visitAmbientLight = function(light)
{
    var color = light.linearColor;
    this._ambientColor.r += color.r;
    this._ambientColor.g += color.g;
    this._ambientColor.b += color.b;
};

HX.RenderCollector.prototype.visitLight = function(light)
{
    this._lights.push(light);
    if (light._castShadows) this._shadowCasters.push(light._shadowMapRenderer);

    var bounds = light.worldBounds;
    var near = this._nearPlane;

    var center = bounds._center;

    // render order hint for lights is used to determine whether or not they intersect the near plane (in which case we want a quad render pass to be more efficient)
    // so > 0 is intersecting, < 0 is not
    light._renderOrderHint = center.x * near.x + center.y * near.y + center.z * near.z + near.w + bounds.getRadius();
};

HX.RenderCollector.prototype._reset = function()
{
    this._renderItemPool.reset();

    for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i)
        this._opaquePasses[i] = [];

    for (var i = 0; i < HX.MaterialPass.NUM_PASS_TYPES; ++i)
        this._transparentPasses[i] = [];

    this._lights = [];
    this._shadowCasters = [];
    this._effects = [];
    this._globalIrradianceProbe = null;
    this._globalSpecularProbe = null;
    this._ambientColor.set(0, 0, 0, 1);
};

HX.RenderCollector.prototype._sortTransparents = function(a, b)
{
    return b.renderOrderHint - a.renderOrderHint;
};

HX.RenderCollector.prototype._sortOpaques = function(a, b)
{
    var diff;

    diff = a.material._renderOrder - b.material._renderOrder;
    if (diff !== 0) return diff;

    diff = a.pass._shader._renderOrderHint - b.pass._shader._renderOrderHint;
    if (diff !== 0) return diff;

    diff = a.material._renderOrderHint - b.material._renderOrderHint;
    if (diff !== 0) return diff;

    return a.renderOrderHint - b.renderOrderHint;
};

HX.RenderCollector.prototype._sortLights = function(a, b)
{
    return  a._type == b._type?
                    a._castShadows == b._castShadows ?
                    a._renderOrderHint - b._renderOrderHint :
                    a._castShadows? 1 : -1 :
            a._type - b._type;
};

HX.RenderCollector.prototype._copyLegacyPasses = function(list)
{
    var colorPasses = list[HX.MaterialPass.GEOMETRY_COLOR_PASS];
    var normalPasses = list[HX.MaterialPass.GEOMETRY_NORMAL_PASS];
    var specularPasses = list[HX.MaterialPass.GEOMETRY_SPECULAR_PASS];
    var len = colorPasses.length;
    var n = 0;
    var s = 0;

    for (var i = 0; i < len; ++i) {
        var renderItem = colorPasses[i];
        var meshInstance = renderItem.meshInstance;
        var material = renderItem.material;

        // for unlit lighting models, these passes may be unavailable
        if (material.hasPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS)) {
            var normalItem = this._renderItemPool.getItem();
            normalItem.pass = material.getPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS);
            normalItem.material = renderItem.material;
            normalItem.renderOrderHint = renderItem.renderOrderHint;
            normalItem.meshInstance = renderItem.meshInstance;
            normalItem.worldMatrix = renderItem.worldMatrix;
            normalItem.camera = this._camera;
            normalPasses[n++] = normalItem;
        }

        if (material.hasPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS)) {
            var specItem = this._renderItemPool.getItem();
            specItem.pass = material.getPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS);
            specItem.material = renderItem.material;
            specItem.renderOrderHint = renderItem.renderOrderHint;
            specItem.meshInstance = renderItem.meshInstance;
            specItem.worldMatrix = renderItem.worldMatrix;
            specItem.camera = this._camera;
            specularPasses[s++] = specItem;
        }
    }

};