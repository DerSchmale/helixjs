/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/marble_tiles/marbletiles_diffuse_white.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    this.camera.addComponent(new OrbitController());
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

function initScene(scene, assetLibrary)
{
    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("albedo");

    var primitive = new HX.SpherePrimitive(
        {
            radius:.25
        });

    var entity = new HX.Entity();
    entity.addComponent(new HX.MeshInstance(primitive, material));
    scene.attach(entity);
}