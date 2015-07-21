/**
 *
 * @constructor
 */
HX.AmbientLight = function()
{
    HX.Light.call(this, HX.AmbientLight);

    HX.Light._rectMesh = HX.Light._rectMesh || new HX.RectMesh.create();

    this._lightPass = null;
    this._useAO = false;

    this.setColor(new HX.Color(.1,.1,.1));
};

HX.AmbientLight.prototype = Object.create(HX.Light.prototype);

HX.AmbientLight.prototype.activate = function(camera, gbuffer, occlusion)
{
    var useAO = occlusion != null;

    if (!this._lightPass || this._useAO != useAO) {
        this._useAO = useAO;
        this._initLightPass();
    }

    HX.GL.disable(HX.GL.DEPTH_TEST);
    HX.GL.disable(HX.GL.CULL_FACE);

    HX.AmbientLight._lightPass.updateGlobalState(camera, gbuffer, occlusion);
    HX.AmbientLight._lightPass.updateRenderState();
};

// returns the index of the FIRST UNRENDERED light
HX.AmbientLight.prototype.renderBatch = function(lightCollection, startIndex, camera, gbuffer, occlusion)
{
    this._occlusion = occlusion;
    var colorR = 0, colorG = 0, colorB = 0;
    var end = lightCollection.length;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];
        var color = light._scaledIrradiance;

        if (light._type != this._type) {
            end = i;
            break;
        }
        colorR += color.r;
        colorG += color.g;
        colorB += color.b;
    }
    HX.GL.uniform3f(HX.AmbientLight._colorLocation, colorR, colorG, colorB);

    // render rect mesh
    HX.GL.drawElements(HX.GL.TRIANGLES, 6, HX.GL.UNSIGNED_SHORT, 0);

    return end;
};

HX.AmbientLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};

HX.AmbientLight.prototype._initLightPass =  function()
{
    var pass = new HX.EffectPass(HX.AmbientLight.vertexShader, HX.AmbientLight.getFragmentShader(this._useAO), HX.Light._rectMesh);

    HX.AmbientLight._colorLocation = pass.getUniformLocation("lightColor");

    HX.AmbientLight._lightPass = pass;
};

HX.AmbientLight.vertexShader =
    "precision mediump float;\
    \
    attribute vec4 hx_position;\
    attribute vec2 hx_texCoord;\
    \
    varying vec2 uv;\
    \
    void main()\
    {\
            uv = hx_texCoord;\
            gl_Position = hx_position;\
    }";

HX.AmbientLight.getFragmentShader = function(useAO)
{
    return (useAO? "#define USE_AO\n" : "") +
            "precision mediump float;\n\
            uniform vec3 lightColor;\n\
            \n\
            uniform sampler2D hx_gbufferAlbedo;\n\
            #ifdef USE_AO\n\
            uniform sampler2D hx_source;    // contains AO \n\
            #endif\n\
            \n\
            varying vec2 uv;\n\
            \n\
            void main()\n\
            {\n\
                vec3 albedoSample = texture2D(hx_gbufferAlbedo, uv).xyz;\n\
                #ifdef USE_AO\n\
                float occlusionSample = texture2D(hx_source, uv).w;\n\
                albedoSample *= occlusionSample;\n\
                #endif\n\
                \n\
                albedoSample = hx_gammaToLinear(albedoSample);\n\
                \n\
                gl_FragColor = vec4(lightColor * albedoSample, 0.0);\n\
            }";
};