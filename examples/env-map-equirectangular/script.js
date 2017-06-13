var project = new DemoProject();

project.onInit = function()
{
    var controller = new HX.OrbitController();
    controller.radius = 1.5;
    this.camera.addComponent(controller);

    initScene(this.scene);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    project.init(document.getElementById('webglContainer'), options);
};

function initScene(scene)
{
    var envMapLoader = new HX.AssetLoader(HX.JPG_EQUIRECTANGULAR);
    var skyboxTexture = envMapLoader.load("textures/river_rocks_1k.jpg");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxTexture);
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(null, skyboxTexture);
    scene.attach(lightProbe);

    var textureLoader = new HX.AssetLoader(HX.JPG);
    var normalMap = textureLoader.load("textures/Tarnished_Metal_01_normal.png");
    var specularMap = textureLoader.load("textures/Tarnished_Metal_01_specular.jpg");
    var material = new HX.BasicMaterial();
    material.normalMap = normalMap;
    material.specularMap = specularMap;
    material.roughness = .25;
    material.roughnessRange = -.1;  // invert roughness by making range negative
    material.metallicness = 1.0;
    material.lights = [ lightProbe ];

    var primitive = new HX.TorusPrimitive(
        {
            numSegmentsH: 30,
            numSegmentsW: 40,
            tubeRadius:.2,
            scaleU: 5,
            scaleV: 2,
        });

    var modelInstance = new HX.ModelInstance(primitive, material);
    scene.attach(modelInstance);
}