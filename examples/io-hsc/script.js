var project = new DemoProject();

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene);
};

window.onload = function ()
{
    var shadowFilter = new HX.PCFDirectionalShadowFilter();
    shadowFilter.softness = .02;
    shadowFilter.dither = true;
    shadowFilter.numShadowSamples = 8;

    var options = new HX.InitOptions();
    options.useHDR = true;
    options.directionalShadowFilter = shadowFilter;

    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.nearDistance = .3;
    camera.farDistance = 20.0;

    var orbitController = new OrbitController();
    orbitController.speed = 10.0;
    orbitController.radius = 2.0;
    orbitController.maxRadius = 100.0;
    camera.addComponent(orbitController);

    var tonemap = new HX.FilmicToneMapEffect();
    tonemap.exposure = 1.5;
    camera.addComponent(tonemap);
}

function initScene()
{
    var loader = new HX.AssetLoader(HX.HSC);
    loader.onComplete = function(asset) {
        project.scene = asset;
    };
    loader.load("scenes/scene.hsc");
}