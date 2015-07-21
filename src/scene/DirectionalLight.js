/**
 *
 * @constructor
 */
HX.DirectionalLight = function()
{
    HX.Light.call(this, HX.DirectionalLight);

    HX.Light._rectMesh = HX.Light._rectMesh || new HX.RectMesh.create();

    this._numCascades = 3;
    this._shadowMapSize = 1024;
    // hard shadows by default
    this._numShadowSamples = 1;
    this._shadowSoftness = .05;
    this._depthBias = .01;

    this.setDirection(new HX.Float4(1.0, -1.0, 1.0, 0.0));
    this._matrixData = null;
    this._shadowSoftnessData = null;

    this._dirLocation = null;
    this._colorLocation = null;
    this._splitDistancesLocation = null;
    this._shadowMatrixLocation = null;
    this._depthBiasLocation = null;
    this._shadowSoftnessLocation = null;
};


HX.DirectionalLight.prototype = Object.create(HX.Light.prototype);

HX.DirectionalLight.prototype.getDirection = function()
{
    var dir = this.getWorldMatrix().getColumn(2);
    dir.x = -dir.x;
    dir.y = -dir.y;
    dir.z = -dir.z;
    return dir;
};

HX.DirectionalLight.prototype.setCastsShadows = function(value)
{
    if (this._castsShadows == value) return;

    this._castsShadows = value;

    if (value) {
        this._shadowMapRenderer = new HX.CascadeShadowMapRenderer(this, this._numCascades, this._shadowMapSize);
    }
    else {
        this._shadowMapRenderer.dispose();
        this._shadowMapRenderer = null;
    }

    this._invalidateLightPass();
};

HX.DirectionalLight.prototype.getNumCascades = function()
{
    return this._numCascades;
};

HX.DirectionalLight.prototype.setNumCascades = function(value)
{
    if (value > 4) {
        console.warn("setNumCascades called with value greater than 4. Real value will be set to 4.");
        value = 4;
    }

    this._numCascades = value;
    if (this._castsShadows) this._invalidateLightPass();
    if (this._shadowMapRenderer) this._shadowMapRenderer.setNumCascades(value);
};

HX.DirectionalLight.prototype.getShadowMapSize = function()
{
    return this._shadowMapSize;
};

HX.DirectionalLight.prototype.setShadowMapSize = function(value)
{
    this._shadowMapSize = value;
    if (this._shadowMapRenderer) this._shadowMapRenderer.setShadowMapSize(value);
};

HX.DirectionalLight.prototype.getDepthBias = function()
{
    return this._depthBias;
};

HX.DirectionalLight.prototype.setDepthBias = function(value)
{
    this._depthBias = value;
};

HX.DirectionalLight.prototype.setShadowSoftness = function(value)
{
    this._shadowSoftness = value;
};

HX.DirectionalLight.prototype.setNumShadowSamples = function(value)
{
    if (value < 1) {
        value = 1;
        console.warn("setNumShadowSamples called with value smaller than 1. Real value will be set to 1.");
    }
    this._numShadowSamples = value;
    if (this._castsShadows) this._invalidateLightPass();
};

HX.DirectionalLight.prototype.setDirection = function(value)
{
    // we use the matrix for direction so it in an editor it would be able to be positioned and oriented just like any other scene object
    var matrix = new HX.Matrix4x4();
    var position = this.getWorldMatrix().getColumn(3);
    var target = HX.Float4.sum(value, position);
    matrix.lookAt(target, position, HX.Float4.Y_AXIS);
    this.setTransformationMatrix(matrix);
};

HX.DirectionalLight.prototype.activate = function(camera, gbuffer, occlusion)
{
};

// returns the index of the FIRST UNRENDERED light
HX.DirectionalLight.prototype.renderBatch = function(lightCollection, startIndex, camera, gbuffer, occlusion)
{
    if (!this._lightPass)
        this._initLightPass();

    this._lightPass.updateGlobalState(camera, gbuffer, occlusion);
    this._lightPass.updateRenderState();

    var light = lightCollection[startIndex];
    var dir = light.getDirection();
    var color = light._scaledIrradiance;

    HX.GL.uniform3f(this._dirLocation, dir.x, dir.y, dir.z);
    HX.GL.uniform3f(this._colorLocation, color.r ,color.g, color.b);

    if (this._castsShadows) {
        var splitDistances = this._shadowMapRenderer.getSplitDistances();
        HX.GL.uniform1fv(this._splitDistancesLocation, new Float32Array(splitDistances));
        HX.GL.uniform1f(this._depthBiasLocation, light.getDepthBias());

        var k = 0;
        var l = 0;
        var len = this._numCascades;
        for (var i = 0; i < len; ++i) {
            var m = this._shadowMapRenderer.getShadowMatrix(i)._m;
            for (var j = 0; j < 16; ++j) {
                this._matrixData[k++] = m[j];
            }

            if (this._numShadowSamples > 1) {
                this._shadowSoftnessData[l++] = m[0] * this._shadowSoftness * .5;
                this._shadowSoftnessData[l++] = m[5] * this._shadowSoftness * .5;
            }
        }

        HX.GL.uniformMatrix4fv(this._shadowMatrixLocation, false, this._matrixData);

        if (this._numShadowSamples > 1)
            HX.GL.uniform2fv(this._shadowSoftnessLocation, this._shadowSoftnessData);
    }

    // render rect mesh
    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);

    return startIndex + 1;
};

