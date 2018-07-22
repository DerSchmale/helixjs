/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("model", "hmodel/sphere.hmodel", HX.AssetLibrary.Type.ASSET, HX.HMODEL);
    assetLibrary.queueAsset("albedo", "textures/marble_tiles/marbletiles_diffuse_white.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    this.camera.addComponent(new HX.OrbitController());
    this.camera.nearDistance = .01;
    this.camera.farDistance = 10.0;
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

function initScene(scene, assetLibrary)
{
    var light = new HX.DirectionalLight();
    light.direction = new HX.Float4(-1.0, -1.0, -1.0, 0.0);
    light.intensity = 5.0;
    scene.attach(light);

    var ambientLight = new HX.AmbientLight();
    ambientLight.intensity = .02;
    scene.attach(ambientLight);

    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("albedo");
    material.lightingModel = HX.LightingModel.GGX;

    var model = assetLibrary.get("model");
    var modelInstance = new HX.ModelInstance(model, material);
    scene.attach(modelInstance);
}