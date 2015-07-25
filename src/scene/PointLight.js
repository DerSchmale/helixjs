/**
 *
 * @constructor
 */
HX.PointLight = function()
{
    HX.Light.call(this, HX.PointLight);

    HX.Light._rectMesh = HX.Light._rectMesh || new HX.RectMesh.create();
    HX.PointLight._sphereMesh = HX.PointLight._sphereMesh || new HX.Mesh(HX.MeshBatch.create(new HX.SpherePrimitive.createMeshData(
        {
            invert:true,
            numSegmentsW: HX.PointLight.SPHERE_SEGMENTS_W,
            numSegmentsH: HX.PointLight.SPHERE_SEGMENTS_H
        }), HX.PointLight.LIGHTS_PER_BATCH));

    if (HX.PointLight._fullScreenLightPasses === undefined)
        this._initLightPasses();

    HX.PointLight._positionData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 3);
    HX.PointLight._colorData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 3);
    HX.PointLight._attenuationData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 2);
    HX.PointLight._radiusData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH);

    this._luminanceBound = 1.0/255.0;
    this._attenuationFix = 1.0;
    this._radius = 1.0;
};

HX.PointLight.LIGHTS_PER_BATCH = 40;
HX.PointLight.SPHERE_SEGMENTS_W = 16;
HX.PointLight.SPHERE_SEGMENTS_H = 10;
HX.PointLight.NUM_SPHERE_INDICES = HX.PointLight.SPHERE_SEGMENTS_W * HX.PointLight.SPHERE_SEGMENTS_H * 6;

HX.PointLight.prototype = Object.create(HX.Light.prototype);

HX.PointLight.prototype.activate = function(camera, gbuffer, occlusion)
{
    HX.GL.disable(HX.GL.DEPTH_TEST);

    this._camera = camera;
    this._gbuffer = gbuffer;
    this._occlusion = occlusion;
    HX.PointLight._sphericalLightPass.updateGlobalState(camera, gbuffer, occlusion);
};

// returns the index of the FIRST UNRENDERED light
HX.PointLight.prototype.renderBatch = function(lightCollection, startIndex, camera, gbuffer, occlusion)
{
    var intersectsNearPlane = lightCollection[startIndex]._renderOrderHint < 0;

    if (intersectsNearPlane) {
        return this._renderFullscreenBatch(lightCollection, startIndex);
    }
    else {
        return this._renderSphereBatch(lightCollection, startIndex);
    }
};

HX.PointLight.prototype._renderSphereBatch = function(lightCollection, startIndex)
{
    HX.PointLight._sphericalLightPass.updateRenderState();
    HX.GL.enable(HX.GL.CULL_FACE);

    var end = startIndex + HX.PointLight.LIGHTS_PER_BATCH;
    if (end > lightCollection.length) end = lightCollection.length;

    var posData = HX.PointLight._positionData;
    var colorData = HX.PointLight._colorData;
    var attData = HX.PointLight._attenuationData;
    var radiusData = HX.PointLight._radiusData;

    var v1i = 0, v2i = 0, v3i = 0;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];
        if (light._type != this._type || light._renderOrderHint < 0) {
            end = i;
            continue;
        }

        var pos = light.getWorldMatrix().getColumn(3);
        var color = light._scaledIrradiance;

        posData[v3i] = pos.x;
        colorData[v3i++] = color.r;
        posData[v3i] = pos.y;
        colorData[v3i++] = color.g;
        posData[v3i] = pos.z;
        colorData[v3i++] = color.b;
        attData[v2i++] = light._attenuationFix;
        attData[v2i++] = 1.0 / (1.0 - light._attenuationFix);
        radiusData[v1i++] = light._radius * 2 * 1.0001;
    }

    HX.GL.uniform3fv(HX.PointLight._sphericalPositionLocation, posData);
    HX.GL.uniform3fv(HX.PointLight._sphericalColorLocation, colorData);
    HX.GL.uniform2fv(HX.PointLight._sphericalAttenuationFixFactorsLocation, attData);
    HX.GL.uniform1fv(HX.PointLight._sphericalLightRadiusLocation, radiusData);

    HX.GL.drawElements(HX.GL.TRIANGLES, HX.PointLight.NUM_SPHERE_INDICES * (end - startIndex), HX.GL.UNSIGNED_SHORT, 0);

    return end;
};

