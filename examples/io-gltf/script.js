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
    assetLibrary.queueAsset("scene", "boombox/BoomBox.gltf", HX.AssetLibrary.Type.ASSET, HX.GLTF);
    assetLibrary.queueAsset("skybox", "textures/river_rocks_1k.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG_EQUIRECTANGULAR);
    assetLibrary.queueAsset("irradiance", "textures/river_rocks_irradiance.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG_EQUIRECTANGULAR);
};

project.onInit = function()
{
    this.gltf = this.assetLibrary.get("scene");
    this.scene = this.gltf.defaultScene;

    this.camera.nearDistance = .001;
    this.camera.farDistance = 30.0;

    var orbitController = new HX.OrbitController();
    orbitController.azimuth = 1.3;
    orbitController.minRadius = .02;
    orbitController.zoomSpeed = .1;
    orbitController.touchZoomSpeed = .01;
    orbitController.radius = .03;
    this.camera.addComponent(orbitController);

    var dirLight = new HX.DirectionalLight();
    this.scene.attach(dirLight);

    var skyboxTexture = this.assetLibrary.get("skybox");
    var irradianceTexture = this.assetLibrary.get("irradiance");

    // use it as skybox
    var skybox = new HX.Skybox(skyboxTexture);
    this.scene.skybox = skybox;

    this.gltf.materials["BoomBox_Mat"].emissiveColor = new HX.Color(2.0, 2.0, 2.0);


    var bloom = new HX.Bloom(100);
    bloom.thresholdLuminance = 1.0;
    this.camera.addComponent(bloom);

    // use the same texture as environment map
    var lightProbe = new HX.LightProbe(irradianceTexture, skyboxTexture);
    this.scene.attach(lightProbe);
};