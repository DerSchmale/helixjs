import {DirectLight} from "./DirectLight";
import {BoundingSphere} from "../scene/BoundingSphere";
import {DeferredPointShader} from "./shaders/DeferredPointShader";
import {Float4} from "../math/Float4";
import {META} from "../Helix";
import {OmniShadowMapRenderer} from "../render/OmniShadowMapRenderer";

/**
 * @classdesc
 * PointLight represents an omnidirectional light source with a single point as origin. The light strength falls off
 * according to the inverse square rule.
 *
 * @property {number} radius The maximum reach of the light. While this is physically incorrect, it's necessary to limit the lights to a given area for performance.
 * @property {boolean} castShadows Defines whether or not this light casts shadows.
 * @property {number} shadowMapSize The shadow map size used by this light.
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

    if (!PointLight._deferredShaderSphere && META.OPTIONS.deferredLightingModel) {
        PointLight._deferredShaderSphere = new DeferredPointShader(true, false);
        PointLight._deferredShaderRect = new DeferredPointShader(false, false);
        PointLight._deferredShaderSphereShadows = new DeferredPointShader(true, true);
        PointLight._deferredShaderRectShadows = new DeferredPointShader(false, true);
    }

    this._radius = 100.0;
    this.intensity = 3.1415;
    this.depthBias = .0;
    this._shadowMapSize = 256;
    this._shadowMapRenderer = null;
}

PointLight.prototype = Object.create(DirectLight.prototype,
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
                    this._shadowMapRenderer = new OmniShadowMapRenderer(this, this._shadowMapSize);
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
            }
        }
    });

/**
 * @ignore
 */
PointLight.prototype._createBoundingVolume = function()
{
    return new BoundingSphere();
};

/**
 * @ignore
 */
PointLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.setExplicit(this.worldMatrix.getColumn(3), this._radius);
};

/**
 * @ignore
 */
PointLight.prototype.renderDeferredLighting = function(renderer)
{
    var camPos = new Float4();
    var thisPos = new Float4();
    return function(renderer) {

        // distance camera vs light to estimate projected size
        renderer._camera.worldMatrix.getColumn(3, camPos);
        this.worldMatrix.getColumn(3, thisPos);
        var distSqr = camPos.squareDistanceTo(thisPos);
        var rad = this._radius * 1.1;

        var shader;
        if (distSqr > rad * rad)
            shader = this._castShadows? PointLight._deferredShaderSphereShadows : PointLight._deferredShaderSphere;
        else
            shader = this._castShadows? PointLight._deferredShaderRectShadows : PointLight._deferredShaderRect;

        shader.execute(renderer, this);
    }
}();

export { PointLight };