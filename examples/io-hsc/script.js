var project = new DemoProject();

project.onInit = function()
{
    initScene(this.scene);
    initCamera(this.camera);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    var orbitController = new OrbitController();
    orbitController.speed = 10.0;
    orbitController.radius = 2.0;
    orbitController.maxRadius = 100.0;
    camera.addComponent(orbitController);
}

function initScene(scene)
{
    var loader = new HX.AssetLoader(HX.HSC);
    loader.onComplete = function(asset) {
        project.scene = asset;
    };
    loader.load("scenes/scene.hsc", scene);
}