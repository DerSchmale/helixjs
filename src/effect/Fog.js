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

    this.addPass(new HX.EffectPass(HX.ShaderLibrary.get("fog_vertex.glsl"), HX.ShaderLibrary.get("fog_fragment.glsl")));

    this.setDensity(density === undefined? .001 : density);
    this.setTint(tint === undefined? new HX.Color(1, 1, 1, 1) : tint);
    this.setStartDistance(startDistance === undefined? 0 : startDistance);
    this.setHeight(height === undefined? 1000 : height);
};

HX.FogEffect.prototype = Object.create(HX.Effect.prototype);

HX.FogEffect.prototype.getDensity = function()
{
    return this._density;
};

HX.FogEffect.prototype.setDensity = function(value)
{
    this._density = value;
    this.setUniform("density", value);
};


HX.FogEffect.prototype.getTint = function()
{
    return this._tint;
};

HX.FogEffect.prototype.setTint = function(value)
{
    this._tint = value;
    this.setUniform("tint", {x: value.r, y: value.g, z: value.b});
};


HX.FogEffect.prototype.getStartDistance = function()
{
    return this._startDistance;
};

HX.FogEffect.prototype.setStartDistance = function(value)
{
    this._startDistance = value;
    this.setUniform("startDistance", value);
};


HX.FogEffect.prototype.getHeight = function()
{
    return this._height;
};

HX.FogEffect.prototype.setHeight = function(value)
{
    this._height = value;
    this.setUniform("height", value);
};