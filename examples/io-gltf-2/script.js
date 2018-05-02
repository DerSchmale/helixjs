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
    assetLibrary.queueAsset("scene", "SciFiHelmet/SciFiHelmet.gltf", HX.AssetLibrary.Type.ASSET, HX.GLTF);
    assetLibrary.queueAsset("skybox", "skyboxes/river_rocks/river_rocks_1k.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG_EQUIRECTANGULAR);
    assetLibrary.queueAsset("irradiance", "skyboxes/river_rocks/river_rocks_irradiance.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG_EQUIRECTANGULAR);
};

project.onInit = function()
{
    this.gltf = this.assetLibrary.get("scene");
    this.scene = this.gltf.defaultScene;

    this.camera.nearDistance = .01;
    this.camera.farDistance = 300.0;

    var orbitController = new HX.OrbitController();
    orbitController.azimuth = -2.0;
    orbitController.radius = 5.0;
    orbitController.minRadius = 1.5;

    this.camera.addComponent(orbitController);

    var dirLight = new HX.DirectionalLight();
    dirLight.direction = new HX.Float4(-1.0, -1.0, 1.0);
    this.scene.attach(dirLight);

    var skyboxTexture = this.assetLibrary.get("skybox");
    var irradianceTexture = this.assetLibrary.get("irradiance");

    // use it as skybox
    var skybox = new HX.Skybox(skyboxTexture);
    this.scene.skybox = skybox;

    // use the same texture as environment map
    var lightProbe = new HX.LightProbe(irradianceTexture, skyboxTexture);
    this.scene.attach(lightProbe);
};