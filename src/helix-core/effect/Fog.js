/**
 *
 * @param density
 * @param tint
 * @param startDistance
 * @param height
 * @constructor
 */
HX.Fog = function(density, tint, startDistance)
{
    HX.Effect.call(this);

    this._fogPass = new HX.EffectPass(null, HX.ShaderLibrary.get("fog_fragment.glsl"));
    this.needsNormalDepth = true;
    this.density = density === undefined? .001 : density;
    this.tint = tint === undefined? new HX.Color(1, 1, 1, 1) : tint;
    this.startDistance = startDistance === undefined? 0 : startDistance;
};

HX.Fog.prototype = Object.create(HX.Effect.prototype,
    {
        density: {
            get: function()
            {
                return this._density;
            },
            set: function(value)
            {
                this._density = value;
                this._fogPass.setUniform("density", value);
            }
        },

        tint: {
            get: function ()
            {
                return this._tint;
            },
            set: function (value)
            {
                this._tint = value;
                this._fogPass.setUniform("tint", {x: value.r, y: value.g, z: value.b});
            }
        },

        startDistance: {
            get: function()
            {
                return this._startDistance;
            },
            set: function(value)
            {
                this._startDistance = value;
                this._fogPass.setUniform("startDistance", value);
            }
        }
    }
);


HX.Fog.prototype.draw = function(dt)
{
    HX.setRenderTarget(this.hdrTarget);
    HX.clear();
    this._drawPass(this._fogPass);
};