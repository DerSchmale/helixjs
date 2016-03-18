/**
 *
 * @constructor
 */
HX.PointLight = function()
{
    HX.Light.call(this);

    // TODO: use geodesic sphere
    if (!HX.PointLight._initialized) {
        var sphere = new HX.SpherePrimitive.createMeshData(
            {
                radius: 1.0,
                invert: true,
                numSegmentsW: HX.PointLight.SPHERE_SEGMENTS_W,
                numSegmentsH: HX.PointLight.SPHERE_SEGMENTS_H
            });

        HX.PointLight._sphereMesh = new HX.Mesh(HX.MeshBatch.create(sphere, HX.PointLight.LIGHTS_PER_BATCH));
        HX.PointLight.NUM_SPHERE_INDICES = sphere._indexData.length;
        HX.PointLight._positionData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 3);
        HX.PointLight._colorData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 3);
        HX.PointLight._radiusData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH);

        this._initLightPasses();

        HX.PointLight._initialized = true;
    }


    this._radius = 100.0;
    this.intensity = 3.1415;
};

HX.PointLight.LIGHTS_PER_BATCH = 20;
HX.PointLight.SPHERE_SEGMENTS_W = 16;
HX.PointLight.SPHERE_SEGMENTS_H = 10;
HX.PointLight.NUM_SPHERE_INDICES = -1;  // will be set on creation instead of passing value that might get invalidated

HX.PointLight.prototype = Object.create(HX.Light.prototype,
    {
        // radius is not physically correct, but invaluable for performance
        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
                this._updateWorldBounds();
            }
        }
    });

// returns the index of the FIRST UNRENDERED light
HX.PointLight.prototype.renderBatch = function(lightCollection, startIndex, renderer)
{
    var intersectsNearPlane = lightCollection[startIndex]._renderOrderHint > 0;

    if (intersectsNearPlane)
        return this._renderFullscreenBatch(lightCollection, startIndex, renderer);
    else
        return this._renderSphereBatch(lightCollection, startIndex, renderer);
};

HX.PointLight.prototype._renderSphereBatch = function(lightCollection, startIndex, renderer)
{
    var end = startIndex + HX.PointLight.LIGHTS_PER_BATCH;
    if (end > lightCollection.length) end = lightCollection.length;

    HX.PointLight._sphericalLightPass.updateRenderState(renderer);

    var camera = renderer._camera;
    var posData = HX.PointLight._positionData;
    var colorData = HX.PointLight._colorData;
    var radiusData = HX.PointLight._radiusData;
    var pos = new HX.Float4();
    var viewMatrix = camera.viewMatrix;

    var v1i = 0, v3i = 0;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];
        if (light._type != this._type || light._renderOrderHint > 0) {
            end = i;
            break;
        }

        light.worldMatrix.getColumn(3, pos);
        viewMatrix.transformPoint(pos, pos);

        var color = light._scaledIrradiance;

        posData[v3i] = pos.x;
        colorData[v3i++] = color.r;
        posData[v3i] = pos.y;
        colorData[v3i++] = color.g;
        posData[v3i] = pos.z;
        colorData[v3i++] = color.b;
        radiusData[v1i++] = light._radius * 1.0001; // add some padding to account for imperfect geometry
    }

    var vertexBuffers = HX.PointLight._sphereMesh._vertexBuffers;
    vertexBuffers[0].bind();
    HX.GL.vertexAttribPointer(HX.PointLight._sphericalPositionAttrib, 3, HX.GL.FLOAT, false, 48, 0);
    vertexBuffers[1].bind();
    HX.GL.vertexAttribPointer(HX.PointLight._sphericalInstanceAttrib, 1, HX.GL.FLOAT, false, 4, 0);
    HX.GL.uniform3fv(HX.PointLight._sphericalPositionLocation, posData);
    HX.GL.uniform3fv(HX.PointLight._sphericalColorLocation, colorData);
    HX.GL.uniform1fv(HX.PointLight._sphericalLightRadiusLocation, radiusData);

    // TODO: Should only draw when depth sphere > depth scene
    // but should also use stencil buffer to mark when front sphere depth > depth scene, because then it doesn't light anything
    // however, stencil buffer is already used for lighting models etc :s
    // could we still reserve a bit somewhere?
    HX.setDepthTest(HX.Comparison.GREATER);
    HX.setCullMode(HX.CullMode.BACK);
    HX.drawElements(HX.GL.TRIANGLES, HX.PointLight.NUM_SPHERE_INDICES * (end - startIndex), 0);

    HX.setDepthTest(HX.Comparison.ALWAYS);

    return end;
};

