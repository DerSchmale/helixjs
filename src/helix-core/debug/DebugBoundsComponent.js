import {Component} from "../entity/Component";
import {BasicMaterial} from "../material/BasicMaterial";
import {ElementType} from "../Helix";
import {WireBoxPrimitive} from "../mesh/primitives/WireBoxPrimitive";
import {Matrix4x4} from "../math/Matrix4x4";
import {LightingModel} from "../render/LightingModel";
import {DebugModelInstance} from "../mesh/DebugModelInstance";

/**
 * @classdesc
 *
 * DebugBoundsComponent is a component that allows rendering the world-space bounds of scene objects.
 *
 * @property {Color} color The color used to render the debug bounds.
 *
 * @constructor
 *
 * @param {Color} color The color used to render the debug bounds.
 */
function DebugBoundsComponent(color)
{
    Component.call(this);
    this._initModelInstance();
    if (color)
        this._material.color = color;
}

Component.create(DebugBoundsComponent, {
    color: {
        get: function ()
        {
            return this._material.color;
        },
        set: function (value)
        {
            this._material.color = value;
        }
    }
});

/**
 * @ignore
 */
DebugBoundsComponent.prototype.onAdded = function()
{
    this.entity.attach(this._modelInstance);
};

/**
 * @ignore
 */
DebugBoundsComponent.prototype.onRemoved = function()
{
    this.entity.detach(this._modelInstance);
    this._modelInstance = null;
};

/**
 * @ignore
 */
DebugBoundsComponent.prototype.onUpdate = function(dt)
{
    var inverse = new Matrix4x4();
    return function(dt) {
        var worldBounds = this.entity.worldBounds;
        var matrix = this._modelInstance.matrix;

        inverse.inverseAffineOf(this.entity.worldMatrix);
        matrix.fromScale(worldBounds._halfExtentX, worldBounds._halfExtentY, worldBounds._halfExtentZ);
        matrix.setColumn(3, worldBounds.center);
        matrix.append(inverse);

        this._modelInstance.matrix = matrix;
    }
}();

/**
 * @ignore
 * @private
 */
DebugBoundsComponent.prototype._initModelInstance = function()
{
    // TODO: Allow rendering spherical bounds
    var box = new WireBoxPrimitive({
        width: 2
    });

    this._material = new BasicMaterial();
    this._material.elementType = ElementType.LINES;
    this._material.doubleSided = true;
    this._material.lightingModel = LightingModel.Unlit;
    this._modelInstance = new DebugModelInstance(box, this._material);
};

export {DebugBoundsComponent};