/**
 *
 * @constructor
 */
import {Light} from "./Light";
import {Float4} from "../math/Float4";
import {Matrix4x4} from "../math/Matrix4x4";
import {BoundingVolume} from "../scene/BoundingVolume";
import {CascadeShadowMapRenderer} from "../render/CascadeShadowMapRenderer";

function DirectionalLight()
{
    Light.call(this);

    this.depthBias = .0;
    this._shadowMapSize = 1024;
    this._shadowMapRenderer = null;
    this.direction = new Float4(-1.0, -1.0, -1.0, 0.0);
}

// set on init
DirectionalLight.SHADOW_FILTER = null;

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
                    this._shadowMapRenderer.dispose();
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
                var dir = this.worldMatrix.getColumn(2);
                dir.x = -dir.x;
                dir.y = -dir.y;
                dir.z = -dir.z;
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
 * The ratios that define every cascade's split distance. Reset when numCascades change. 1 is at the far plane, 0 is at the near plane. Passing more than numCascades has no effect.
 * @param r1
 * @param r2
 * @param r3
 * @param r4
 */
DirectionalLight.prototype.setCascadeRatios = function(r1, r2, r3, r4)
{
    this._shadowMapRenderer.setSplitRatios(r1, r2, r3, r4);
};

DirectionalLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

export { DirectionalLight };