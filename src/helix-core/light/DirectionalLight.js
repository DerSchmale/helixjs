/**
 *
 * @constructor
 */
HX.DirectionalLight = function()
{
    HX.Light.call(this);

    this.depthBias = .0;
    this._numCascades = 1;
    this._shadowMapSize = 1024;
    this._shadowMapRenderer = null;
    this.direction = new HX.Float4(-1.0, -1.0, -1.0, 0.0);

    // TODO: Should shadowMapRenderer always exist?
    // if this castShadows = false, just destroy shadow texture
};

// set on init
HX.DirectionalLight.SHADOW_FILTER = null;

HX.DirectionalLight.prototype = Object.create(HX.Light.prototype,
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
                    this._shadowMapRenderer = new HX.CascadeShadowMapRenderer(this, this._numCascades, this._shadowMapSize);
                }
                else {
                    this._shadowMapRenderer.dispose();
                    this._shadowMapRenderer = null;
                }
            }
        },

        numCascades: {
            get: function()
            {
                return this._numCascades;
            },

            set: function(value)
            {
                if (value > 4) {
                    console.warn("set numCascades called with value greater than 4. Real value will be set to 4.");
                    value = 4;
                }

                this._numCascades = value;
                if (this._shadowMapRenderer) this._shadowMapRenderer.numCascades = value;
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
                var matrix = new HX.Matrix4x4();
                var position = this.worldMatrix.getColumn(3);
                var target = HX.Float4.add(value, position);
                matrix.lookAt(target, position, HX.Float4.Y_AXIS);
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
HX.DirectionalLight.prototype.setCascadeRatios = function(r1, r2, r3, r4)
{
    this._shadowMapRenderer.setSplitRatios(r1, r2, r3, r4);
};

HX.DirectionalLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
};