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
    HX.PointLight._fullScreenLightPasses = [];
    HX.PointLight._fullScreenPositionLocations = [];
    HX.PointLight._fullScreenColorLocations = [];
    HX.PointLight._fullScreenAttenuationFixFactorsLocations = [];
    var pass;
    for (var i = 0; i < HX.PointLight.LIGHTS_PER_BATCH; ++i) {
        pass = new HX.EffectPass(HX.PointLight.fullScreenVertexShader, HX.PointLight.getFullScreenFragmentShader(i + 1), HX.Light._rectMesh);
        HX.PointLight._fullScreenPositionLocations[i] = pass.getUniformLocation("lightWorldPosition[0]");
        HX.PointLight._fullScreenColorLocations[i] = pass.getUniformLocation("lightColor[0]");
        HX.PointLight._fullScreenAttenuationFixFactorsLocations[i] = pass.getUniformLocation("attenuationFixFactors[0]");
        HX.PointLight._fullScreenLightPasses[i] = pass;
    }

    pass = new HX.EffectPass(HX.PointLight.sphericalVertexShader, HX.PointLight.sphericalFragmentShader, HX.PointLight._sphereMesh);
    HX.PointLight._sphericalLightPass = pass;
    HX.PointLight._sphericalPositionLocation = pass.getUniformLocation("lightWorldPosition[0]");
    HX.PointLight._sphericalColorLocation = pass.getUniformLocation("lightColor[0]");
    HX.PointLight._sphericalAttenuationFixFactorsLocation = pass.getUniformLocation("attenuationFixFactors[0]");
    HX.PointLight._sphericalLightRadiusLocation = pass.getUniformLocation("lightRadius[0]");
};


HX.PointLight.fullScreenVertexShader =
    "precision mediump float;\
    \
    attribute vec4 hx_position;\
    attribute vec2 hx_texCoord;\
    \
    uniform mat4 hx_inverseProjectionMatrix;\
    uniform mat4 hx_cameraWorldMatrix;\
    \
    varying vec2 uv;\
    varying vec3 viewWorldDir;\
    \
    void main()\
    {\
            uv = hx_texCoord;\
            vec3 frustumVector = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\
            viewWorldDir = mat3(hx_cameraWorldMatrix) * frustumVector;\
            gl_Position = hx_position;\
    }";

HX.PointLight.getFullScreenFragmentShader = function(numLights)
{
    return HX.DEFERRED_LIGHT_MODEL +
        "#define LIGHTS_PER_BATCH " + numLights + "\n" +
        "varying vec2 uv;\
        varying vec3 viewWorldDir;\
        \
        uniform vec3 lightColor[LIGHTS_PER_BATCH];\
        uniform vec3 lightWorldPosition[LIGHTS_PER_BATCH];\
        uniform vec2 attenuationFixFactors[LIGHTS_PER_BATCH];\
        \
        uniform mat4 hx_projectionMatrix;\
        uniform vec3 hx_cameraWorldPosition;\
        uniform float hx_cameraFrustumRange;\n\
        uniform float hx_cameraNearPlaneDistance;\n\
        \
        uniform sampler2D hx_gbufferAlbedo;\
        uniform sampler2D hx_gbufferNormals;\
        uniform sampler2D hx_gbufferSpecular;\
        uniform sampler2D hx_gbufferDepth;\
        \
        void main()\
        {\
            vec4 albedoSample = texture2D(hx_gbufferAlbedo, uv);\
            vec4 normalSample = texture2D(hx_gbufferNormals, uv);\
            vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\
            float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\
            float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n\
            \
            vec3 worldPosition = hx_cameraWorldPosition + absViewZ * viewWorldDir;\
            \
            vec3 normal = normalize(normalSample.xyz - .5);\
            \
            albedoSample = hx_gammaToLinear(albedoSample);\
            vec3 viewDir = normalize(viewWorldDir);\
            \
            vec3 normalSpecularReflectance;\
            float roughness;\
            hx_decodeReflectionData(albedoSample, specularSample, normalSpecularReflectance, roughness);\
            vec3 totalDiffuse = vec3(0.0);\
            vec3 totalSpecular = vec3(0.0);\
            vec3 diffuseReflection;\
            vec3 specularReflection;\
            \
            for (int i = 0; i < LIGHTS_PER_BATCH; ++i) {\
                vec3 lightWorldDirection = worldPosition - lightWorldPosition[i];\
                float attenuation = 1.0/dot(lightWorldDirection, lightWorldDirection);\
                /* normalize:*/\
                lightWorldDirection *= sqrt(attenuation);\
                \
                /*rescale attenuation so that irradiance at bounding edge really is 0*/ \
                attenuation = max(0.0, (attenuation - attenuationFixFactors[i].x) * attenuationFixFactors[i].y);\
                hx_lighting(normal, lightWorldDirection, viewDir, lightColor[i] * attenuation, normalSpecularReflectance, roughness, normalSample.w, diffuseReflection, specularReflection);\
                totalDiffuse += diffuseReflection;\
                totalSpecular += specularReflection;\
            }\
            totalDiffuse *= albedoSample.xyz * (1.0 - specularSample.x);\
            gl_FragColor = vec4(totalDiffuse + totalSpecular, 1.0);\
        }";
};

