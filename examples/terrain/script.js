/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var physics = false;
var lights;
var heightData;

var worldSize = 20000;
var waterLevel = 0;
var minHeight = -467;
var maxHeight = 3533;
var treeLineStart = 533;
var treeLineEnd = 1533;
var terrain = null;
var numFoliageCells = 64;
var grassEntity;

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-specular", "skyboxes/daylight-mips/skybox_specular.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("skybox-irradiance", "skyboxes/daylight-mips/irradiance_sh.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
    assetLibrary.queueAsset("heightMap", "terrain/textures/heightmap.dds", HX.AssetLibrary.Type.ASSET, HX.DDS);
	assetLibrary.queueAsset("terrainMap", "terrain/textures/terrainMap.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
	assetLibrary.queueAsset("terrain-material", "terrain/material/terrainMaterial.hmat", HX.AssetLibrary.Type.ASSET, HX.HMAT);
	assetLibrary.queueAsset("water-material", "terrain/material/waterMaterial.hmat", HX.AssetLibrary.Type.ASSET, HX.HMAT);
	assetLibrary.queueAsset("mango-lod-0", "terrain/models/mango_lod_0.hx", HX.AssetLibrary.Type.ASSET, HX.HX);
	assetLibrary.queueAsset("mango-lod-1", "terrain/models/mango_lod_1.hx", HX.AssetLibrary.Type.ASSET, HX.HX);
	assetLibrary.queueAsset("grass", "terrain/models/grass.hx", HX.AssetLibrary.Type.ASSET, HX.HX);
	assetLibrary.queueAsset("grass-material", "terrain/material/grassMaterial.hmat", HX.AssetLibrary.Type.ASSET, HX.HMAT);
	assetLibrary.queueAsset("flower-material", "terrain/material/flowerMaterial.hmat", HX.AssetLibrary.Type.ASSET, HX.HMAT);
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
	options.defaultLightingModel = HX.LightingModel.GGX;
	options.shadowFilter = new HX.VarianceShadowFilter();
	options.shadowFilter.blurRadius = 2;
	options.shadowFilter.lightBleedReduction = .7;
	// we need all the precision we can get
	options.shadowFilter.useHalfFloat = false;
	options.shadowFilter.minVariance = .0000001;
	project.init(document.getElementById('webglContainer'), options);
};

project.onInit = function()
{
	initCamera();
	initScene();

	if (physics) {
		var system = new HX_PHYS.PhysicsSystem();
		this.scene.startSystem(system);
	}
};

project.onUpdate = function(dt)
{
	var pos = this.camera.position;
    var bound = worldSize * .5 - 100;
    pos.x = HX.MathX.clamp(pos.x, -bound, bound);
    pos.y = HX.MathX.clamp(pos.y, -bound, bound);

	var height = waterLevel;

	if (!physics)
		height = Math.max(height, heightData.getValue(pos.x, pos.y, 0)  * (maxHeight - minHeight) + minHeight);

    pos.z = Math.max(pos.z, height + 1.7);

    // z will be assigned in the shader
	grassEntity.position.set(pos.x, pos.y, 0.0);
};

function initCamera()
{
	var camera = project.camera;
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
			new HX_PHYS.CapsuleCollider(0.5, 2, new HX.Float4(0, 0, -.9)),
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

	// var fog = new HX.Fog(0.001, new HX.Color(0x1155ff), 0.0015, 0);
	var fog = new HX.Fog(0.0005, new HX.Color(0x4080ff), 0.001, 0);
	var toneMap = new HX.FilmicToneMapping();
	toneMap.exposure = 0.0;
	camera.addComponents([fog, toneMap]);
}

function initScene()
{
	var scene = project.scene;
	var assetLibrary = project.assetLibrary;

	scene.partitioning = new HX.QuadPartitioning(worldSize, 4);

    var dirLight = new HX.DirectionalLight();
	dirLight.setCascadeRatios(.01, .05, 1.0);	// shift more shadow detail closer to the camera
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

	heightData = new TextureData(heightMap);

	initTerrain(heightMap, terrainMap);
	initWater();
	initFoliage(heightMap, terrainMap);
}

function initTerrain(heightMap, terrainMap)
{
	var camera = project.camera;
	var scene = project.scene;
	var assetLibrary = project.assetLibrary;

	// in our material
	// red = beach
	// green = rock
	// blue = snow
	// otherwise, fall back to grass
	var terrainMaterial = assetLibrary.get("terrain-material");
	terrainMaterial.setTexture("terrainMap", terrainMap);
	terrainMaterial.fixedLights = lights;
	// terrain is the main occluder, so render it first
	terrainMaterial.renderOrder = -10;

	var subdiv = HX.Platform.isMobile? 32 : 128;
	terrain = new HX.Terrain(heightMap, 10000, worldSize, minHeight, maxHeight, terrainMaterial, subdiv);

	if (physics) {
		var rigidBody = new HX_PHYS.RigidBody(
			new HX_PHYS.HeightfieldCollider(heightMap, worldSize, minHeight, maxHeight),
			0,
			new HX_PHYS.PhysicsMaterial(0.12, 0.0)
		);
		terrain.addComponent(rigidBody);
	}

	scene.attach(terrain);
}

function initWater()
{
	var plane = new HX.PlanePrimitive({width: 8000, height: 8000, numSegmentsW: 40, numSegmentsH: 40});
	var water = new HX.Entity();
	water.position.z = waterLevel;

	var waterMaterial = project.assetLibrary.get("water-material");
	waterMaterial.fixedLights = lights;
	waterMaterial.renderOrder = 50; // make sure water renders last, since most of it will be under the terrain

	var meshInstance = new HX.MeshInstance(plane, waterMaterial);
	meshInstance.castShadows = false;
	water.addComponent(meshInstance);
	water.addComponent(new WaterAnimator(project.camera));

	project.scene.attach(water);
}

function addLOD(foliage, name, mesh, material, startRange, endRange, castShadows)
{
	material.fixedLights = lights;

	var meshInstance = new HX.MeshInstance(mesh, material);
	meshInstance.lodRangeStart = startRange;
	meshInstance.lodRangeEnd = endRange;
	meshInstance.castShadows = castShadows;
	foliage.addLOD(name, meshInstance);
}

function initGrass(heightMap, terrainMap, mesh, material, size, spacing)
{
	var count = size / spacing;

	material.lightingModel = HX.LightingModel.Lambert;
	material.fixedLights = lights;
	material.setUniform("worldSize", worldSize);
	material.setUniform("range", size * .5);
	material.setUniform("snapSize", spacing);
	material.setUniform("minHeight", minHeight);
	material.setUniform("maxHeight", maxHeight);
	material.setUniform("heightMapSize", heightMap.width);
	material.setUniform("terrainMapSize", terrainMap.width);
	material.setTexture("heightMap", heightMap);
	material.setTexture("terrainMap", terrainMap);

	var radSqr = size * size * .25;
	var tr = new HX.Transform();
	// tr.scale.set(.1, .1, .1);
	var batch = new HX.MeshBatch(mesh, material, false);

	batch.name = "grass";

	for (var x = 0; x < count; ++x) {
		for (var y = 0; y < count; ++y) {
			// these will be offsets in the shader
			var xp = (x / count - .5) * size;
			var yp = (y / count - .5) * size;

			// keep limited to circle
			if (xp * xp + yp * yp < radSqr) {
				tr.position.x = xp;
				tr.position.y = yp;
				batch.createInstance(tr);
			}
		}
	}

	batch.bounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
	batch.castShadows = false;

	grassEntity.addComponent(batch);
}

function initMango(foliage)
{
	var mango0 = project.assetLibrary.get("mango-lod-0");
	var mango1 = project.assetLibrary.get("mango-lod-1");
	var trunkMat = mango0.materials["tree_mango_trunk_mat.004"];
	var leavesMat = mango0.materials["tree_mango_leaves_mat.004"];

	trunkMat.roughness = 0.75;

	leavesMat.lightingModel = HX.LightingModel.GGX_FULL;
	leavesMat.roughness = 0.7;
	leavesMat.doubleSided = true;
	leavesMat.alphaThreshold = .5;
	leavesMat.alpha = 1.0;
	leavesMat.blendState = null;
	leavesMat.maskMap = null;
	leavesMat.translucency = new HX.Color(0.7, 0.75, 0.6);	// slightly yellowish light comes through

	var cellSize = worldSize / numFoliageCells;
	var lodDist = cellSize * .75;

	// level 0
	addLOD(foliage, "mango", mango0.meshes["Untitled.004"], trunkMat, 0, lodDist, true);
	addLOD(foliage, "mango", mango0.meshes["Untitled.004_1"], leavesMat, 0, lodDist, true);

	// level 1
	addLOD(foliage, "mango", mango1.meshes["Untitled"], trunkMat, lodDist, lodDist * 1.5, true);
	addLOD(foliage, "mango", mango1.meshes["Untitled_1"], leavesMat, lodDist, lodDist * 1.5, true);

	var entity = new HX.Entity();
	entity.addComponent(new HX.MeshInstance(mango0.meshes["Untitled.004"], trunkMat));
	entity.addComponent(new HX.MeshInstance(mango0.meshes["Untitled.004_1"], leavesMat));
	var impostor = HX.Impostor.create(entity, 64, 64, true);
	impostor.lodRangeStart = lodDist * 1.5;
	impostor.lodRangeEnd = 2000.0;
	impostor.castShadows = false;
	impostor.material.fixedLights = lights;
	impostor.material.translucency = leavesMat.translucency;
	impostor.material.color = 0xb0b0b0;	// make it a bit darker (accounts for shadowing)
	// impostor.material.debugMode = HX.Material.DEBUG_NORMALS;
	foliage.addLOD("mango", impostor);
}

function initFoliage(heightMap, terrainMap)
{
	var foliage = new HX.Foliage(worldSize, numFoliageCells);
	var terrainData = new TextureData(terrainMap);

	initMango(foliage);

	var grass = project.assetLibrary.get("grass");
	grassEntity = new HX.Entity();
	project.scene.attach(grassEntity);
	initGrass(heightMap, terrainMap, grass.meshes["grass02"], project.assetLibrary.get("grass-material"), 100, 1);
	initGrass(heightMap, terrainMap, new HX.ImpostorPrimitive(), project.assetLibrary.get("flower-material"), 50, 5);

	populateTrees(foliage, terrainData);

	terrain.addComponent(foliage);
}

function populateTrees(foliage, terrainData)
{
	var spacing = 20;
	var rand = spacing * .75;
	var ext = worldSize * .5 - 10;

	var transform = new HX.Transform();

	function filterLeaves(batch)
	{
		return batch.name === "leaves"? Math.random() < .9 : true;
	}

	var y = -ext;

	function placeRows()
	{
		// place 20 rows at once
		for (var i = 0; i < 20; ++i) {
			for (var x = -ext; x < ext; x += spacing) {
				var xp = x + (Math.random() - .5) * rand;
				var yp = y + (Math.random() - .5) * rand;
				var rock = terrainData.getValue(xp, yp, 1);

				// let's have nothing grow on rock
				if (rock > 0.7) continue;

				var height = heightData.getValue(xp, yp, 0) * (maxHeight - minHeight) + minHeight;
				var treeLine = HX.MathX.saturate((height - treeLineStart) / (treeLineEnd - treeLineStart));

				var odds = HX.MathX.lerp(0.75, 1.0, treeLine);
				if (Math.random() > odds && height > waterLevel + 20.0) {
					transform.position.set(xp, yp, height);
					var sc = HX.MathX.lerp(.25, 1.2, Math.random()) * 0.07;
					transform.scale.set(sc, sc, sc);
					transform.euler.z = Math.random() * Math.PI * 2.0;

					foliage.createInstance("mango", transform, filterLeaves);
				}
			}

			y += spacing;

			if (y >= ext)
				return;
		}

		setTimeout(placeRows, 0);
	}

	placeRows();
}