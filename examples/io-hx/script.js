/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("scenes", "hx/untitled.hx", HX.AssetLibrary.Type.ASSET, HX.HX);
};

project.onInit = function()
{
    var controller = new OrbitController();
    controller.radius = 10;
    controller.maxRadius = 40;
    this.camera.addComponent(controller);
    this.camera.nearDistance = .01;
    this.camera.farDistance = 100.0;
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
	var options = new HX.InitOptions();
	options.hdr = true;
    project.init(document.getElementById('webglContainer'), options);
};

function initScene(scene, assetLibrary)
{
    var scene = assetLibrary.get("scenes").defaultScene;
    project.scene = scene;
}