HX.DirectionalLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.DirectionalLight.prototype._initLightPass =  function()
{
    var vertexShader = HX.DirectionalLight.getVertexShader(this._castsShadows);
    var fragmentShader = HX.DirectionalLight.getFragmentShader(this._castsShadows? this._numCascades : 0, this._numShadowSamples);
    var pass = new HX.EffectPass(vertexShader, fragmentShader, HX.Light._rectMesh);

    this._dirLocation = pass.getUniformLocation("lightWorldDirection");
    this._colorLocation = pass.getUniformLocation("lightColor");

    this._lightPass = pass;

    if (this._castsShadows) {
        this._matrixData = new Float32Array(16 * this._numCascades);
        this._lightPass.setTexture("shadowMap", this._shadowMapRenderer._shadowMap);
        this._splitDistancesLocation = this._lightPass.getUniformLocation("splitDistances[0]");
        this._shadowMatrixLocation = this._lightPass.getUniformLocation("shadowMapMatrices[0]");
        this._depthBiasLocation = this._lightPass.getUniformLocation("depthBias");
        if (this._numShadowSamples > 1) {
            this._shadowSoftnessLocation = this._lightPass.getUniformLocation("shadowMapSoftnesses[0]");
            this._shadowSoftnessData = new Float32Array(2 * this._numCascades);
        }
    }
};

HX.DirectionalLight.prototype._invalidateLightPass = function()
{
    if (this._lightPass) {
        this._lightPass._shader.dispose();
        this._lightPass = null;
        this._dirLocation = null;
        this._colorLocation = null;
        this._splitDistancesLocation = null;
        this._shadowMatrixLocation = null;
        this._depthBiasLocation = null;
        this._shadowSoftnessLocation = null;
        this._matrixData = null;
    }
}

HX.DirectionalLight.getVertexShader = function(castsShadows)
{
    return (castsShadows? "#define CAST_SHADOWS\n" : "") +
    "precision mediump float;\n\
    \n\
    attribute vec4 hx_position;\n\
    attribute vec2 hx_texCoord;\n\
    \n\
    #ifdef CAST_SHADOWS\n\
    uniform mat4 hx_inverseProjectionMatrix;\n\
    uniform mat4 hx_cameraWorldMatrix;\n\
    #else\n\
    uniform mat4 hx_inverseViewProjectionMatrix;\n\
    uniform vec3 hx_cameraWorldPosition;\n\
    #endif\n\
    \n\
    varying vec2 uv;\n\
    varying vec3 viewWorldDir;\n\
    \n\
    void main()\n\
    {\n\
            uv = hx_texCoord;\n\
            #ifdef CAST_SHADOWS\n\
                vec4 unproj = hx_inverseProjectionMatrix * vec4(hx_position.xy, 0.0, 1.0);\n\
                vec3 viewDir = unproj.xyz / unproj.w;\n\
                viewDir /= viewDir.z;\n\
                viewWorldDir = mat3(hx_cameraWorldMatrix) * viewDir;\n\
            #else\n\
                vec4 unproj = hx_inverseViewProjectionMatrix * vec4(hx_position.xy, 0.0, 1.0);\n\
                unproj /= unproj.w;\n\
                viewWorldDir = unproj.xyz - hx_cameraWorldPosition;\n\
            #endif\n\
            gl_Position = hx_position;\n\
    }";
}

