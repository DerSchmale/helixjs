/**
 *
 * @constructor
 */
HX.FogPass = function()
{
    HX.EffectPass.call(this, HX.FogPass._vertexShader, HX.FogPass._fragmentShader);
    this.setDensity(.001);
    this.setTint(new HX.Color(1, 1, 1, 1));
    this.setStartDistance(0);
    this.setHeight(1000);
};

HX.FogPass.prototype = Object.create(HX.EffectPass.prototype);

HX.FogPass.prototype.getDensity = function()
{
    return this._density;
};

HX.FogPass.prototype.setDensity = function(value)
{
    this._density = value;
    this.setUniform("density", value);
};

HX.FogPass.prototype.getTint = function()
{
    return this._tint;
};

HX.FogPass.prototype.setTint = function(value)
{
    this._tint = value;
    this.setUniform("tint", {x: value.r, y: value.g, z: value.b});
};

HX.FogPass.prototype.getStartDistance = function()
{
    return this._startDistance;
};

HX.FogPass.prototype.setStartDistance = function(value)
{
    this._startDistance = value;
    this.setUniform("startDistance", value);
};

HX.FogPass.prototype.getHeight = function()
{
    return this._height;
};

HX.FogPass.prototype.setHeight = function(value)
{
    this._height = value;
    this.setUniform("height", value);
};

/**
 *
 * @param density
 * @param tint
 * @param startDistance
 * @param height
 * @constructor
 */
HX.FogEffect = function(density, tint, startDistance, height)
{
    HX.Effect.call(this);

    this._pass = new HX.FogPass();
    this.addPass(this._pass);
    if (density) this._pass.setDensity(density);
    if (tint) this._pass.setTint(tint);
    if (startDistance) this._pass.setStartDistance(startDistance);
    if (height) this._pass.setHeight(height);
};

HX.FogEffect.prototype = Object.create(HX.Effect.prototype);

HX.FogEffect.prototype.getDensity = function()
{
    return this._pass.getDensity();
};

HX.FogEffect.prototype.setDensity = function(value)
{
    return this._pass.setDensity(value);
};


HX.FogEffect.prototype.getTint = function()
{
    return this._pass.getTint();
};

HX.FogEffect.prototype.setTint = function(value)
{
    return this._pass.setTint(value);
};


HX.FogEffect.prototype.getStartDistance = function()
{
    return this._pass.getStartDistance();
};

HX.FogEffect.prototype.setStartDistance = function(value)
{
    return this._pass.setStartDistance(value);
};


HX.FogEffect.prototype.getHeight = function()
{
    return this._pass.getHeight();
};

HX.FogEffect.prototype.setHeight = function(value)
{
    return this._pass.setHeight(value);
};


HX.FogPass._vertexShader =
    "precision mediump float;\n\
    \n\
    attribute vec4 hx_position;\n\
    attribute vec2 hx_texCoord;\n\
    \n\
    uniform mat4 hx_inverseProjectionMatrix;\n\
    uniform mat4 hx_cameraWorldMatrix;\n\
    \n\
    varying vec2 uv;\n\
    varying vec3 viewWorldDir;\n\
    \n\
    void main()\
    {\n\
            uv = hx_texCoord;\n\
            vec3 frustumVector = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n\
            viewWorldDir = mat3(hx_cameraWorldMatrix) * frustumVector;\n\
            gl_Position = hx_position;\n\
    }";

HX.FogPass._fragmentShader =
    "varying vec2 uv;\n\
    varying vec3 viewWorldDir;\n\
    \n\
    uniform vec3 tint;\n\
    uniform float density;\n\
    uniform float startDistance;\n\
    uniform float height;\n\
    \n\
    uniform vec3 hx_cameraWorldPosition;\n\
    uniform float hx_cameraFrustumRange;\n\
    uniform float hx_cameraNearPlaneDistance;\n\
    uniform mat4 hx_projectionMatrix;\n\
    \n\
    uniform sampler2D hx_source;\n\
    uniform sampler2D hx_gbufferDepth;\n\
    \n\
    void main()\n\
    {\n\
        vec4 color = texture2D(hx_source, uv);\n\
        float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n\
        // do not fog up skybox\n\
        if (depth == 1.0) depth = -1.0;\n\
        float viewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n\
        vec3 viewDir = viewWorldDir * viewZ;\n\
        float worldY = viewDir.y + hx_cameraWorldPosition.y;\n\
        float s = sign(hx_cameraWorldPosition.y - height);\n\
        \n\
        float ratioUnder = clamp(s * (height - worldY) / abs(viewDir.y), 0.0, 1.0);\n\
        \n\
        if (hx_cameraWorldPosition.y < height)\n\
            ratioUnder = 1.0 - ratioUnder;\n\
        \n\
        float distance = length(viewDir) * ratioUnder;\n\
        \n\
        distance -= startDistance;\n\
        \n\
        float fog = clamp(exp2(-distance * density), 0.0, 1.0);\n\
        color.xyz = mix(tint, color.xyz, fog);\n\
        gl_FragColor = color;\n\
    }";