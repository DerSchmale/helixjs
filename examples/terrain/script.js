var project = new DemoProject();
var terrainMaterial;
var time = 0;
var worldSize = 25000;

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
    options.hdr = true;
    options.directionalShadowFilter = new HX.VarianceDirectionalShadowFilter();
    options.directionalShadowFilter.blurRadius = 1;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.position.x = 316 / 2048 * worldSize;
    camera.position.y = 350;
    camera.position.z = 799 / 2048 * worldSize;

    camera.nearDistance = 0.1;
    camera.farDistance = 4000.0;

    var controller = new FloatController();
    controller.speed = 7.0;
    controller.shiftMultiplier = 50.0;
    controller.yaw = Math.PI;
    camera.addComponent(controller);

    camera.addComponent(new HX.Fog(0.0015, new HX.Color(0x4988ff), 0.005));

    var tonemap = new HX.FilmicToneMapEffect();
    //camera.addComponent(tonemap);
}

function initScene(scene)
{
    var sun = new HX.DirectionalLight();
    sun.direction = new HX.Float4(0.0, -.5, -1.0, 0.0);
    sun.intensity = 5;
    //sun.castShadows = true;
    //sun.numCascades = 4;
    //sun.setCascadeRatios(.01,.07,.15, .3);
    scene.attach(sun);

    // TODO: Add procedural skybox

    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("textures/skybox/skybox_irradiance.hcm");
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(skyboxIrradianceTexture, skyboxSpecularTexture);
    scene.attach(lightProbe);

    var heightMapLoader = new HX.AssetLoader(HX.JPG_HEIGHTMAP);
    var heightMap = heightMapLoader.load("textures/heightMap.png");

    var textureLoader = new HX.AssetLoader(HX.JPG);
    var terrainMap = textureLoader.load("textures/terrainMap.jpg");

    // in our material
    // red = beach
    // green = rock
    // blue = snow
    // otherwise, fall back to grass
    var materialLoader = new HX.AssetLoader(HX.HMT);
    terrainMaterial = materialLoader.load("material/terrainMaterial.hmt");
    //terrainMaterial.elementType = HX.ElementType.LINES;

    terrainMaterial.setTexture("heightMap", heightMap);
    terrainMaterial.setTexture("terrainMap", terrainMap);
    terrainMaterial.setUniform("heightMapSize", 2048);
    terrainMaterial.setUniform("worldSize", worldSize);

    terrainMaterial.lights = [ sun, lightProbe ];

    // 4km visibility in all sides
    var terrain = new HX.Terrain(8000, -1000, 2000, 4, terrainMaterial, 32);
    scene.attach(terrain);
}