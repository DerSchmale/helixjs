import {DirectLight} from "./DirectLight";
import {BoundingSphere} from "../scene/BoundingSphere";
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

export { PointLight };