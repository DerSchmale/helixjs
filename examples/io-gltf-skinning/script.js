/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    project.init(document.getElementById('webglContainer'), options);
};

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("scene", "Monster/Monster.gltf", HX.AssetLibrary.Type.ASSET, HX.GLTF);
    assetLibrary.queueAsset("irradiance", "textures/river_rocks_irradiance.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG_EQUIRECTANGULAR);
};

project.onInit = function()
{
    this.renderer.backgroundColor = 0x808080;
    this.gltf = this.assetLibrary.get("scene");
    this.scene = this.gltf.defaultScene;

    this.camera.farDistance = 10000;

    var orbitController = new HX.OrbitController();
    orbitController.azimuth = Math.PI * .5;
    orbitController.radius = 700.0;
    orbitController.maxRadius = 5000.0;
    this.camera.addComponent(orbitController);
};