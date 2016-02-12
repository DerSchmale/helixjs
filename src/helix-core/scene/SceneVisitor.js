/**
 *
 * @constructor
 */
HX.RenderItem = function()
{
    this.worldMatrix = null;
    this.meshInstance = null;
    this.skeleton = null;
    this.skeletonMatrices = null;
    this.material = null;
    this.pass = null;
    this.camera = null;
    this.renderOrderHint = 0;

    // to store this in a linked list for pooling
    this.next = null;
};

HX.RenderItemPool = function()
{
    this._head = null;
    this._pool = null;
};

HX.RenderItemPool.prototype =
{
    getItem: function()
    {
        if (this._head) {
            var head = this._head;
            var item = head;
            this._head = head.next;
            return item;
        }
        else {
            var item = new HX.RenderItemPool();
            item.next = this._pool;
            this._pool = item;
            return item;
        }
    },

    reset: function()
    {
        this._head = this._pool;
    }
};

/**
 *
 * @constructor
 */
HX.SceneVisitor = function()
{

};

HX.SceneVisitor.prototype =
{
    collect: function(camera, scene) {},
    qualifies: function(object) {},
    visitLight: function(light) {},
    visitAmbientLight: function(light) {},
    visitModelInstance: function (modelInstance, worldMatrix) {},
    visitScene: function (scene) {},
    visitEffects: function(effects, ownerNode) {}
};