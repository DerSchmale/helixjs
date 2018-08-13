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
    // the entry point depends on the concrete subclass (collect, etc)
    qualifies: function(object) {},
    visitLight: function(light) {},
    visitAmbientLight: function(light) {},
	visitMeshInstance: function (meshInstance) {},
    visitScene: function (scene) {},
    visitEffect: function(effect) {}
};

export { SceneVisitor };