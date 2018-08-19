/**
 * @author derschmale <http://www.derschmale.com>
 */
var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("collision-sound", "sound/collision.mp3", HX.AssetLibrary.Type.ASSET, HX.AudioFile);
};

project.onInit = function()
{
    // this.renderer.debugMode = HX.Renderer.DebugMode.SHADOW_MAP;
    this.renderer.shadowMapSize = 4096;
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.maxDirLights = 1;
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.numShadowCascades = 2;
    options.shadowFilter = new HX.PCFShadowFilter();
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.position.set(0.0, 0.0, 0.0);
    camera.nearDistance = .1;
    camera.farDistance = 100.0;
    camera.addComponent(new HX.AudioListener());

    var controller = new HX.OrbitController();
	controller.radius = 0; // radius 0 turns it into a look-around controller
    camera.addComponent(controller);
}

function initScene(scene, assetLibrary)
{
	var pointLight = new HX.PointLight();
	pointLight.castShadows = true;
	pointLight = new HX.Entity(pointLight);
	pointLight.position.set(0.0, 0.0, .9);

	scene.attach(pointLight);

	var ambientLight = new HX.AmbientLight();
	ambientLight.intensity = .03;
	scene.attach(new HX.Entity(ambientLight));

    var material = new HX.BasicMaterial();
    material.roughness = 0.3;

    var primitive = new HX.BoxPrimitive(
        {
            width: 5,
            height: 2,
            deptH: 5,
            invert:true
        });

    var room = new HX.Entity();
    var meshInstance = new HX.MeshInstance(primitive, material);
	meshInstance.castShadows = false;
	room.addComponent(meshInstance);
	scene.attach(room);

	primitive = new HX.SpherePrimitive(
		{
			radius:.1,
			numSegmentsH: 10,
			numSegmentsW: 15
		});

	material = new HX.BasicMaterial();
	material.color = 0x8050ff;
	material.roughness = 0.4;

	var ball = new HX.Entity();
	ball.position.y = 1.5;
	ball.addComponent(new HX.MeshInstance(primitive, material));
	ball.addComponent(new HX.AudioEmitter(assetLibrary.get("collision-sound")));
	ball.addComponent(new BounceComponent(room.worldBounds));
	scene.attach(ball);
}