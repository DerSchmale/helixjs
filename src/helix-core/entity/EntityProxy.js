import {Entity} from "./Entity";
import {BoundingAABB} from "../scene/BoundingAABB";

/**
 * @classdesc
 *
 * EntityProxy allows wrapping a SceneNode object and instance it in different positions. A difference with being a
 * regular child in is that the same scene node can be shared across entity proxies and their state is always identical,
 * with the exception of their final transforms.
 *
 * @constructor
 *
 * @property node The SceneNode or Entity to be wrapped by the proxy.
 */
function EntityProxy()
{
    Entity.call(this);
    this._node = null;
    this._Entity_acceptVisitor = Entity.prototype.acceptVisitor;
    this._Entity_updateBounds = Entity.prototype._updateBounds;
    this._growBounds = this._growBounds.bind(this);
}

EntityProxy.prototype = Object.create(Entity.prototype, {
    node: {
        get: function() {
            return this._node;
        },
        set: function(value) {
            this._node = value;
            this.invalidateBounds();
        }
    }
});

/**
 * @ignore
 */
EntityProxy.prototype.acceptVisitor = function(visitor)
{
    this._Entity_acceptVisitor(visitor);

    visitor.pushProxy(this);
    this._traverse(this._node, visitor);
    visitor.popProxy();
};

/**
 * @ignore
 * Traverse the wrapped children's hierarchy and "acceptVisitor" for all of the entities.
 */
EntityProxy.prototype._traverse = function(node, visitor)
{
    // the only validity testing is done on this Entity, the rest is force-accepted.
    if (node.acceptVisitor) {
        if (!visitor.qualifies(node, true)) {
            return;
        }

        node.acceptVisitor(visitor, this.worldMatrix);
    }

    for (var i = 0, len = node._children.length; i < len; ++i) {
        var child = node._children[i];
        this._traverse(child, visitor);
    }
};

/**
 * @inheritDoc
 */
EntityProxy.prototype._updateBounds = function()
{
    this._Entity_updateBounds();
    this._node.applyFunction(this._growBounds);
};

EntityProxy.prototype._growBounds = function(obj)
{
    var bound = new BoundingAABB();
    return function (obj) {
        if (obj.bounds) {
            bound.transformFrom(obj.bounds, obj.worldMatrix);
            this._bounds.growToIncludeBound(bound);
        }
    }
}();

export { EntityProxy };