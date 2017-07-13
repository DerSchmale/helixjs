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
    collect: function(camera, scene) {},
    qualifies: function(object) {},
    visitLight: function(light) {},
    visitAmbientLight: function(light) {},
    visitModelInstance: function (modelInstance, worldMatrix) {},
    visitScene: function (scene) {},
    visitEffects: function(effects, ownerNode) {}
};

export { SceneVisitor };