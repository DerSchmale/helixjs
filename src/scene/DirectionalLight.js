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
    var defines = "";

    if (this._castsShadows) {
        defines += "#define CAST_SHADOWS\n";
        defines += "#define NUM_CASCADES " + this._numCascades + "\n";
        defines += "#define NUM_SHADOW_SAMPLES " + this._numShadowSamples + "\n";
    }
    var vertexShader = defines + HX.ShaderLibrary.get("directional_light_vertex.glsl");
    var fragmentShader = HX.DEFERRED_LIGHT_MODEL + defines + HX.ShaderLibrary.get("directional_light_fragment.glsl");
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
};