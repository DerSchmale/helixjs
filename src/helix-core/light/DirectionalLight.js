import {DirectLight} from "../light/DirectLight";
import {Float4} from "../math/Float4";
import {Matrix4x4} from "../math/Matrix4x4";
import {BoundingVolume} from "../scene/BoundingVolume";
import {META} from "../Helix";

/**
 * @classdesc
 * DirectionalLight represents a light source that is "infinitely far away", used as an approximation for sun light where
 * locally all sun rays appear to be parallel.
 *
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
	DirectLight.call(this);

    this.depthBias = .0;
    this.direction = new Float4(-1.0, -1.0, -1.0, 0.0);
    // this is just a storage vector
    this._direction = new Float4();
    this._cascadeSplitRatios = [];
    this._cascadeSplitDistances = [];
    this._initCascadeSplitProperties();
}

DirectionalLight.prototype = Object.create(DirectLight.prototype,
    {
        numAtlasPlanes: {
            get: function() { return META.OPTIONS.numShadowCascades; }
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
                    this._shadowMatrices = value? [ new Matrix4x4(), new Matrix4x4(), new Matrix4x4(), new Matrix4x4() ] : null;
                }
                else {
                    this._shadowMatrices = null;
                }
            }
        },

        direction: {
            get: function()
            {
                var dir = this._direction;
                this.worldMatrix.getColumn(1, dir);
                return dir;
            },

            set: function(value)
            {
                var matrix = new Matrix4x4();
                var position = this.worldMatrix.getColumn(3);
                var target = Float4.add(value, position);
                matrix.lookAt(target, position);
                this.matrix = matrix;
            }
        },

        cascadeSplitDistances: {
            get: function ()
            {
                return this._cascadeSplitDistances;
            }
        }
    });

/**
 * The ratios that define every cascade's split distance. 1 is at the far plane, 0 is at the near plane.
 * @param r1
 * @param r2
 * @param r3
 * @param r4
 */
DirectionalLight.prototype.setCascadeRatios = function(r1, r2, r3, r4)
{
    this._cascadeSplitRatios[0] = r1;
    this._cascadeSplitRatios[1] = r2;
    this._cascadeSplitRatios[2] = r3;
    this._cascadeSplitRatios[3] = r4;
};

/**
 * @private
 * @ignore
 */
DirectionalLight.prototype._updateBounds = function()
{
    this._bounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @private
 * @ignore
 */
DirectionalLight.prototype._initCascadeSplitProperties = function()
{
    var ratio = 1.0;

    for (var i = META.OPTIONS.numShadowCascades - 1; i >= 0; --i)
    {
        this._cascadeSplitRatios[i] = ratio;
        this._cascadeSplitDistances[i] = 0;
        ratio *= .5;
    }
};

/**
 * @private
 * @ignore
 */
DirectionalLight.prototype.getShadowMatrix = function(cascade)
{
    return this._shadowMatrices[cascade];
};

/**
 * @ignore
 */
DirectionalLight.prototype.toString = function()
{
	return "[DirectionalLight(name=" + this._name + ")]";
};


export { DirectionalLight };