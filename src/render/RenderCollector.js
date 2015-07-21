/**
 *
 * @constructor
 */
HX.RenderCollector = function()
{
    HX.SceneVisitor.call(this);

    // linked lists of RenderItem
    this._passes = new Array( HX.MaterialPass.NUM_TOTAL_PASS_TYPES ); // add in individual pass types
    this._camera = null;
    this._frustum = null;
    this._lights = null;
    this._shadowCasters = null;
    this._effects = null;
    this._globalSpecularProbe = null;
    this._globalIrradianceProbe = null;
};

HX.RenderCollector.prototype = Object.create(HX.SceneVisitor.prototype);

HX.RenderCollector.prototype.getRenderList = function(passType) { return this._passes[passType]; };
HX.RenderCollector.prototype.getLights = function() { return this._lights; };
HX.RenderCollector.prototype.getShadowCasters = function() { return this._shadowCasters; };
HX.RenderCollector.prototype.getSkyBox = function() { return this._skyBox; };
HX.RenderCollector.prototype.getEffects = function() { return this._effects; };
HX.RenderCollector.prototype.getGlobalSpecularProbe = function() { return this._globalSpecularProbe; };
HX.RenderCollector.prototype.getGlobalIrradianceProbe = function() { return this._globalIrradianceProbe; };

HX.RenderCollector.prototype.collect = function(camera, scene)
{
    this._camera = camera;
    this._frustum = camera.getFrustum();
    this._nearPlane = this._frustum._planes[HX.Frustum.PLANE_NEAR];
    this._reset();

    scene.acceptVisitor(this);

    this._passes[HX.MaterialPass.GEOMETRY_PASS].sort(this._sortOpaques);
    this._passes[HX.MaterialPass.GEOMETRY_POST_ALBEDO_PASS].sort(this._sortBlended);
    this._passes[HX.MaterialPass.GEOMETRY_POST_NORMAL_PASS].sort(this._sortBlended);
    this._passes[HX.MaterialPass.GEOMETRY_POST_SPECULAR_PASS].sort(this._sortBlended);
    // may want to use sort for blended instead?
    this._passes[HX.MaterialPass.POST_PASS].sort(this._sortOpaques);

    if (!HX.EXT_DRAW_BUFFERS)
        this._copyLegacyPasses();

    this._lights.sort(this._sortLights);
};

HX.RenderCollector.prototype.qualifies = function(object)
{
    return object.getWorldBounds().intersectsConvexSolid(this._frustum._planes, 6);
};

HX.RenderCollector.prototype.visitScene = function (scene)
{
    var skyBox = scene._skyBox;
    if (skyBox) {
        this.visitModelInstance(skyBox._modelInstance, null);
        this._globalSpecularProbe = skyBox.getGlobalSpecularProbe();
        this._globalIrradianceProbe = skyBox.getGlobalIrradianceProbe();
    }
};

HX.RenderCollector.prototype.visitEffects = function(effects, ownerNode)
{
    if (ownerNode == this._camera) return;
    var len = effects.length;

    for (var i = 0; i < len; ++i) {
        this._effects.push(effects[i]);
    }
};

HX.RenderCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    var numMeshes = modelInstance.numMeshInstances();

    for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
        var meshInstance = modelInstance.getMeshInstance(meshIndex);
        var material = meshInstance.getMaterial();

        for (var passIndex = 0; passIndex < HX.MaterialPass.NUM_PASS_TYPES; ++passIndex) {
            var pass = material.getPass(passIndex);
            if (pass && pass._enabled) {
                var renderItem = new HX.RenderItem();
                renderItem.pass = pass;
                renderItem.meshInstance = meshInstance;
                renderItem.worldMatrix = worldMatrix;
                renderItem.camera = this._camera;
                renderItem.uniformSetters = meshInstance._uniformSetters[passIndex];

                this._passes[passIndex].push(renderItem);
            }
        }
    }
};

HX.RenderCollector.prototype.visitLight = function(light)
{
    this._lights.push(light);
    if (light._castsShadows) this._shadowCasters.push(light._shadowMapRenderer);

    var bounds = light.getWorldBounds();
    var near = this._nearPlane;

    light._renderOrderHint = bounds._centerX * near.x + bounds._centerY * near.y + bounds._centerZ * near.z + near.w - bounds.getRadius();
};

HX.RenderCollector.prototype._reset = function()
{
    for (var i = 0; i < HX.MaterialPass.NUM_TOTAL_PASS_TYPES; ++i)
        this._passes[i] = [];

    this._lights = [];
    this._shadowCasters = [];
    this._effects = [];
    this._globalIrradianceProbe = null;
    this._globalSpecularProbe = null;
};

HX.RenderCollector.prototype._sortOpaques = function(a, b)
{
    var diff = a.pass._shader._renderOrderHint - b.pass._shader._renderOrderHint;
    if (diff !== 0) return diff;

    var diff = a.pass._renderOrderHint - b.pass._renderOrderHint;
    if (diff !== 0) return diff;

    return a.meshInstance._renderOrderHint - b.meshInstance._renderOrderHint;
};

HX.RenderCollector.prototype._sortBlended = function(a, b)
{
    return b.meshInstance._renderOrderHint - a.meshInstance._renderOrderHint;
};

HX.RenderCollector.prototype._sortLights = function(a, b)
{
    return  a._type == b._type?
                a._castsShadows == b._castsShadows ?
                    a._renderOrderHint - b._renderOrderHint :
                    a._castsShadows? 1 : -1 :
            a._type < b._type? -1 : 1;
};

HX.RenderCollector.prototype._copyLegacyPasses = function(a, b)
{
    var diffusePasses = this._passes[HX.MaterialPass.GEOMETRY_ALBEDO_PASS];
    var normalPasses = this._passes[HX.MaterialPass.GEOMETRY_NORMAL_PASS];
    var specularPasses = this._passes[HX.MaterialPass.GEOMETRY_SPECULAR_PASS];
    var len = diffusePasses.length;

    for (var i = 0; i < len; ++i) {
        var renderItem = diffusePasses[i];
        var normalItem = new HX.RenderItem();
        var specItem = new HX.RenderItem();
        var meshInstance = renderItem.meshInstance;
        var material = meshInstance.getMaterial();
        normalItem.pass = material.getPass(HX.MaterialPass.GEOMETRY_NORMAL_PASS);
        specItem.pass = material.getPass(HX.MaterialPass.GEOMETRY_SPECULAR_PASS);
        normalItem.uniformSetters = meshInstance._uniformSetters[HX.MaterialPass.GEOMETRY_NORMAL_PASS];
        specItem.uniformSetters = meshInstance._uniformSetters[HX.MaterialPass.GEOMETRY_SPECULAR_PASS];

        normalItem.meshInstance = specItem.meshInstance = renderItem.meshInstance;
        normalItem.worldMatrix = specItem.worldMatrix = renderItem.worldMatrix;
        normalItem.camera = specItem.camera = this._camera;

        normalPasses.push(normalItem);
        specularPasses.push(specItem);
    }

};