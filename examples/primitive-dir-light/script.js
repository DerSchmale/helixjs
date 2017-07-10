var project = new DemoProject();

project.onInit = function()
{
    this.camera.addComponent(new HX.OrbitController());
    this.camera.nearDistance = .1;
    this.camera.farDistance = 1.0;

    initScene(this.scene);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    //options.ignoreAllExtensions = true;
    //options.debug = true;
    options.defaultLightingModel = HX.LightingModel.GGX;
    project.init(document.getElementById('webglContainer'), options);
};

function initScene(scene)
{
    var light = new HX.DirectionalLight();
    light.direction = new HX.Float4(-1.0, -1.0, -1.0, 0.0);
    light.intensity = 5.0;
    scene.attach(light);

    var ambientLight = new HX.AmbientLight();
    ambientLight.intensity = .02;
    scene.attach(ambientLight);

    var textureLoader = new HX.AssetLoader(HX.JPG);
    var texture = textureLoader.load("textures/marbletiles_diffuse_white.jpg");
    var material = new HX.BasicMaterial();
    material.colorMap = texture;

    var primitive = new HX.SpherePrimitive(
        {
            radius:.25,
            numSegmentsH: 20,
            numSegmentsW: 30
        });

    scene.attach(new HX.ModelInstance(primitive, material));
}