HX.DirectionalLight.getFragmentShader = function(numCascades, numShadowSamples)
{
    return  (numCascades > 0? "#define NUM_CASCADES " + numCascades + "\n" : "") +
            (numShadowSamples > 1? "#define NUM_SHADOW_SAMPLES " + numShadowSamples + "\n" : "") +
    HX.DEFERRED_LIGHT_MODEL +
    "varying vec2 uv;\n\
    varying vec3 viewWorldDir;\n\
    \n\
    uniform vec3 lightColor;\n\
    uniform vec3 lightWorldDirection;\n\
    \n\
    uniform sampler2D hx_gbufferAlbedo;\n\
    uniform sampler2D hx_gbufferNormals;\n\
    uniform sampler2D hx_gbufferSpecular;\n\
    \n\
    #ifdef NUM_CASCADES\n\
        uniform sampler2D shadowMap;\n\
        uniform sampler2D hx_gbufferDepth;\n\
        uniform float hx_cameraFrustumRange;\n\
        \n\
        uniform vec3 hx_cameraWorldPosition;\n\
        uniform mat4 hx_projectionMatrix;\n\
        uniform mat4 shadowMapMatrices[NUM_CASCADES];\n\
        uniform float splitDistances[NUM_CASCADES];\n\
        uniform float depthBias;\n\
        \n\
        #ifdef NUM_SHADOW_SAMPLES\n\
            uniform sampler2D hx_dither2D;\n\
            uniform vec2 hx_dither2DTextureScale;\n\
            \n\
            uniform vec2 shadowMapSoftnesses[NUM_CASCADES];\n\
            uniform vec2 hx_poissonDisk[NUM_SHADOW_SAMPLES];\n\
        #endif\n\
        \n\
        // view-space position\n\
        #ifdef NUM_SHADOW_SAMPLES\n\
        void getShadowMapCoord(in vec3 worldPos, in float viewZ, out vec4 coord, out vec2 softness)\n\
        #else\n\
        void getShadowMapCoord(in vec3 worldPos, in float viewZ, out vec4 coord)\n\
        #endif\n\
        {\n\
            mat4 shadowMapMatrix = shadowMapMatrices[NUM_CASCADES - 1];\n\
            \n\
            for (int i = 0; i < NUM_CASCADES - 1; ++i) {\n\
                if (viewZ < splitDistances[i]) {\n\
                    shadowMapMatrix = shadowMapMatrices[i];\n\
                    #ifdef NUM_SHADOW_SAMPLES\n\
                        softness = shadowMapSoftnesses[i];\n\
                    #endif\n\
                    break;\n\
                }\n\
            }\n\
            coord = shadowMapMatrix * vec4(worldPos, 1.0);\n\
        }\n\
    #endif\n\
    \n\
    void main()\n\
    {\n\
        vec4 albedoSample = texture2D(hx_gbufferAlbedo, uv);\n\
        vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n\
        vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n\
        vec3 normal = normalize(normalSample.xyz - .5);\n\
        vec3 normalSpecularReflectance;\n\
        \n\
        albedoSample = hx_gammaToLinear(albedoSample);\n\
        vec3 normalizedWorldView = normalize(viewWorldDir);\n\
        #ifdef NUM_CASCADES\n\
            normalizedWorldView = -normalizedWorldView;\n\
        #endif\n\
        \n\
        float roughness;\n\
        hx_decodeReflectionData(albedoSample, specularSample, normalSpecularReflectance, roughness);\n\
        vec3 diffuseReflection;\n\
        vec3 specularReflection;\n\
        hx_lighting(normal, lightWorldDirection, normalizedWorldView, lightColor, normalSpecularReflectance, roughness, normalSample.w, diffuseReflection, specularReflection);\n\
        diffuseReflection *= albedoSample.xyz * (1.0 - specularSample.x);\n\
        vec3 totalReflection = diffuseReflection + specularReflection;\n\
        \n\
        #ifdef NUM_CASCADES\n\
            float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n\
            float viewZ = -depth * hx_cameraFrustumRange;\n\
            vec3 worldPos = hx_cameraWorldPosition + viewZ * viewWorldDir;\n\
            \n\
            vec4 shadowMapCoord;\n\
            #ifdef NUM_SHADOW_SAMPLES\n\
                vec2 radii;\n\
                getShadowMapCoord(worldPos, -viewZ, shadowMapCoord, radii);\n\
                float shadowTest = 0.0;\n\
                vec4 dither = texture2D(hx_dither2D, uv * hx_dither2DTextureScale);\n\
                dither *= radii.xxyy;  // add radius scale\n\
                for (int i = 0; i < NUM_SHADOW_SAMPLES; ++i) {\n\
                    vec2 offset;\
                    offset.x = dot(dither.xy, hx_poissonDisk[i]);\n\
                    offset.y = dot(dither.zw, hx_poissonDisk[i]);\n\
                    float shadowSample = texture2D(shadowMap, shadowMapCoord.xy + offset).x;\n\
                    float diff = shadowMapCoord.z - shadowSample;\n\
                    if (diff < depthBias) diff = -1.0;\n\
                    shadowTest += float(diff < 0.0);\n\
                }\n\
                shadowTest /= float(NUM_SHADOW_SAMPLES);\n\
                \n\
            #else\n\
                getShadowMapCoord(worldPos, -viewZ, shadowMapCoord);\n\
                float shadowSample = texture2D(shadowMap, shadowMapCoord.xy).x;\n\
                float diff = shadowMapCoord.z - shadowSample;\n\
                if (diff < .005) diff = -1.0;\n\
                float shadowTest = float(diff < 0.0);\n\
            #endif\n\
            totalReflection *= shadowTest;\n\
        \n\
        #endif\n\
        \n\
        gl_FragColor = vec4(totalReflection, 0.0);\n\
    }";
}