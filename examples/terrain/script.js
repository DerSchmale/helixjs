var project = new DemoProject();
var terrainMaterial;
var waterMaterial;
var time = 0;

// 1 = 10m
var worldSize = 2500;
var waterLevel = -5;
var fog;

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene);

    /*var ssao = new HX.HBAO();
    ssao.radius = 100.0;
    ssao.strength = 3.14;
    ssao.fallOffDistance = 500.0;
    ssao.bias = 0.1;
    this.renderer.ambientOcclusion = ssao;*/

    time = 0;
};

project.onUpdate = function(dt)
{
    time += dt;
    waterMaterial.setUniform("normalOffset1", [ -time * 0.0004, -time * 0.0005 ]);
    waterMaterial.setUniform("normalOffset2", [ time * 0.0001, time * 0.0002 ]);
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
    camera.position.x = (1680 / 2048 - .5) * worldSize;
    camera.position.y = waterLevel + .18;
    camera.position.z = -(1814 / 2048 - .5) * worldSize;

    camera.nearDistance = 0.1;
    camera.farDistance = 2000.0;

    var controller = new FloatController();
    controller.speed = 1.7;
    controller.shiftMultiplier = 70.0;
    controller.yaw = Math.PI;
    camera.addComponent(controller);

    fog = new HX.Fog(0.0015, new HX.Color(0x4988ff), 0.005);
    camera.addComponent(fog);

    var tonemap = new HX.FilmicToneMapEffect();
    tonemap.exposure = 0.0;
    camera.addComponent(tonemap);
}

function initScene(scene)
{
    var sun = new HX.DirectionalLight();
    sun.direction = new HX.Float4(-0.3, -.3, 1.0, 0.0);
    // sun.depthBias = 10.0;
    sun.intensity = 5;
    sun.castShadows = true;
    sun.numCascades = 4;
    // sun.setCascadeRatios(.01,.07,.15, .3);
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
    terrainMaterial.setTexture("heightMap", heightMap);
    terrainMaterial.setTexture("terrainMap", terrainMap);
    terrainMaterial.setUniform("heightMapSize", 2048);
    terrainMaterial.setUniform("worldSize", worldSize);
    // terrainMaterial.ssao = true;

    terrainMaterial.lights = [ sun, lightProbe ];

    waterMaterial = materialLoader.load("material/waterMaterial.hmt");
    waterMaterial.lights = [ sun, lightProbe ];

    var terrain = new HX.Terrain(4000, -100, 200, 4, terrainMaterial, 32);

    var water = new HX.Terrain(4000, 0, 1, 3, waterMaterial, 16);
    water.position.y = waterLevel;

    scene.attach(terrain);
    scene.attach(water);
}