HX.PointLight.prototype.initFullScreenPass = function (passIndex)
{
    var defines = "#define LIGHTS_PER_BATCH " + (passIndex + 1) + "\n";
    var pass = new HX.EffectPass(
        defines + HX.ShaderLibrary.get("point_light_fullscreen_vertex.glsl"),
        HX.DEFERRED_LIGHT_MODEL + defines + HX.ShaderLibrary.get("point_light_fullscreen_fragment.glsl"),
        HX.Light._rectMesh);
    HX.PointLight._fullScreenPositionLocations[passIndex] = pass.getUniformLocation("lightWorldPosition[0]");
    HX.PointLight._fullScreenColorLocations[passIndex] = pass.getUniformLocation("lightColor[0]");
    HX.PointLight._fullScreenAttenuationFixFactorsLocations[passIndex] = pass.getUniformLocation("attenuationFixFactors[0]");
    HX.PointLight._fullScreenLightPasses[passIndex] = pass;
};

HX.PointLight.prototype._renderFullscreenBatch = function(lightCollection, startIndex)
{
    HX.GL.disable(HX.GL.CULL_FACE);

    // TODO: provide a shader for each light count?
    var end = startIndex + HX.PointLight.LIGHTS_PER_BATCH;
    if (end > lightCollection.length) end = lightCollection.length;

    var posData = HX.PointLight._positionData;
    var colorData = HX.PointLight._colorData;
    var attData = HX.PointLight._attenuationData;

    var v3i = 0, v2i = 0;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];

        // either type switch or light._renderOrderHint change
        if (light._type != this._type /*|| light._renderOrderHint > 0*/) {
            end = i;
            continue;
        }

        var pos = light.getWorldMatrix().getColumn(3);
        var color = light._scaledIrradiance;

        posData[v3i] = pos.x;
        colorData[v3i++] = color.r;
        posData[v3i] = pos.y;
        colorData[v3i++] = color.g;
        posData[v3i] = pos.z;
        colorData[v3i++] = color.b;
        attData[v2i++] = light._attenuationFix;
        attData[v2i++] = 1.0 / (1.0 - light._attenuationFix);
    }

    var passIndex = i - startIndex - 1;

    if (!HX.PointLight._fullScreenLightPasses[passIndex]) {
        this.initFullScreenPass(passIndex);
    }

    HX.PointLight._fullScreenLightPasses[passIndex].updateGlobalState(camera, this._gbuffer, this._occlusion);
    HX.PointLight._fullScreenLightPasses[passIndex].updateRenderState();

    HX.GL.uniform3fv(HX.PointLight._fullScreenPositionLocations[passIndex], posData);
    HX.GL.uniform3fv(HX.PointLight._fullScreenColorLocations[passIndex], colorData);
    HX.GL.uniform2fv(HX.PointLight._fullScreenAttenuationFixFactorsLocations[passIndex], attData);

    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);

    return end;
}

HX.PointLight.prototype._updateScaledIrradiance  = function ()
{
    HX.Light.prototype._updateScaledIrradiance.call(this);

    this._attenuationFix = this._luminanceBound / this._luminance;
    this._radius = Math.sqrt(1.0 / this._attenuationFix);

    this._invalidateWorldBounds();
};

HX.PointLight.prototype._createBoundingVolume = function()
{
    return new HX.BoundingSphere();
}

HX.PointLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.setExplicit(this.getWorldMatrix().getColumn(3), this._radius);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.PointLight.prototype.getRadius = function()
{
    return this._worldBounds.getRadius();
};

HX.PointLight.prototype._initLightPasses =  function()
{
    // the full screen passes will be generated on demand
    HX.PointLight._fullScreenLightPasses = [];
    HX.PointLight._fullScreenPositionLocations = [];
    HX.PointLight._fullScreenColorLocations = [];
    HX.PointLight._fullScreenAttenuationFixFactorsLocations = [];

    var defines = "#define LIGHTS_PER_BATCH " + HX.PointLight.LIGHTS_PER_BATCH + "\n";
    var pass = new HX.EffectPass(
        defines + HX.ShaderLibrary.get("point_light_spherical_vertex.glsl"),
        HX.DEFERRED_LIGHT_MODEL + defines + HX.ShaderLibrary.get("point_light_spherical_fragment.glsl"),
        HX.PointLight._sphereMesh);

    HX.PointLight._sphericalLightPass = pass;
    HX.PointLight._sphericalPositionLocation = pass.getUniformLocation("lightWorldPosition[0]");
    HX.PointLight._sphericalColorLocation = pass.getUniformLocation("lightColor[0]");
    HX.PointLight._sphericalAttenuationFixFactorsLocation = pass.getUniformLocation("attenuationFixFactors[0]");
    HX.PointLight._sphericalLightRadiusLocation = pass.getUniformLocation("lightRadius[0]");
};