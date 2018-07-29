/**
/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var terrainMaterial;
var waterMaterial;
var time = 0;

// 1 = 10m
var worldSize = 20000;
var waterLevel = -15;
var minHeight = -100;
var maxHeight = 1000;
var fog;

function CenterAtComponent(camera)
{
    HX.Component.call(this);

    this.onUpdate = function (dt)
    {
        this.entity.position.x = camera.position.x;
        this.entity.position.y = camera.position.y;
    }
}

HX.Component.create(CenterAtComponent);

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
	this.scene.startSystem(new HX.PhysicsSystem());
    initCamera(this.camera);
    initScene(this.scene, this.camera, this.assetLibrary);

    time = 0;
};

project.onUpdate = function(dt)
{
    time += dt;
    waterMaterial.setUniform("normalOffset1", [ -time * 0.0004, -time * 0.0005 ]);
    waterMaterial.setUniform("normalOffset2", [ time * 0.0001, time * 0.0002 ]);

    var pos = this.camera.position;
    var bound = worldSize * .5 - 100;
    pos.x = HX.MathX.clamp(pos.x, -bound, bound);
    pos.y = HX.MathX.clamp(pos.y, -bound, bound);
    pos.z = Math.max(pos.z, waterLevel + 0.5);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.webgl2 = true;
    options.numShadowCascades = 3;
    options.hdr = true;
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.shadowFilter = new HX.VarianceShadowFilter();
    options.shadowFilter.softness = .002;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.position.x = 1397 * 4;
    camera.position.y = -1676 * 4;
    camera.position.z = 221;

    camera.nearDistance = 0.05;
    camera.farDistance = 8000.0;

    var controller = new HX.PlayerController();
    controller.walkForce = 2000.0;
    controller.runForce = 20000.0;
    controller.jumpForce = 5.0;
    controller.yaw = Math.PI;
    camera.addComponent(controller);

	var rigidBody = new HX.RigidBody(
	    new HX.CapsuleCollider(1.0, 2, new HX.Float4(0, 0, -.9)),
        undefined,
		new HX.PhysicsMaterial(0.14, 0.0)
    );

	rigidBody.linearDamping = 0.8;
	rigidBody.mass = 70;
	// important so the player capsule does not rotate along with the "head"
	rigidBody.ignoreRotation = true;
	camera.addComponent(rigidBody);

    fog = new HX.Fog(0.0004, new HX.Color(0x1155ff), 0.0005, 100);
    camera.addComponent(fog);
}

function initScene(scene, camera, assetLibrary)
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

    waterMaterial = assetLibrary.get("water-material");

    var terrain = new HX.Terrain(16000, minHeight, maxHeight, 4, terrainMaterial, 32);

    var rigidBody = new HX.RigidBody(
		new HX.HeightfieldCollider(heightMap, worldSize, minHeight, maxHeight, true),
        0,
        new HX.PhysicsMaterial(0.14, 0.0)
    );
	terrain.addComponent(rigidBody);

	// this is definitely overkill:
	var plane = new HX.PlanePrimitive({width: 4000, height: 4000, numSegmentsW: 20, numSegmentsH: 20});
	var water = new HX.ModelInstance(plane, waterMaterial, 16);
    water.position.z = waterLevel;
    water.addComponent(new CenterAtComponent(camera));

    scene.attach(terrain);
    scene.attach(water);
}