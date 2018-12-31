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
    options.hdr = true;
    // optionally enable this if objects in the scene move
    // options.renderMotionVectors = true;
    options.debug = true;
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

    if (this.camera.position.z < 0.2)
        this.camera.position.z = 0.2;
};

function initCamera(camera)
{
    camera.nearDistance = .1;
    camera.farDistance = 2000.0;

    var controller = new OrbitController();
    controller.lookAtTarget.z = 3.0;
    controller.maxRadius = 100.0;
    controller.radius = 10.0;
    controller.zoomSpeed = 10.0;
    camera.addComponent(controller);

    taa = new HX.TAA();
    taa.alpha = 0.01;
    fxaa = new HX.FXAA();
    camera.addComponent(taa);
    camera.addComponent(fxaa);
}

function initScene(scene, camera, assetLibrary)
{
    var skyboxTexture = assetLibrary.get("skybox");
    var irradiance = assetLibrary.get("irradiance");
    var lightProbe = new HX.LightProbe(irradiance, skyboxTexture);
    lightProbe.intensity = 5.0;
    scene.attach(new HX.Entity(lightProbe));

    var skybox = new HX.Skybox(skyboxTexture);
    scene.skybox = skybox;

    var model = assetLibrary.get("model");
    model.scale.set(.1, .1, .1);
    scene.attach(model);

    var floorMaterial = new HX.BasicMaterial();
    floorMaterial.cullMode = HX.CullMode.NONE;
    var material = new HX.BasicMaterial();
    material.cullMode = HX.CullMode.NONE;
    material.metallicness = 1.0;
    material.roughness = .1;
    replaceMaterials(model, material, floorMaterial);

    scene.startSystem(new HX.FixedLightsSystem());
}

function replaceMaterials(obj, material, floorMaterial)
{
    var i;

    if (obj.components.meshInstance) {
        for (i = 0; i < obj.components.meshInstance.length; ++i) {
            var meshInstance = obj.components.meshInstance[i];
            if (meshInstance.material.name === "wire_087225198")
                meshInstance.material = floorMaterial;
            else
                meshInstance.material = material;
        }
    }

    for (i = 0; i < obj.numChildren; ++i)
        replaceMaterials(obj.getChild(i), material, floorMaterial);
}

function initGui()
{
    var gui = new dat.gui.GUI();
    gui.remember(taa);
    gui.remember(globalOptions);
    gui.add(globalOptions, "mode", ["none", "taa", "fxaa"]);

    var taaFolder = gui.addFolder("TAA");
    taaFolder.add(taa, "alpha").min(0).max(1).step(.001);
    taaFolder.add(taa, "gamma").min(0).max(2).step(.001);
}