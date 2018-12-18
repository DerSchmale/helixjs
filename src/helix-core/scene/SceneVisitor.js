import {Matrix4x4} from "../math/Matrix4x4";
import {ObjectPool} from "../core/ObjectPool";
import {BoundingAABB} from "./BoundingAABB";

var workBounds = new BoundingAABB();

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SceneVisitor()
{
}

SceneVisitor.prototype =
{
    reset: function() {},

    // the entry point method depends on the concrete subclass (collect, cast, etc)

    qualifiesBounds: function(bounds) {},
    qualifies: function(object) {},
    visitEntity: function (entity) {},
    visitScene: function (scene) {}
};

export { SceneVisitor };