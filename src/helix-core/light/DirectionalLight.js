import {Light} from "./Light";
import {Float4} from "../math/Float4";
import {Matrix4x4} from "../math/Matrix4x4";
import {BoundingVolume} from "../scene/BoundingVolume";
import {CascadeShadowMapRenderer} from "../render/CascadeShadowMapRenderer";
import {DeferredDirectionalShader} from "./shaders/DeferredDirectionalShader";
import {META} from "../Helix";

/**
 * @classdesc
 * DirectionalLight represents a light source that is "infinitely far away", used as an approximation for sun light where
 * locally all sun rays appear to be parallel.
 *
 * @property {boolean} castShadows Defines whether or not this light casts shadows.
 * @property {number} shadowMapSize The shadow map size used by this light.
 * @property {Float4} direction The direction in *world space* of the light rays. This cannot be set per component but
 * needs to be assigned as a whole Float4.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DirectionalLight()
{
    Light.call(this);

    if (!DirectionalLight._deferredShader && META.OPTIONS.deferredLightingModel)
        DirectionalLight._initDeferredShaders();

    this.depthBias = .0;
    this._shadowMapSize = 1024;
    this._shadowMapRenderer = null;
    this.direction = new Float4(-1.0, -1.0, -1.0, 0.0);

    // this is just a storage vector
    this._direction = new Float4();
}

/**
 * @ignore
 */
DirectionalLight.SHADOW_FILTER = null;

/**
 * @ignore
 * @private
 */
DirectionalLight._initDeferredShaders = function()
{
    DirectionalLight._deferredShader = new DeferredDirectionalShader(false);
    DirectionalLight._deferredShadowShader = new DeferredDirectionalShader(true);
};

DirectionalLight.prototype = Object.create(Light.prototype,
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
                    this._shadowMapRenderer = new CascadeShadowMapRenderer(this, this._shadowMapSize);
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

        direction: {
            get: function()
            {
                var dir = this._direction;
                this.worldMatrix.getColumn(2, dir);
                return dir;
            },

            set: function(value)
            {
                var matrix = new Matrix4x4();
                var position = this.worldMatrix.getColumn(3);
                var target = Float4.add(value, position);
                matrix.lookAt(target, position, Float4.Y_AXIS);
                this.matrix = matrix;
            }
        }
    });

/**
 * The ratios that define every shadow cascade's split distance. Reset when numCascades change. 1 is at the far plane, 0 is at the near plane. Passing more than InitOptions.numShadowCascades has no effect.
 */
DirectionalLight.prototype.setCascadeRatios = function(r1, r2, r3, r4)
{
    this._shadowMapRenderer.setSplitRatios(r1, r2, r3, r4);
};

/**
 * @ignore
 */
DirectionalLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @ignore
 */
DirectionalLight.prototype.renderDeferredLighting = function(renderer)
{
    var shader = this._castShadows? DirectionalLight._deferredShadowShader : DirectionalLight._deferredShader;
    shader.execute(renderer, this);
};

export { DirectionalLight };