/**
 *
 * @constructor
 */
import {Light} from "./Light";
import {BoundingSphere} from "../scene/BoundingSphere";
function PointLight()
{
    Light.call(this);

    this._radius = 100.0;
    this.intensity = 3.1415;
};

PointLight.LIGHTS_PER_BATCH = 20;
PointLight.SPHERE_SEGMENTS_W = 16;
PointLight.SPHERE_SEGMENTS_H = 10;
PointLight.NUM_SPHERE_INDICES = -1;  // will be set on creation instead of passing value that might get invalidated

PointLight.prototype = Object.create(Light.prototype,
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

PointLight.prototype._createBoundingVolume = function()
{
    return new BoundingSphere();
};

PointLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.setExplicit(this.worldMatrix.getColumn(3), this._radius);
};

export { PointLight };