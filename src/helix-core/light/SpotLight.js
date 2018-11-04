import {DirectLight} from "./DirectLight";
import {Float4} from "../math/Float4";
import {MathX} from "../math/MathX";
import {Matrix4x4} from "../math/Matrix4x4";
import {BoundingSphere} from "../scene/BoundingSphere";
import {Component} from "../entity/Component";
import {PointLight} from "./PointLight";

/**
 * @classdesc
 * SpotLight represents an light source with a single point as origin and a conical range. The light strength falls off
 * according to the inverse square rule.
 *
 * @property {number} radius The maximum reach of the light. While this is physically incorrect, it's necessary to limit the lights to a given area for performance.
 * @property {number} innerAngle The angle of the spot light where it starts attenuating outwards. In radians!
 * @property {number} outerAngle The maximum angle of the spot light's reach. In radians!
 * @property {boolean} castShadows Defines whether or not this light casts shadows.
 *
 * @constructor
 *
 * @extends DirectLight
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpotLight()
{
	DirectLight.call(this);

    this._radius = 50.0;
    this._innerAngle = 1.2;
    this._outerAngle = 1.3;
    this._cosInner = Math.cos(this._innerAngle * .5);
    this._cosOuter = Math.cos(this._outerAngle * .5);
    this.intensity = 3.1415;

    this.shadowQualityBias = 1;
    this._shadowMatrix = null;
    this._shadowTile = null;    // xy = scale, zw = offset

    this._bounds = new BoundingSphere();
}

SpotLight.prototype = Object.create(DirectLight.prototype,
    {
        numAtlasPlanes: {
            get: function() { return 1; }
        },

        castShadows: {
            get: function()
            {
                return this._castShadows;
            },

            set: function(value)
            {
                if (this._castShadows === value) return;

                this._castShadows = value;

                if (value) {
                    this._shadowMatrix = new Matrix4x4();
                    this._shadowTile = new Float4();
                }
                else {
                    this._shadowMatrix = null;
                    this._shadowTile = null;
                }
            }
        },

        shadowMatrix: {
            get: function()
            {
                return this._shadowMatrix;
            }
        },

        shadowTile: {
            get: function()
            {
                return this._shadowTile;
            }
        },

        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
				this.invalidateBounds();
            }
        },

        innerAngle: {
            get: function() {
                return this._innerAngle;
            },

            set: function(value) {
                this._innerAngle = MathX.clamp(value, 0, Math.PI);
                this._outerAngle = MathX.clamp(this._outerAngle, this._innerAngle, Math.PI);
                this._cosInner = Math.cos(this._innerAngle * .5);
                this._cosOuter = Math.cos(this._outerAngle * .5);
				this.invalidateBounds();
            }
        },

        outerAngle: {
            get: function() {
                return this._outerAngle;
            },

            set: function(value) {
                this._outerAngle = MathX.clamp(value, 0, Math.PI);
                this._innerAngle = MathX.clamp(this._innerAngle, 0, this._outerAngle);
                this._cosInner = Math.cos(this._innerAngle * .5);
                this._cosOuter = Math.cos(this._outerAngle * .5);
				this.invalidateBounds();
            }
        }
    }
);

/**
 * @ignore
 */
SpotLight.prototype._updateBounds = function()
{
    var p = new Float4();
    return function() {
        // find the center of the sphere that contains both the origin as well as the outer points
		var x = this._radius / (2.0 * this._cosOuter);
		p.set(0, x, 0);
		this._bounds.setExplicit(p, x);
	};
}();

/**
 * @ignore
 */
SpotLight.prototype.toString = function()
{
	return "[SpotLight(name=" + this.name + ")]";
};

/**
 * @ignore
 */
SpotLight.prototype.copyFrom = function(src)
{
    DirectLight.prototype.copyFrom.call(this, src);
	this.radius = src.radius;
	this.innerAngle = src.innerAngle;
	this.outerAngle = src.outerAngle;
};

/**
 * @inheritDoc
 */
SpotLight.prototype.clone = function()
{
	var clone = new SpotLight();
	clone.copyFrom(this);
	return clone;
};

Component.register("light", SpotLight);

export { SpotLight };