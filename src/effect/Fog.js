/**
 *
 * @param density
 * @param tint
 * @param startDistance
 * @param height
 * @constructor
 */
HX.FogEffect = function(density, tint, startDistance)
{
    HX.Effect.call(this);

    this.addPass(new HX.EffectPass(HX.ShaderLibrary.get("fog_vertex.glsl"), HX.ShaderLibrary.get("fog_fragment.glsl")));

    this.density = density === undefined? .001 : density;
    this.tint = tint === undefined? new HX.Color(1, 1, 1, 1) : tint;
    this.startDistance = startDistance === undefined? 0 : startDistance;
};

HX.FogEffect.prototype = Object.create(HX.Effect.prototype);

Object.defineProperty(HX.FogEffect.prototype, "density", {
    get: function()
    {
        return this._density;
    },
    set: function(value)
    {
        this._density = value;
        this.setUniform("density", value);
    }
});

Object.defineProperty(HX.FogEffect.prototype, "tint", {
    get: function()
    {
        return this._tint;
    },
    set: function(value)
    {
        this._tint = value;
        this.setUniform("tint", {x: value.r, y: value.g, z: value.b});
    }
});

Object.defineProperty(HX.FogEffect.prototype, "startDistance", {
    get: function()
    {
        return this._startDistance;
    },
    set: function(value)
    {
        this._startDistance = value;
        this.setUniform("startDistance", value);
    }
});