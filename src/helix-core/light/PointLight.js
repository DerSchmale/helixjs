/**
 *
 * @constructor
 */
HX.PointLight = function()
{
    HX.Light.call(this);

    this._radius = 100.0;
    this.intensity = 3.1415;
};

HX.PointLight.LIGHTS_PER_BATCH = 20;
HX.PointLight.SPHERE_SEGMENTS_W = 16;
HX.PointLight.SPHERE_SEGMENTS_H = 10;
HX.PointLight.NUM_SPHERE_INDICES = -1;  // will be set on creation instead of passing value that might get invalidated

HX.PointLight.prototype = Object.create(HX.Light.prototype,
    {
        // radius is not physically correct, but invaluable for performance
        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
                this._updateWorldBounds();
            }
        }
    });

HX.PointLight.prototype._createBoundingVolume = function()
{
    return new HX.BoundingSphere();
};

HX.PointLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.setExplicit(this.worldMatrix.getColumn(3), this._radius);
};