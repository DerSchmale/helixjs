/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("model", "hmesh/sphere.hmesh", HX.AssetLibrary.Type.ASSET, HX.HMESH);
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
    var mainLight = new HX.DirectionalLight();
    mainLight.intensity = 5.0;

    var ambientLight = new HX.AmbientLight();
    ambientLight.intensity = .02;

	var lightEntity = new HX.Entity();
	lightEntity.addComponents([mainLight, ambientLight]);
	lightEntity.lookAt(new HX.Float4(-1.0, 1.0, -1.0, 0.0));

	scene.attach(lightEntity);

    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("albedo");
    material.lightingModel = HX.LightingModel.GGX;

    var model = assetLibrary.get("model");
    var modelInstance = new HX.Entity(new HX.MeshInstance(model, material));
    scene.attach(modelInstance);
}