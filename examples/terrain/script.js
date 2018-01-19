/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var terrainMaterial;
var waterMaterial;
var time = 0;

// 1 = 10m
var worldSize = 5000;
var waterLevel = -15;
var fog;

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-specular", "skyboxes/daylight-mips/skybox_specular.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("skybox-irradiance", "skyboxes/daylight-mips/skybox_irradiance.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("heightMap", "terrain/textures/heightMap.png", HX.AssetLibrary.Type.ASSET, HX.JPG_HEIGHTMAP);
    assetLibrary.queueAsset("terrainMap", "terrain/textures/terrainMap.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("terrain-material", "terrain/material/terrainMaterial.hmat", HX.AssetLibrary.Type.ASSET, HX.HMAT);
    assetLibrary.queueAsset("water-material", "terrain/material/waterMaterial.hmat", HX.AssetLibrary.Type.ASSET, HX.HMAT);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);

    /*var ssao = new HX.HBAO();
    ssao.radius = 50.0;
    ssao.strength = 3.14;
    ssao.fallOffDistance = 100.0;
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
    options.numShadowCascades = 3;
    options.hdr = true;
    options.defaultLightingModel = HX.LightingModel.GGX;
    // options.deferredLightingModel = HX.LightingModel.GGX;
    options.directionalShadowFilter = new HX.VarianceDirectionalShadowFilter();
    options.directionalShadowFilter.softness = .002;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.position.x = (1680 / 2048 - .5) * worldSize;
    camera.position.y = -(1814 / 2048 - .5) * worldSize;
    camera.position.z = waterLevel + .18;

    camera.nearDistance = 0.1;
    camera.farDistance = 2000.0;

    var controller = new HX.FloatController();
    controller.speed = 1.7;
    controller.shiftMultiplier = 100.0;
    controller.yaw = Math.PI;
    camera.addComponent(controller);

    fog = new HX.Fog(0.00025, new HX.Color(0x1155ff), 0.0005, 100);
    camera.addComponent(fog);

    // var tonemap = new HX.ACESToneMapping();
    // tonemap.exposure = 0.0;
    // camera.addComponent(tonemap);
}

function initScene(scene, assetLibrary)
{
    var sun = new HX.DirectionalLight();
    sun.direction = new HX.Float4(-0.3, -1.0, -.3, 0.0);
    sun.intensity = 3;
    sun.castShadows = true;
    sun.depthBias = .01;
    scene.attach(sun);

    // TODO: Add procedural skybox

    var skyboxSpecularTexture = assetLibrary.get("skybox-specular");
    var skyboxIrradianceTexture = assetLibrary.get("skybox-irradiance");

    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(skyboxIrradianceTexture, skyboxSpecularTexture);
    scene.attach(lightProbe);

    var heightMap = assetLibrary.get("heightMap");
    var terrainMap = assetLibrary.get("terrainMap");

    // in our material
    // red = beach
    // green = rock
    // blue = snow
    // otherwise, fall back to grass
    terrainMaterial = assetLibrary.get("terrain-material");
    terrainMaterial.setTexture("heightMap", heightMap);
    terrainMaterial.setTexture("terrainMap", terrainMap);
    terrainMaterial.setUniform("heightMapSize", 2048);
    terrainMaterial.setUniform("worldSize", worldSize);
    // terrainMaterial.ssao = true;

    waterMaterial = assetLibrary.get("water-material");

    var terrain = new HX.Terrain(4000, -100, 200, 5, terrainMaterial, 64);

    var water = new HX.Terrain(4000, 0, 1, 3, waterMaterial, 16);
    water.position.z = waterLevel;

    scene.attach(terrain);
    scene.attach(water);
}