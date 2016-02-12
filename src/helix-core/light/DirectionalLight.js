/**
 *
 * @constructor
 */
HX.DirectionalLight = function()
{
    HX.Light.call(this);

    this._numCascades = 1;
    this._shadowMapSize = 1024;

    // these two don't need getters/setters (saves on filesize)
    this.shadowSoftness = .01;
    this.depthBias = .0;

    this.direction = new HX.Float4(-1.0, -1.0, -1.0, 0.0);
    this._matrixData = null;

    this._dirLocation = null;
    this._colorLocation = null;
    this._splitDistancesLocation = null;
    this._shadowMatrixLocation = null;
    this._depthBiasLocation = null;
    this._shadowSoftnessLocation = null;
};

HX.DirectionalLight.prototype = Object.create(HX.Light.prototype,
    {
        castShadows: {
            get: function()
            {
                return this._castShadows;
            },

            set: function(value)
            {
                if (this._castShadows == value) return;

                this._castShadows = value;

                if (value) {
                    this._shadowMapRenderer = new HX.CascadeShadowMapRenderer(this, this._numCascades, this._shadowMapSize);
                }
                else {
                    this._shadowMapRenderer.dispose();
                    this._shadowMapRenderer = null;
                }

                this._invalidateLightPass();
            }
        },

        numCascades: {
            get: function()
            {
                return this._numCascades;
            },

            set: function(value)
            {
                if (value > 4) {
                    console.warn("set numCascades called with value greater than 4. Real value will be set to 4.");
                    value = 4;
                }

                this._numCascades = value;
                if (this._castShadows) this._invalidateLightPass();
                if (this._shadowMapRenderer) this._shadowMapRenderer.setNumCascades(value);
            }
        },

        shadowMapSize: {
            get: function()
            {
                return this._shadowMapSize;
            },

            set: function(value)
            {
                this._shadowMapSize = value;
                if (this._shadowMapRenderer) this._shadowMapRenderer.setShadowMapSize(value);
            }
        },

        direction: {
            get: function()
            {
                var dir = this.worldMatrix.getColumn(2);
                dir.x = -dir.x;
                dir.y = -dir.y;
                dir.z = -dir.z;
                return dir;
            },

            set: function(value)
            {
                var matrix = new HX.Matrix4x4();
                var position = this.worldMatrix.getColumn(3);
                var target = HX.Float4.add(value, position);
                matrix.lookAt(target, position, HX.Float4.Y_AXIS);
                this.transformationMatrix = matrix;
            }
        }
    });

// returns the index of the FIRST UNRENDERED light
HX.DirectionalLight.prototype.renderBatch = function(lightCollection, startIndex, renderer)
{
    if (!this._lightPass)
        this._initLightPass();

    var camera = renderer._camera;

    this._lightPass.updateRenderState(renderer);

    var light = lightCollection[startIndex];
    var dir = camera.viewMatrix.transform(light.direction);
    var color = light._scaledIrradiance;

    HX.GL.uniform3f(this._dirLocation, dir.x, dir.y, dir.z);
    HX.GL.uniform3f(this._colorLocation, color.r ,color.g, color.b);

    if (this._castShadows) {
        var softness = new HX.Float2();
        var splitDistances = this._shadowMapRenderer.getSplitDistances();
        HX.GL.uniform1fv(this._splitDistancesLocation, new Float32Array(splitDistances));
        HX.GL.uniform1f(this._depthBiasLocation, light.depthBias);

        var k = 0;
        var l = 0;
        var len = this._numCascades;
        var matrix = new HX.Matrix4x4();

        for (var i = 0; i < len; ++i) {
            matrix.multiply(this._shadowMapRenderer.getShadowMatrix(i), camera.worldMatrix);
            var m = matrix._m;
            for (var j = 0; j < 16; ++j) {
                this._matrixData[k++] = m[j];
            }
        }

        HX.GL.uniformMatrix4fv(this._shadowMatrixLocation, false, this._matrixData);

        if (this._shadowSoftnessLocation)
            HX.GL.uniform1f(this._shadowSoftnessLocation, light.shadowSoftness);
    }

    // render rect mesh
    HX.drawElements(HX.GL.TRIANGLES, 6, 0);

    return startIndex + 1;
};

HX.DirectionalLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
};

HX.DirectionalLight.prototype._initLightPass =  function()
{
    var defines = {};

    if (this._castShadows) {
        defines.CAST_SHADOWS = 1;
        defines.NUM_CASCADES = this._numCascades;
    }

    var vertexShader = HX.ShaderLibrary.get("directional_light_vertex.glsl", defines);
    var fragmentShader =
        HX.DIR_SHADOW_MODEL.getGLSL() + "\n" +
        HX.LIGHTING_MODEL.getGLSL() + "\n" +
        HX.ShaderLibrary.get("directional_light_fragment.glsl", defines);

    var pass = new HX.EffectPass(vertexShader, fragmentShader);
    pass.blendState = HX.BlendState.ADD;

    this._dirLocation = pass.getUniformLocation("lightViewDirection");
    this._colorLocation = pass.getUniformLocation("lightColor");

    this._lightPass = pass;

    if (this._castShadows) {
        this._matrixData = new Float32Array(16 * this._numCascades);
        this._lightPass.setTexture("shadowMap", this._shadowMapRenderer._shadowMap);
        this._splitDistancesLocation = this._lightPass.getUniformLocation("splitDistances[0]");
        this._shadowMatrixLocation = this._lightPass.getUniformLocation("shadowMapMatrices[0]");
        this._depthBiasLocation = this._lightPass.getUniformLocation("depthBias");
        this._shadowSoftnessLocation = this._lightPass.getUniformLocation("hx_shadowSoftness");
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