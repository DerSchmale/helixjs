/**
 * Can be used directly, or have SkyBox manage this for you (generally the best approach). Acts as an infinite environment map.
 */
HX.LightProbe = function(diffuseTexture, specularTexture)
{
    HX.Entity.call(this);
    this._specularTexture = specularTexture;
    this._diffuseTexture = diffuseTexture;
    this._size = undefined;
};

// conversion range for spec power to mip
HX.LightProbe.powerRange0 = .00098;
HX.LightProbe.powerRange1 = .9921;

HX.LightProbe.prototype = Object.create(HX.Entity.prototype,
    {
        specularTexture: {
            get: function() { return this._specularTexture; },
            set: function(value) { this._specularTexture = value; },
        },
        diffuseTexture: {
            get: function() { return this._diffuseTexture; },
            set: function(value) { this._diffuseTexture = value; },
        }
    });

HX.LightProbe.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
    HX.Light.prototype._updateWorldBounds.call(this);
};