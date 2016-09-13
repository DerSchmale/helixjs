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
    this.camera = null;
    this.renderOrderHint = 0;

    // to store this in a linked list for pooling
    this.next = null;
};

HX.RenderItemPool = function()
{
    var head = null;
    var pool = null;

    this.getItem = function()
    {
        if (head) {
            var item = head;
            head = head.next;
            return item;
        }
        else {
            var item = new HX.RenderItemPool();
            item.next = pool;
            pool = item;
            return item;
        }
    };

    this.reset = function()
    {
        head = pool;
    };
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