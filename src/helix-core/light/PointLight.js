import {Light} from "./Light";
import {BoundingSphere} from "../scene/BoundingSphere";
import {DeferredPointShader} from "./shaders/DeferredPointShader";
import {Float4} from "../math/Float4";

/**
 *
 * @constructor
 */
function PointLight()
{
    Light.call(this);

    if (!PointLight._deferredShaderSphere) {
        PointLight._deferredShaderSphere = new DeferredPointShader(true);
        PointLight._deferredShaderRect = new DeferredPointShader(false);
    }

    this._radius = 100.0;
    this.intensity = 3.1415;
}

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