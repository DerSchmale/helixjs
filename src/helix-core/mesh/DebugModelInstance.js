import {ModelInstance} from "./ModelInstance";
import {BoundingVolume} from "../scene/BoundingVolume";

/**
 * @classdesc
 *
 * This is basically only used internally for bounding box stuff
 *
 * @ignore
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DebugModelInstance(model, materials)
{
    ModelInstance.call(this, model, materials);
}

DebugModelInstance.prototype = Object.create(ModelInstance.prototype);

DebugModelInstance.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INHERIT);
};

export { DebugModelInstance };