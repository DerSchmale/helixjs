/**
 *
 * @constructor
 */
HX.RenderItem = function()
{
    this.worldMatrix = null;
    this.meshInstance = null;
    this.material = null;
    this.pass = null;
    this.camera = null;
    this.uniformSetters = null;
    this.renderOrderHint = 0;
};

HX.RenderItem.prototype = {
    // set state per instance
    draw: function()
    {
        if (this.uniformSetters) {
            var len = this.uniformSetters.length;
            for (var i = 0; i < len; ++i) {
                this.uniformSetters[i].execute(this.worldMatrix, this.camera);
            }
        }

        // TODO: Provide different render modes?
        HX.GL.drawElements(this.pass._elementType, this.meshInstance._mesh.numIndices(), HX.GL.UNSIGNED_SHORT, 0);
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
    visitModelInstance: function (modelInstance, worldMatrix) {},
    visitScene: function (scene) {},
    visitEffects: function(effects, ownerNode) {}
};