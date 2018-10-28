/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var physics = true;
var lights;
var heightMapSize;
var heightData;

var worldSize = 20000;
var waterLevel = 467;
var minHeight = 0;
var maxHeight = 4000;
var treeLineStart = 1000;
var treeLineEnd = 2000;
var terrain = null;
var numFoliageCells = 64;

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
		height = Math.max(height, getValue(pos.x, pos.y, 0, heightData, heightMapSize)  * (maxHeight - minHeight) + minHeight);

    pos.z = Math.max(pos.z, height + 1.7);
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

	var fog = new HX.Fog(0.001, new HX.Color(0x1155ff), 0.005, 0);
	var toneMap = new HX.FilmicToneMapping();
	toneMap.exposure = 0.0;
	camera.addComponents([fog, toneMap]);
}

function initScene()
{
	var scene = project.scene;
	var assetLibrary = project.assetLibrary;

	scene.partitioning = new HX.QuadPartitioning(worldSize, 5);

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

	heightMapSize = heightMap.width;
	heightData = HX.TextureUtils.getData(heightMap);

	initTerrain(heightMap, terrainMap);
	initWater();
	initFoliage(heightMap, terrainMap);
}

function initTerrain(heightMap, terrainMap)
{
	var camera = project.camera;
	var scene = project.scene;
	var assetLibrary = project.assetLibrary;

	terrain = new HX.Entity();

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
	terrain.addComponent(new HX.Terrain(heightMap, camera.farDistance * 2.5, worldSize, minHeight, maxHeight, terrainMaterial, subdiv));

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
	var assetLibrary = project.assetLibrary;
	var scene = project.scene;
	var plane = new HX.PlanePrimitive({width: 8000, height: 8000, numSegmentsW: 40, numSegmentsH: 40});
	var water = new HX.Entity();
	water.position.z = waterLevel;

	var waterMaterial = assetLibrary.get("water-material");
	waterMaterial.fixedLights = lights;
	waterMaterial.renderOrder = 50; // make sure water renders last, since most of it will be under the terrain

	water.addComponent(new HX.MeshInstance(plane, waterMaterial));
	water.addComponent(new WaterAnimator(project.camera));

	scene.attach(water);
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

function initMango(foliage)
{
	var mango0 = project.assetLibrary.get("mango-lod-0");
	var mango1 = project.assetLibrary.get("mango-lod-1");
	var trunkMat = mango0.materials["tree_mango_trunk_mat.004"];
	var leavesMat = mango0.materials["tree_mango_leaves_mat.004"];

	trunkMat.roughness = 0.75;

	leavesMat.roughness = 0.75;
	leavesMat.doubleSided = true;
	leavesMat.alphaThreshold = .5;
	leavesMat.alpha = 1.0;
	leavesMat.blendState = HX.BlendState.NORMAL;
	leavesMat.maskMap = null;
	leavesMat.translucency = new HX.Color(0.8, 0.8, 0.7);	// slightly yellowish light comes through

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

	var terrainData = HX.TextureUtils.getData(terrainMap);
	var terrainMapSize = terrainMap.width;

	initMango(foliage);

	var spacing = 17;
	var rand = spacing * .75;
	var ext = worldSize * .5 - 10;

	var transform = new HX.Transform();

	function filterLeaves(batch)
	{
		return batch.name === "leaves"? Math.random() < .9 : true;
	}

	for (var y = -ext; y < ext; y += spacing) {
		for (var x = -ext; x < ext; x += spacing) {
			var xp = x + (Math.random() - .5) * rand;
			var yp = y + (Math.random() - .5) * rand;
			var height = getValue(xp, yp, 0, heightData, heightMapSize) * (maxHeight - minHeight) + minHeight;
			// TODO: get the tangent
			var rock = getValue(xp, yp, 1, terrainData, terrainMapSize);

			// let's have nothing grow on rock
			if (rock > 0.7) continue;

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
	}

	terrain.addComponent(foliage);
}

function getValue(x, y, comp, mapData, mapSize)
{
	x = (x / worldSize + .5) * mapSize;
	y = (y / worldSize + .5) * mapSize;
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