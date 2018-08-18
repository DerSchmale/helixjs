import {DirectLight} from "./DirectLight";
import {BoundingSphere} from "../scene/BoundingSphere";
import {Float4} from "../math/Float4";
import {Component} from "../entity/Component";

/**
 * @classdesc
 * PointLight represents an omnidirectional light source with a single point as origin. The light strength falls off
 * according to the inverse square rule.
 *
 * @property {number} radius The maximum reach of the light. While this is physically incorrect, it's necessary to limit the lights to a given area for performance.
 * @property {boolean} castShadows Defines whether or not this light casts shadows.
 *
 * @constructor
 *
 * @extends DirectLight
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PointLight()
{
	DirectLight.call(this);

    this._radius = 100.0;
    this.intensity = 3.1415;
    this.shadowQualityBias = 2;
    this._shadowTiles = null;
    this._bounds = new BoundingSphere();
}

Component.create(PointLight,
    {
        numAtlasPlanes: {
            get: function() { return 6; }
        },

        castShadows: {
            get: function()
            {
                return this._castShadows;
            },

            set: function(value)
            {
                this._castShadows = value;

                if (value) {
                    this._shadowTiles = [];
                    for (var i = 0; i < 6; ++i)
                        this._shadowTiles[i] = new Float4();
                }
                else {
                    this._shadowTiles = null;
                }
            }
        },

        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
                this._invalidateBounds();
            }
        }
    },
	DirectLight
);

/**
 * @ignore
 * @private
 */
PointLight.prototype._updateBounds = function()
{
	this._bounds.setExplicit(Float4.ORIGIN_POINT, this._radius);
};

/**
 * @ignore
 */
PointLight.prototype.toString = function()
{
	return "[PointLight(name=" + this._name + ")]";
};

/**
 * @ignore
 */
PointLight.prototype.copyFrom = function(src)
{
	DirectLight.prototype.copyFrom.call(this, src);
	this.radius = src.radius;
};

/**
 * @inheritDoc
 */
PointLight.prototype.clone = function()
{
	var clone = new PointLight();
	clone.copyFrom(this);
	return clone;
};

export { PointLight };