/**
 * @author derschmale <http://www.derschmale.com>
 */
var project = new DemoProject();
var terrainMaterial;
var waterMaterial;
var time = 0;
var physics = false;
var lights;

var worldSize = 20000;
var waterLevel = 467;
var minHeight = 0;
var maxHeight = 4000;
var treeLine = 3000;

function CenterAtComponent(camera)
{
    HX.Component.call(this);

    this.onUpdate = function (dt)
    {
        this.entity.position.x = camera.position.x;
        this.entity.position.y = camera.position.y;
    };

    this.clone = function()
    {
        return new CenterAtComponent(camera);
    };
}

HX.Component.create(CenterAtComponent);

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-specular", "skyboxes/daylight-mips/skybox_specular.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("skybox-irradiance", "skyboxes/daylight-mips/irradiance_sh.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
    assetLibrary.queueAsset("heightMap", "terrain/textures/heightmap.dds", HX.AssetLibrary.Type.ASSET, HX.DDS);
    assetLibrary.queueAsset("terrainMap", "terrain/textures/terrainMap.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("terrain-material", "terrain/material/terrainMaterial.hmat", HX.AssetLibrary.Type.ASSET, HX.HMAT);
    assetLibrary.queueAsset("water-material", "terrain/material/waterMaterial.hmat", HX.AssetLibrary.Type.ASSET, HX.HMAT);
    assetLibrary.queueAsset("mango-lod-0", "terrain/models/mango_lod_0.hx", HX.AssetLibrary.Type.ASSET, HX.HX);
};

project.onInit = function()
{
	initCamera(this.camera);
    initScene(this.scene, this.camera, this.assetLibrary);

    time = 0;

	if (physics)
		this.scene.startSystem(new HX_PHYS.PhysicsSystem());
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
    if (!HX.Platform.isMobile) {
		options.webgl2 = true;
		options.numShadowCascades = 3;
	}
    options.hdr = true;
    options.debug = true;
    options.defaultLightingModel = HX.LightingModel.GGX_FULL;
    options.shadowFilter = new HX.VarianceShadowFilter();
    options.shadowFilter.softness = .002;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.position.x = 4187;
    camera.position.y = 2000;
    camera.position.z = 540;
    camera.nearDistance = 0.1;
    camera.farDistance = 8000.0;

    if (physics) {
		var controller = new FPSController();
		controller.walkAcceleration = 2000.0;
		controller.runAcceleration = 20000.0;
		controller.jumpForce = 5.0;


		var rigidBody = new HX_PHYS.RigidBody(
			new HX_PHYS.CapsuleCollider(1.0, 2, new HX.Float4(0, 0, -.9)),
			undefined,
			new HX_PHYS.PhysicsMaterial(0.12, 0.0)
		);

		rigidBody.linearDamping = 0.8;
		rigidBody.mass = 70;
		// important so the player capsule does not rotate along with the "head"
		rigidBody.ignoreRotation = true;
		camera.addComponents([controller, rigidBody])
	}
	else {
		controller = new FloatController();
		controller.shiftMultiplier = 100;
		camera.addComponent(controller)
	}

	var fog = new HX.Fog(0.001, new HX.Color(0x1155ff), 0.005, 0);
	var toneMap = new HX.FilmicToneMapping();
	toneMap.exposure = 0.0;
	camera.addComponents([fog, toneMap]);
}

function initScene(scene, camera, assetLibrary)
{
	scene.partitioning = new HX.QuadPartitioning(worldSize, 5);
    var dirLight = new HX.DirectionalLight();
    // shift more detail closer to the camera
	dirLight.setCascadeRatios(.01, .05, 1.0);
    dirLight.intensity = 15;
    dirLight.color = 0xfff5e8;
    if (!HX.Platform.isMobile)
        dirLight.castShadows = true;

    var sun = new HX.Entity(dirLight);
	sun.lookAt(new HX.Float4(-0.3, -.5, -0.3, 0.0));
    scene.attach(sun);

    // TODO: Add procedural skybox

    var skyboxSpecularTexture = assetLibrary.get("skybox-specular");
    var skyboxIrradiance = assetLibrary.get("skybox-irradiance");

    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(skyboxIrradiance, skyboxSpecularTexture);
    scene.attach(new HX.Entity(lightProbe));

    lights = [ dirLight, lightProbe ];
    var heightMap = assetLibrary.get("heightMap");
    var terrainMap = assetLibrary.get("terrainMap");

	heightMap.wrapMode = HX.TextureWrapMode.CLAMP;
	terrainMap.wrapMode = HX.TextureWrapMode.CLAMP;

    // in our material
    // red = beach
    // green = rock
    // blue = snow
    // otherwise, fall back to grass
    terrainMaterial = assetLibrary.get("terrain-material");
    terrainMaterial.setTexture("terrainMap", terrainMap);
	terrainMaterial.fixedLights = lights;

    waterMaterial = assetLibrary.get("water-material");
	waterMaterial.fixedLights = lights;

    var terrain = new HX.Entity();
    var subdiv = HX.Platform.isMobile? 32 : 128;
	terrain.addComponent(new HX.Terrain(heightMap, camera.farDistance * 2.5, worldSize, minHeight, maxHeight, terrainMaterial, subdiv));

	// this is definitely overkill:
	var plane = new HX.PlanePrimitive({width: 8000, height: 8000, numSegmentsW: 40, numSegmentsH: 40});
	var water = new HX.Entity();
    water.position.z = waterLevel;
    waterMaterial.renderOrder = 50; // make sure water renders last, since most of it will be under the terrain
	water.addComponent(new HX.MeshInstance(plane, waterMaterial));
	water.addComponent(new CenterAtComponent(camera));

	scene.attach(terrain);
    scene.attach(water);

	if (physics) {
		var rigidBody = new HX_PHYS.RigidBody(
			new HX_PHYS.HeightfieldCollider(heightMap, worldSize, minHeight, maxHeight),
			0,
			new HX_PHYS.PhysicsMaterial(0.12, 0.0)
		);
		terrain.addComponent(rigidBody);
	}

	initFoliage(terrain, heightMap, terrainMap);
}

var foliage = {};
var cellsX = 32;
var cellsY = 32;
var batchEntities = [];

function initBatchEntities()
{
	for (var i = 0; i < cellsX * cellsY; ++i) {
		// every cell contains an entity, which in turn contains all the batches for that cell
		var entity = new HX.Entity();
		batchEntities.push(entity);
		project.scene.attach(entity);
	}
}

function addLOD(name, lodLevel, mesh, material, startRange, endRange)
{
	foliage[name] = foliage[name] || [];
	var batches = [];
	foliage[name].push(batches);

	material.fixedLights = lights;

	for (var i = 0; i < cellsX * cellsY; ++i) {
		var batch = new HX.MeshBatch(mesh, material);
		batch.lodRangeEnd = endRange;
		batch.lodRangeStart = startRange;
		batches.push(batch);
		batchEntities[i].addComponent(batch);
	}
}

function addInstance(name, transform)
{
	var cellX = Math.floor((transform.position.x / worldSize + .5) * cellsX);
	var cellY = Math.floor((transform.position.y / worldSize + .5) * cellsY);
	var cellIndex = cellX + cellY * cellsX;
	var lods = foliage[name];

	for (var i = 0; i < lods.length; ++i) {
		var batch = lods[i][cellIndex];
		batch.createInstance(transform);
	}
}

function initMango()
{
	var mango0 = project.assetLibrary.get("mango-lod-0");
	var trunkMat = mango0.materials["tree_mango_trunk_mat.004"];
	var leavesMat = mango0.materials["tree_mango_leaves_mat.004"];

	trunkMat.roughness = 0.75;
	// trunkMat.clipToLODRange = true;

	leavesMat.roughness = 0.75;
	// leavesMat.clipToLODRange = true;
	leavesMat.doubleSided = true;
	leavesMat.alphaThreshold = .5;
	leavesMat.alpha = 1.0;
	leavesMat.blendState = HX.BlendState.NORMAL;
	leavesMat.maskMap = null;

	addLOD("mango", 0, mango0.meshes["Untitled.004"], trunkMat, Number.NEGATIVE_INFINITY, 100.0);
	addLOD("mango", 0, mango0.meshes["Untitled.004_1"], leavesMat, Number.NEGATIVE_INFINITY, 100.0);
}

function initFoliage(terrain, heightMap, terrainMap)
{
	initBatchEntities();

	var heightData = HX.TextureUtils.getData(heightMap);
	var terrainData = HX.TextureUtils.getData(terrainMap);
	var heightMapSize = heightMap.width;
	var terrainMapSize = terrainMap.width;

	initMango();

	var spacing = 10;
	var rand = spacing * .75;
	var ext = worldSize * .5 - 10;

	var transform = new HX.Transform();

	for (var y = -ext; y < ext; y += spacing) {
		for (var x = -ext; x < ext; x += spacing) {
			var xp = x + (Math.random() - .5) * rand;
			var yp = y + (Math.random() - .5) * rand;
			var height = getValue(xp, yp, 0, heightData, heightMapSize) * (maxHeight - minHeight) + minHeight;
			var rock = getValue(xp, yp, 1, terrainData, terrainMapSize);

			// let's have nothing grow on rock
			if (rock > 0.0) continue;

			if (Math.random() > .75 && height > waterLevel + 20.0 && height < treeLine) {
				transform.position.set(xp, yp, height);
				var sc = HX.MathX.lerp(.05, 1.2, Math.random()) * 0.07;
				transform.scale.set(sc, sc, sc);
				transform.euler.z = Math.random() * Math.PI * 2.0;

				addInstance("mango", transform);
				// batches["mango_lod_1"][cellIndex].createInstance(transform);
			}
		}
	}
}

function getValue(x, y, comp, mapData, mapSize)
{
	x = (x / worldSize + .5) * (mapSize - 1) + .5;
	y = (y / worldSize + .5) * (mapSize - 1) + .5;
	var xi = Math.floor(x);
	var yi = Math.floor(y);
	var xf = x - xi;
	var yf = y - yi;
	var tl = getHeightPixel(xi, yi, comp, mapData, mapSize);
	var tr = getHeightPixel(xi + 1, yi, comp, mapData, mapSize);
	var bl = getHeightPixel(xi, yi + 1, comp, mapData, mapSize);
	var br = getHeightPixel(xi + 1, yi + 1, comp, mapData, mapSize);
	var t = HX.MathX.lerp(tl, tr, xf);
	var b = HX.MathX.lerp(bl, br, xf);
	return HX.MathX.lerp(t, b, yf);
}

function getHeightPixel(xi, yi, comp, mapData, mapSize)
{
	return mapData[((xi + yi * mapSize) << 2) + comp];
	return mapData[((xi + yi * mapSize) << 2) + comp];
}
