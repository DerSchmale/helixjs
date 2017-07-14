import {Light} from "./Light";
import {BoundingSphere} from "../scene/BoundingSphere";
import {DeferredPointShader} from "./shaders/DeferredPointShader";
import {Float4} from "../math/Float4";
import {META} from "../Helix";

/**
 * @classdesc
 * PointLight represents an omnidirectional light source with a single point as origin. The light strength falls off
 * according to the inverse square rule.
 *
 * @property {number} radius The maximum reach of the light. While this is physically incorrect, it's necessary to limit the lights to a given area for performance.
 *
 * @constructor
 *
 * @extends Light
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PointLight()
{
    Light.call(this);

    if (!PointLight._deferredShaderSphere && META.OPTIONS.defaultLightingModel) {
        PointLight._deferredShaderSphere = new DeferredPointShader(true);
        PointLight._deferredShaderRect = new DeferredPointShader(false);
    }

    this._radius = 100.0;
    this.intensity = 3.1415;
}

PointLight.prototype = Object.create(Light.prototype,
    {
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
        var distSqr = Float4.distanceSqr(camPos, thisPos);
        var rad = this._radius * 1.1;

        if (distSqr > rad * rad)
            PointLight._deferredShaderSphere.execute(renderer, this);
        else
            PointLight._deferredShaderRect.execute(renderer, this);
    }
}();

export { PointLight };