import {Light} from "./Light";
import {Float4} from "../math/Float4";
import {META} from "../Helix";
import {MathX} from "../math/MathX";
import {BoundingAABB} from "../scene/BoundingAABB";
import {DeferredSpotShader} from "./shaders/DeferredSpotShader";
import {Frustum} from "../camera/Frustum";
import {PlaneSide} from "../math/PlaneSide";

/**
 * @classdesc
 * SpotLight represents an light source with a single point as origin and a conical range. The light strength falls off
 * according to the inverse square rule.
 *
 * @property {number} radius The maximum reach of the light. While this is physically incorrect, it's necessary to limit the lights to a given area for performance.
 * @property {number} innerAngle The angle from the center where the spot light starts attenuating outwards. In radians!
 * @property {number} outerAngle The maximum angle of the spot light's reach. In radians!
 *
 * @constructor
 *
 * @extends Light
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpotLight()
{
    Light.call(this);

    if (!SpotLight._deferredShaderSphere && META.OPTIONS.deferredLightingModel) {
        SpotLight._deferredShaderCone = new DeferredSpotShader(true);
        SpotLight._deferredShaderRect = new DeferredSpotShader(false);
    }

    this._localBounds = new BoundingAABB();
    this._radius = 50.0;
    this._innerAngle = 0.6;
    this._outerAngle = 0.65;
    this._cosInner = Math.cos(this._innerAngle);
    this._cosOuter = Math.cos(this._outerAngle);
    this._sinOuter = Math.sin(this._outerAngle);
    this.intensity = 3.1415;
    this.lookAt(new Float4(0, -1, 0));
    this._localBoundsInvalid = true;
}

SpotLight.prototype = Object.create(Light.prototype,
    {
        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
                this._updateWorldBounds();
                this._invalidateLocalBounds();
            }
        },

        innerAngle: {
            get: function() {
                return this._innerAngle;
            },

            set: function(value) {
                var deg90 = Math.PI * .5;
                this._innerAngle = MathX.clamp(value, 0, deg90);
                this._outerAngle = MathX.clamp(this._outerAngle, this._innerAngle, deg90);
                this._cosInner = Math.cos(this._innerAngle);
                this._cosOuter = Math.cos(this._outerAngle);
                this._sinOuter = Math.cos(this._sinOuter);
                this._invalidateLocalBounds();
            }
        },

        outerAngle: {
            get: function() {
                return this._outerAngle;
            },

            set: function(value) {
                var deg90 = Math.PI * .5;
                this._outerAngle = MathX.clamp(value, 0, deg90);
                this._innerAngle = MathX.clamp(this._innerAngle, 0, this._outerAngle);
                this._cosInner = Math.cos(this._innerAngle);
                this._cosOuter = Math.cos(this._outerAngle);
                this._sinOuter = Math.cos(this._sinOuter);
                this._invalidateLocalBounds();
            }
        }
    });

/**
 * @ignore
 */
SpotLight.prototype._createBoundingVolume = function()
{
    return new BoundingAABB();
};

/**
 * @ignore
 */
SpotLight.prototype._updateWorldBounds = function()
{
    if (this._localBoundsInvalid)
        this._updateLocalBounds();

    this._worldBounds.transformFrom(this._localBounds, this.worldMatrix);
};

/**
 * @ignore
 */
SpotLight.prototype.renderDeferredLighting = function(renderer)
{
    var camPos = new Float4();
    var thisPos = new Float4();

    return function(renderer) {

        var camera = renderer._camera;
        // distance camera vs light to estimate projected size
        camera.worldMatrix.getColumn(3, camPos);
        this.worldMatrix.getColumn(3, thisPos);
        var side = this.worldBounds.classifyAgainstPlane(camera.frustum.planes[Frustum.PLANE_NEAR]);

        if (side === PlaneSide.FRONT)
            SpotLight._deferredShaderCone.execute(renderer, this);
        else
            SpotLight._deferredShaderRect.execute(renderer, this);
    }
}();

/**
 * @ignore
 * @private
 */
SpotLight.prototype._updateLocalBounds = function()
{
    var min = new Float4();
    var max = new Float4();

    return function() {
        // spotlight points in posZ direction, with range [0, radius]
        max.z = this._radius;

        // most basic trig
        var b = this._sinOuter * this._radius;
        min.x = -b;
        min.y = -b;
        max.x = b;
        max.y = b;

        if (this._radius === undefined) {
            throw new Error("No radius!");
        }

        this._localBounds.setExplicit(min, max);
        this._localBoundsInvalid = false;
    };
}();

SpotLight.prototype._invalidateLocalBounds = function()
{
    this._localBoundsInvalid = true;
    this._invalidateWorldBounds();
};

export { SpotLight };