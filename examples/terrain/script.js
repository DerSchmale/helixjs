var project = new DemoProject();
var terrainMaterial;
var time = 0;
var worldSize = 10000;

// units are million km

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene);

    time = 0;
};

project.onUpdate = function(dt)
{
    time += dt;
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    //options.debug = true;
    options.hdr = true;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.position.x = 316 / 2048 * worldSize;
    camera.position.y = 0;
    camera.position.z = 799 / 2048 * worldSize;

    camera.nearDistance = 0.1;
    camera.farDistance = 2000.0;

    var controller = new FloatController();
    controller.speed = 7.0;
    controller.shiftMultiplier = 50.0;
    controller.yaw = Math.PI;
    camera.addComponent(controller);

    camera.addComponent(new HX.Fog(0.001, new HX.Color(0x4988ff)));
}

function initScene(scene)
{
    var sun = new HX.DirectionalLight();
    scene.attach(sun);

    // TODO: Add procedural skybox

    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("textures/skybox/skybox_irradiance.hcm");
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(skyboxIrradianceTexture, skyboxSpecularTexture);
    scene.attach(lightProbe);

    var textureLoader = new HX.AssetLoader(HX.JPG);
    var heightMap = textureLoader.load("textures/heightMap.png");
    var terrainMap = textureLoader.load("textures/terrainMap.jpg");

    heightMap.wrapMode = HX.TextureWrapMode.CLAMP;

    // in our material
    // red = beach
    // green = rock
    // blue = snow
    // otherwise, fall back to grass
    var materialLoader = new HX.AssetLoader(HX.HMT);
    terrainMaterial = materialLoader.load("material/terrainMaterial.hmt");

    terrainMaterial.setTexture("heightMap", heightMap);
    terrainMaterial.setTexture("terrainMap", terrainMap);
    terrainMaterial.setUniform("heightMapSize", 2048);
    terrainMaterial.setUniform("worldSize", worldSize);

    terrainMaterial.lights = [ sun, lightProbe ];

    // 1km visible in all sides
    var terrain = new HX.Terrain(4096, -500, 500, 4, terrainMaterial, 32);
    scene.attach(terrain);
}