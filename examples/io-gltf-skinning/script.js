/**
 * Because of how glTF animations are built, the imported skinned animations work differently than the regular
 * clip-based animations using SkeletonAnimation. Take a look at the io-md5 demo to see how those should work.
 *
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.debug = true;
    project.init(document.getElementById('webglContainer'), options);
};

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("scene", "Monster/Monster.gltf", HX.AssetLibrary.Type.ASSET, HX_IO.GLTF);
	assetLibrary.queueAsset("irradiance", "skyboxes/river_rocks/river_rocks_sh.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
};

project.onInit = function()
{
    this.renderer.backgroundColor = 0x808080;
    this.gltf = this.assetLibrary.get("scene");
    this.scene = this.gltf.defaultScene;

	this.camera.farDistance = 10000;

    var orbitController = new OrbitController();
    orbitController.azimuth = Math.PI * .5;
    orbitController.radius = 3000.0;
    orbitController.maxRadius = 5000.0;
	orbitController.lookAtTarget.x = -1000.0;
    this.camera.addComponent(orbitController);
};