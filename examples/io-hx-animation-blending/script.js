/**
 * @author derschmale <http://www.derschmale.com>
 */
var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("scenes", "hx/chicken.hx", HX.AssetLibrary.Type.ASSET, HX.HX);
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
    var hx = assetLibrary.get("scenes");
    project.scene = hx.defaultScene;
    project.camera = hx.defaultCamera;

	var armature = project.scene.findNodeByName("Armature");
	armature.addComponent(new ChickenController());
}