/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.debug = true;
    options.defaultLightingModel = HX.LightingModel.GGX_FULL;
    project.init(document.getElementById('webglContainer'), options);
};

project.queueAssets = function(assetLibrary)
{
	assetLibrary.queueAsset("skybox", "skyboxes/cape_hill_2k/cape_hill_2k.hdr", HX.AssetLibrary.Type.ASSET, HX.HDR, {equiToCube: true});
	assetLibrary.queueAsset("irradiance", "skyboxes/cape_hill_2k/cape_hill_2k_sh_irrad.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
	// assetLibrary.queueAsset("skybox", "skyboxes/studio-small/specular.dds", HX.AssetLibrary.Type.ASSET, HX.DDS);
	// assetLibrary.queueAsset("irradiance", "skyboxes/studio-small/irradiance_sh.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
};

project.onInit = function()
{
    var orbitController = new OrbitController();
    orbitController.minRadius = .02;
    orbitController.radius = 3.0;
    this.camera.addComponent(orbitController);

    var skyboxTexture = this.assetLibrary.get("skybox");
    var irradianceSH = this.assetLibrary.get("irradiance");

    // use it as skybox
    var skybox = new HX.Skybox(skyboxTexture);
    this.scene.skybox = skybox;

    var material = new HX.BasicMaterial();
    // material.color = 0x808080;
    material.roughness = .01;
    var primitive = new HX.SpherePrimitive({
		numSegmentsW: 32,
		numSegmentsH: 20
    });
    var meshInstance = new HX.MeshInstance(primitive, material);
    this.scene.attach(new HX.Entity(meshInstance));

    // use the same texture as environment map
    var lightProbe = new HX.LightProbe(irradianceSH, skyboxTexture);
	lightProbe.intensity = .3;
    this.scene.attach(new HX.Entity(lightProbe));

    // var toneMap = new HX.ReinhardToneMapping();
    // this.camera.addComponent(toneMap);
};