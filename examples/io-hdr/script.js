/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.defaultLightingModel = HX.LightingModel.GGX_FULL;
    project.init(document.getElementById('webglContainer'), options);
};

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox", "skyboxes/cape_hill_2k/cape_hill_2k.hdr", HX.AssetLibrary.Type.ASSET, HX.HDR, {equiToCube: true});
    assetLibrary.queueAsset("irradiance", "skyboxes/cape_hill_2k/cape_hill_2k_sh_irrad.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
};

project.onInit = function()
{
    var orbitController = new OrbitController();
    orbitController.minRadius = .02;
    orbitController.zoomSpeed = .1;
    orbitController.touchZoomSpeed = .01;
    orbitController.radius = .03;
    this.camera.addComponent(orbitController);

    var skyboxTexture = this.assetLibrary.get("skybox");
    var irradianceMap = this.assetLibrary.get("irradiance");

    // use it as skybox
    var skybox = new HX.Skybox(skyboxTexture);
    this.scene.skybox = skybox;

    // use the same texture as environment map
    var lightProbe = new HX.LightProbe(irradianceMap, skyboxTexture);
    this.scene.attach(new HX.Entity(lightProbe));
};