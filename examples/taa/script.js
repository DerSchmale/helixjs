/**
 * @author derschmale <http://www.derschmale.com>
 */
var project = new DemoProject();
var taa, fxaa;
var globalOptions = {
    mode: "taa"
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.hdr = false;
    options.renderMotionVectors = true;
    project.init(document.getElementById('webglContainer'), options);
};


project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("model", "fence/f5.obj", HX.AssetLibrary.Type.ASSET, HX_IO.OBJ);
    assetLibrary.queueAsset("skybox", "skyboxes/cape_hill_2k/cape_hill_2k.hdr", HX.AssetLibrary.Type.ASSET, HX.HDR, {equiToCube: true});
    assetLibrary.queueAsset("irradiance", "skyboxes/river_rocks/river_rocks_sh.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
};

project.onInit = function()
{
    this.renderer.shadowMapSize = 256;
    initCamera(this.camera);
    initScene(this.scene, this.camera, this.assetLibrary);
    initGui();
};

project.onUpdate = function()
{
    taa.enabled = false;
    fxaa.enabled = false;

    switch (globalOptions.mode) {
        case "taa":
            taa.enabled = true;
            break;
        case "fxaa":
            fxaa.enabled = true;
            break;
    }
};

function initCamera(camera)
{
    camera.nearDistance = .1;
    camera.farDistance = 2000.0;

    var controller = new OrbitController();
    controller.lookAtTarget.z = 3.0;
    controller.maxRadius = 100.0;
    controller.radius = 10.0;
    camera.addComponent(controller);

    taa = new HX.TAA();
    fxaa = new HX.FXAA();
    camera.addComponent(taa);
    camera.addComponent(fxaa);
}

function initScene(scene, camera, assetLibrary)
{
    var skyboxTexture = assetLibrary.get("skybox");
    var irradiance = assetLibrary.get("irradiance");
    var lightProbe = new HX.LightProbe(irradiance, skyboxTexture);
    lightProbe.intensity = 3.0;
    scene.attach(new HX.Entity(lightProbe));

    var skybox = new HX.Skybox(skyboxTexture);
    scene.skybox = skybox;


    var model = assetLibrary.get("model");
    model.scale.set(.1, .1, .1);
    scene.attach(model);

    var material = new HX.BasicMaterial();
    material.cullMode = HX.CullMode.NONE;
    material.metallicness = 1.0;
    material.roughness = .3;
    replaceMaterials(model, material);
	scene.startSystem(new HX.FixedLightsSystem());
}

function replaceMaterials(obj, material)
{
    var i;

    if (obj.components.meshInstance) {
        for (i = 0; i < obj.components.meshInstance.length; ++i)
            obj.components.meshInstance[i].material = material;
    }

    for (i = 0; i < obj.numChildren; ++i)
        replaceMaterials(obj.getChild(i), material);
}

function initGui()
{
    var gui = new dat.gui.GUI();
    gui.remember(taa);
    gui.remember(globalOptions);
    gui.add(globalOptions, "mode", ["none", "taa", "fxaa"]);

    var taaFolder = gui.addFolder("TAA");
    taaFolder.add(taa, "alpha").min(0).max(1).step(.001);
}