import {DirectLight} from "./DirectLight";
import {Float4} from "../math/Float4";
import {META} from "../Helix";
import {MathX} from "../math/MathX";
import {BoundingAABB} from "../scene/BoundingAABB";
import {DeferredSpotShader} from "./shaders/DeferredSpotShader";
import {Frustum} from "../camera/Frustum";
import {PlaneSide} from "../math/PlaneSide";
import {SpotShadowMapRenderer} from "../render/SpotShadowMapRenderer";

/**
 * @classdesc
 * SpotLight represents an light source with a single point as origin and a conical range. The light strength falls off
 * according to the inverse square rule.
 *
 * @property {number} radius The maximum reach of the light. While this is physically incorrect, it's necessary to limit the lights to a given area for performance.
 * @property {number} innerAngle The angle of the spot light where it starts attenuating outwards. In radians!
 * @property {number} outerAngle The maximum angle of the spot light's reach. In radians!
 * @property {boolean} castShadows Defines whether or not this light casts shadows.
 * @property {number} shadowMapSize The shadow map size used by this light.
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

    if (!SpotLight._deferredShaderSphere && META.OPTIONS.deferredLightingModel) {
        SpotLight._deferredShaderCone = new DeferredSpotShader(true, false);
        SpotLight._deferredShaderRect = new DeferredSpotShader(false, false);
        SpotLight._deferredShaderConeShadows = new DeferredSpotShader(true, true);
        SpotLight._deferredShaderRectShadows = new DeferredSpotShader(false, true);
    }

    this._localBounds = new BoundingAABB();
    this._radius = 50.0;
    this._innerAngle = 1.2;
    this._outerAngle = 1.3;
    this._cosInner = Math.cos(this._innerAngle * .5);
    this._cosOuter = Math.cos(this._outerAngle * .5);
    this._sinOuter = Math.sin(this._outerAngle * .5);
    this.intensity = 3.1415;
    this.lookAt(new Float4(0, 0, -1));
    this._localBoundsInvalid = true;

    this.depthBias = .0;
    this._shadowMapSize = 256;
    this._shadowMapRenderer = null;
}

SpotLight.prototype = Object.create(DirectLight.prototype,
    {
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
                    this._shadowMapRenderer = new SpotShadowMapRenderer(this, this._shadowMapSize);
                }
                else {
                    this._shadowMapRenderer = null;
                }
            }
        },

        shadowMapSize: {
            get: function()
            {
                return this._shadowMapSize;
            },

            set: function(value)
            {
                this._shadowMapSize = value;
                if (this._shadowMapRenderer) this._shadowMapRenderer.shadowMapSize = value;
            }
        },

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
                this._innerAngle = MathX.clamp(value, 0, Math.PI);
                this._outerAngle = MathX.clamp(this._outerAngle, this._innerAngle, Math.PI);
                this._cosInner = Math.cos(this._innerAngle * .5);
                this._cosOuter = Math.cos(this._outerAngle * .5);
                this._sinOuter = Math.cos(this._sinOuter * .5);
                this._invalidateLocalBounds();
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
                this._sinOuter = Math.cos(this._sinOuter * .5);
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

        var shader;
        if (side === PlaneSide.FRONT)
            shader = this._castShadows? SpotLight._deferredShaderConeShadows : SpotLight._deferredShaderCone;
        else
            shader = this._castShadows? SpotLight._deferredShaderRectShadows : SpotLight._deferredShaderRect;

        shader.execute(renderer, this);
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