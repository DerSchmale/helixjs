/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
import {Matrix4x4} from "../math/Matrix4x4";
import {ObjectPool} from "../core/ObjectPool";
import {BoundingAABB} from "./BoundingAABB";

var workBounds = new BoundingAABB();

function SceneVisitor()
{
    this._proxyMatrix = null;
    this._proxyBounds = null;
    this._proxy = null;
    this._proxyStack = []; // both a stack and a matrix pool
    this._matrixStack = []; // both a stack and a matrix pool
    this._stackIndex = -1;   // the current index into the stack/pool
    this._matrixPool = new ObjectPool(Matrix4x4);
    this._proxyBoundsInvalid = false;
}

SceneVisitor.prototype =
{
    reset: function()
    {
        this._matrixPool.reset();
    },

    // the entry point depends on the concrete subclass (collect, etc)
    qualifies: function(object) {},

    // worldMatrix and worldBounds need to be passed through getProxiedBounds and getProxiedMatrix here!
    visitLight: function(light) {},
    visitAmbientLight: function(light) {},
	visitMeshInstance: function (meshInstance) {},
    visitScene: function (scene) {},
    visitEffect: function(effect) {},

    // used for EntityProxy transforms
    pushProxy: function(proxy)
    {
        var matrix;

        if (this._proxyMatrix) {
            matrix = this._matrixPool.getItem();
            // the current (parent) matrix * the child matrix
            Matrix4x4.multiply(this._proxyMatrix, proxy.worldMatrix, matrix);
            this._proxyBounds = workBounds;
            this._proxyBoundsInvalid = true;
        }
        else {
            // won't be changed, can store as is
            matrix = proxy.worldMatrix;
            this._proxyBounds = proxy.worldBounds;
            this._proxyBoundsInvalid = false;
        }

        this._proxy = proxy;
        this._proxyMatrix = matrix;
        this._matrixStack.push(matrix);
        this._proxyStack.push(proxy);
    },

    // used for EntityProxy transforms
    popProxy: function()
    {
        this._matrixStack.pop();
        this._proxyStack.pop();

        var len = this._matrixStack.length;

        if (len === 0) {
            this._proxy = null;
            this._proxyMatrix = null;
            this._proxyBounds = null;
        }
        else {
            this._proxyMatrix = this._matrixStack[len - 1];
            this._proxy = this._proxyStack[len - 1];

            if (len === 1) {
                this._proxyBounds = this._proxy.worldBounds;
                this._proxyBoundsInvalid = false;
            }
            else if (len > 1) {
                this._proxyBounds = workBounds;
                this._proxyBoundsInvalid = true;
            }
        }
    },

    getProxiedBounds: function(node)
    {
        if (this._proxyMatrix) {
            if (this._proxyBoundsInvalid) {
                this._proxyBounds.transformFrom(this._proxy.bounds, this._proxyMatrix);
                this._proxyBoundsInvalid = false;
            }
            return this._proxyBounds;
        }
        else {
            return node.worldBounds;
        }
    },

    getProxiedMatrix: function(node)
    {
        if (this._proxyMatrix) {
            var matrix = this._matrixPool.getItem();
            return Matrix4x4.multiply(this._proxyMatrix, node.worldMatrix, matrix);
        }
        else
            return node.worldMatrix;
    }
};

export { SceneVisitor };