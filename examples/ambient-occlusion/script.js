/**
 * @author derschmale <http://www.derschmale.com>
 */
var project = new DemoProject();
var ssao, hbao;
var globalOptions = {
    mode: "hbao",
    "AO only": false
};

window.onload = function ()
{
    var options = new HX.InitOptions();

    ssao = new HX.SSAO(24);
    hbao = new HX.HBAO(5, 5);
    ssao.strength = hbao.strength = 2.0;
    hbao.sampleRadius = 2.0;
    hbao.fallOffDistance = 3.0;
    ssao.sampleRadius = 2.0;
    ssao.fallOffDistance = 3.0;
    options.ambientOcclusion = hbao;
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.debug = true;
    project.init(document.getElementById('webglContainer'), options);
};


project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("model", "sibenik/sibenik.obj", HX.AssetLibrary.Type.ASSET, HX_IO.OBJ);
    assetLibrary.queueAsset("irradiance", "skyboxes/river_rocks/river_rocks_sh.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
};

project.onInit = function()
{
    this.renderer.shadowMapSize = 256;
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
    initGui();
};

project.onUpdate = function()
{
    switch (globalOptions.mode) {
        case "hbao":
            HX.META.OPTIONS.ambientOcclusion = hbao;
            break;
        case "ssao":
            HX.META.OPTIONS.ambientOcclusion = ssao;
            break;
    }

    this.renderer.debugMode = globalOptions["AO only"]? HX.Renderer.DebugMode.AMBIENT_OCCLUSION : HX.Renderer.DebugMode.NONE;
};

function initCamera(camera)
{
    camera.position.set(-10.0, 0.0, -10.0);
    camera.nearDistance = .1;
    camera.farDistance = 200.0;

    var floatController = new FloatController();
	camera.euler.z = -Math.PI * .5;
    camera.addComponent(floatController);
}

function initScene(scene, assetLibrary)
{
    var irradiance = assetLibrary.get("irradiance");
    var lightProbe = new HX.LightProbe(irradiance);
    lightProbe.intensity = 10.0;
    scene.attach(new HX.Entity(lightProbe));

    scene.attach(assetLibrary.get("model"));

	scene.startSystem(new HX.FixedLightsSystem());
}

function initGui()
{
    var gui = new dat.gui.GUI();
    gui.remember(globalOptions);
    gui.remember(project.renderer);
    gui.remember(ssao);
    gui.remember(hbao);
    var mode = gui.add(globalOptions, "mode", [ "ssao", "hbao" ]);
    gui.add(globalOptions, "AO only");

    var detailFolder;

    function showHBAO()
    {
        detailFolder = gui.addFolder("HBAO");
        detailFolder.add(hbao, "numRays").min(2).max(6);
        detailFolder.add(hbao, "numSamplesPerRay").min(2).max(10);
        detailFolder.add(hbao, "sampleRadius").min(0).max(3);
        detailFolder.add(hbao, "fallOffDistance").min(0).max(10);
        detailFolder.add(hbao, "strength").min(0).max(10);
        detailFolder.add(hbao, "bias").min(.0).max(1);
        detailFolder.add(hbao, "scale").min(.25).max(1);
    }

    function showSSAO()
    {
        detailFolder = gui.addFolder("SSAO");
        detailFolder.add(ssao, "numSamples").min(4).max(64);
        detailFolder.add(ssao, "sampleRadius").min(0).max(3);
        detailFolder.add(ssao, "fallOffDistance").min(0).max(10);
        detailFolder.add(ssao, "strength").min(0).max(10);
        detailFolder.add(ssao, "scale").min(.25).max(1);
    }

    showHBAO();

    mode.onChange(function(v) {
        if (v === "ssao") {
            gui.removeFolder(detailFolder);
            showSSAO();
        }
        else {
            gui.removeFolder(detailFolder);
            showHBAO();
        }
    });
}