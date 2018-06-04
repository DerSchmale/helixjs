import {DirectLight} from "./DirectLight";
import {Float4} from "../math/Float4";
import {MathX} from "../math/MathX";
import {Matrix4x4} from "../math/Matrix4x4";
import {BoundingSphere} from "../scene/BoundingSphere";

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
    this.lookAt(new Float4(0, 0, -1));

    this.depthBias = .0;
    this.shadowQualityBias = 1;
    this._shadowMatrix = null;
    this._shadowTile = null;    // xy = scale, zw = offset
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
                this._invalidateWorldBounds();
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
				this._invalidateWorldBounds();
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
				this._invalidateWorldBounds();
            }
        }
    });

/**
 * @ignore
 */
SpotLight.prototype._createBoundingVolume = function()
{
    return new BoundingSphere();
};

/**
 * @ignore
 */
SpotLight.prototype._updateWorldBounds = function()
{
    // think in 2D, with the X axis aligned to the spot's Y (forward) vector
    // form a right-angled triangle with hypothenuse between 0 and Q = (l, h) = (r cosA, r sinA)
    // find the point P on the base line (2D X axis) where |P - O| = |P - Q|
    // Since on the base line: P = (x, 0) and |P - O| = x

    // then apply x to the 3D Y axis to find the center of the bounding sphere, with radius |P - O|

    // another right-angled triangle forms with hypothenuse |P - Q| and h, so:
    // |P - Q|^2 = (l - x)^2 + h^2

    // |P - O| = |P - Q|
    // x = |P - Q|
    // x^2 = |P - Q|^2
    // x^2 = (l - x)^2 + h^2
    // x^2 = l^2 - 2lx + x^2 + h^2
    // x = (l^2 + h^2)/2l
    // x = r^2 * (cos2 A + sin2 A) / 2l
    //           (cos2 A + sin2 A = 1)
    // x = r^2 / 2l = r^2 / 2rcosA
    // x = r / 2cos(A)

    var y = new Float4();
    var p = new Float4();
    return function() {
		var x = this._radius / (2.0 * this._cosOuter);
		var m = this.worldMatrix;

		m.getColumn(3, p);  // position
        m.getColumn(1, y);  // forward
		p.addScaled(y, x);  // move center sphere forward by x * fwd
		this._worldBounds.setExplicit(p, x);
	};
}();

/**
 * @ignore
 */
SpotLight.prototype.toString = function()
{
	return "[SpotLight(name=" + this._name + ")]";
};


export { SpotLight };