HX.PointLight.prototype.initFullScreenPass = function (passIndex)
{
    var defines = {
        LIGHTS_PER_BATCH: passIndex + 1
    };
    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("point_light_fullscreen_vertex.glsl", defines),
        HX.LIGHTING_MODEL.getGLSL() + HX.ShaderLibrary.get("point_light_fullscreen_fragment.glsl", defines)
    );
    pass.blendState = HX.BlendState.ADD;

    HX.PointLight._fullScreenPositionLocations[passIndex] = pass.getUniformLocation("lightViewPosition[0]");
    HX.PointLight._fullScreenColorLocations[passIndex] = pass.getUniformLocation("lightColor[0]");
    HX.PointLight._fullScreenRadiusLocations[passIndex] = pass.getUniformLocation("lightRadius[0]");
    HX.PointLight._fullScreenLightPasses[passIndex] = pass;
};

HX.PointLight.prototype._renderFullscreenBatch = function(lightCollection, startIndex, renderer)
{
    // TODO: provide a shader for each light count?
    var end = startIndex + HX.PointLight.LIGHTS_PER_BATCH;
    if (end > lightCollection.length) end = lightCollection.length;

    var posData = HX.PointLight._positionData;
    var colorData = HX.PointLight._colorData;
    var radiusData = HX.PointLight._radiusData;
    var pos = new HX.Float4();
    var viewMatrix = renderer._camera.viewMatrix;

    var v3i = 0, v1i = 0;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];

        // either type switch or light._renderOrderHint change
        if (light._type != this._type || light._renderOrderHint < 0) {
            end = i;
            continue;
        }

        light.worldMatrix.getColumn(3, pos);
        viewMatrix.transformPoint(pos, pos);

        var color = light._scaledIrradiance;

        posData[v3i] = pos.x;
        colorData[v3i++] = color.r;
        posData[v3i] = pos.y;
        colorData[v3i++] = color.g;
        posData[v3i] = pos.z;
        colorData[v3i++] = color.b;
        // linear att: 1.0 - distance / radius
        radiusData[v1i++] = light._radius;
    }

    var passIndex = i - startIndex - 1;

    if (!HX.PointLight._fullScreenLightPasses[passIndex]) {
        this.initFullScreenPass(passIndex);
    }

    HX.PointLight._fullScreenLightPasses[passIndex].updateRenderState(renderer);

    HX.GL.uniform3fv(HX.PointLight._fullScreenPositionLocations[passIndex], posData);
    HX.GL.uniform3fv(HX.PointLight._fullScreenColorLocations[passIndex], colorData);
    HX.GL.uniform1fv(HX.PointLight._fullScreenRadiusLocations[passIndex], radiusData);

    HX.drawElements(HX.GL.TRIANGLES, 6, 0);

    return end;
};

HX.PointLight.prototype._createBoundingVolume = function()
{
    return new HX.BoundingSphere();
};

HX.PointLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.setExplicit(this.worldMatrix.getColumn(3), this._radius);
};

HX.PointLight.prototype._initLightPasses =  function()
{
    // the full screen passes will be generated on demand
    HX.PointLight._fullScreenLightPasses = [];
    HX.PointLight._fullScreenPositionLocations = [];
    HX.PointLight._fullScreenColorLocations = [];
    HX.PointLight._fullScreenRadiusLocations = [];

    var defines = {
        LIGHTS_PER_BATCH: HX.PointLight.LIGHTS_PER_BATCH
    };
    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("point_light_spherical_vertex.glsl", defines),
        HX.LIGHTING_MODEL.getGLSL() + HX.ShaderLibrary.get("point_light_spherical_fragment.glsl", defines)
    );

    pass.blendState = HX.BlendState.ADD;

    // do not use rect
    pass.setMesh(HX.PointLight._sphereMesh);

    HX.PointLight._sphericalPositionAttrib = HX.GL.getAttribLocation(pass._shader._program, "hx_position");;
    HX.PointLight._sphericalInstanceAttrib = HX.GL.getAttribLocation(pass._shader._program, "hx_instanceID");;
    HX.PointLight._sphericalLightPass = pass;
    HX.PointLight._sphericalPositionLocation = pass.getUniformLocation("lightViewPosition[0]");
    HX.PointLight._sphericalColorLocation = pass.getUniformLocation("lightColor[0]");
    HX.PointLight._sphericalLightRadiusLocation = pass.getUniformLocation("lightRadius[0]");
};