HX.PointLight.sphericalVertexShader =
    "#define LIGHTS_PER_BATCH " + HX.PointLight.LIGHTS_PER_BATCH + "\n" +
    "\
    precision mediump float;\
    \
    attribute vec4 hx_position;\
    attribute float hx_instanceID;\
    \
    uniform mat4 hx_viewMatrix;\
    uniform mat4 hx_projectionMatrix;\
    uniform mat4 hx_cameraWorldMatrix;\
    \
    uniform float lightRadius[LIGHTS_PER_BATCH];\
    uniform vec3 lightWorldPosition[LIGHTS_PER_BATCH];\
    uniform vec3 lightColor[LIGHTS_PER_BATCH];\
    uniform vec2 attenuationFixFactors[LIGHTS_PER_BATCH];\
    \
    varying vec2 uv;\
    varying vec3 viewWorldDir;\
    varying vec3 lightColorVar;\
    varying vec3 lightPositionVar;\
    varying vec2 attenuationFixVar;\
    \
    void main()\
    {\
            int instance = int(hx_instanceID);\
            vec4 worldPos = hx_position;\
            lightPositionVar = lightWorldPosition[instance];\
            lightColorVar = lightColor[instance];\
            attenuationFixVar = attenuationFixFactors[instance];\
            worldPos.xyz *= lightRadius[instance];\
            worldPos.xyz += lightPositionVar;\
            \
            vec4 viewPos = hx_viewMatrix * worldPos;\
            vec4 proj = hx_projectionMatrix * viewPos;\
            \
            viewWorldDir = mat3(hx_cameraWorldMatrix) * (viewPos.xyz / viewPos.z);\
            \
            /* render as flat disk, prevent clipping */ \
            proj /= proj.w;\
            proj.z = 0.0;\
            uv = proj.xy/proj.w * .5 + .5;\
            gl_Position = proj;\
    }";

HX.PointLight.sphericalFragmentShader =
    HX.DEFERRED_LIGHT_MODEL +
    "\
    uniform mat4 hx_projectionMatrix;\
    uniform vec3 hx_cameraWorldPosition;\
    \
    uniform sampler2D hx_gbufferAlbedo;\
    uniform sampler2D hx_gbufferNormals;\
    uniform sampler2D hx_gbufferSpecular;\
    uniform sampler2D hx_gbufferDepth;\
    \
    varying vec2 uv;\
    varying vec3 viewWorldDir;\
    varying vec3 lightColorVar;\
    varying vec3 lightPositionVar;\
    varying vec2 attenuationFixVar;\
    \
    void main()\
    {\
        vec4 albedoSample = texture2D(hx_gbufferAlbedo, uv);\
        vec4 normalSample = texture2D(hx_gbufferNormals, uv);\
        vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\
        float depth = texture2D(hx_gbufferDepth, uv).x;\
        \
        vec3 worldPos = hx_cameraWorldPosition + viewZ * viewWorldDir;\
        \
        vec3 normal = normalize(normalSample.xyz - .5);\
        albedoSample = hx_gammaToLinear(albedoSample);\
        vec3 viewDir = -normalize(viewWorldDir);\
        \
        vec3 normalSpecularReflectance;\
        float roughness;\
        hx_decodeReflectionData(albedoSample, specularSample, normalSpecularReflectance, roughness);\
        vec3 diffuseReflection;\
        vec3 specularReflection;\
        \
        vec3 lightWorldDirection = worldPosition - lightPositionVar;\
        float attenuation = 1.0/dot(lightWorldDirection, lightWorldDirection);\
        /* normalize:*/\
        lightWorldDirection *= sqrt(attenuation);\
        \
        /*rescale attenuation so that irradiance at bounding edge really is 0*/ \
        attenuation = max(0.0, (attenuation - attenuationFixVar.x) * attenuationFixVar.y);\
        hx_lighting(normal, lightWorldDirection, viewDir, lightColorVar * attenuation, normalSpecularReflectance, roughness, normalSample.w, diffuseReflection, specularReflection);\
        \
        diffuseReflection *= albedoSample.xyz * (1.0 - specularSample.x);\
        gl_FragColor = vec4(diffuseReflection + specularReflection, 0.0);\
    }";