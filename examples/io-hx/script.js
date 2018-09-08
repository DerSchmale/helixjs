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
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
	var options = new HX.InitOptions();
	options.defaultLightingModel = HX.LightingModel.GGX_FULL;
	options.hdr = true;
    project.init(document.getElementById('webglContainer'), options);
};

function initScene(scene, assetLibrary)
{
    var scenes = assetLibrary.get("scenes");
    project.scene = scenes.defaultScene;
    project.camera = scenes.defaultCamera;
    var controller = new FloatController();
	project.camera.addComponent(controller);
}