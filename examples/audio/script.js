/**
 * @author derschmale <http://www.derschmale.com>
 */
var project = new DemoProject();

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.shadowFilter = new HX.PCFShadowFilter();
    options.shadowFilter.softness = .001;
    options.shadowFilter.dither = true;
    project.init(document.getElementById('webglContainer'), options);
};


project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("collision-sound", "sound/collision.wav", HX.AssetLibrary.Type.ASSET, HX.AudioFile);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
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
	pointLight.intensity = 10;
	pointLight.radius = 100;

    lights = [ pointLight ];

	pointLight = new HX.Entity(pointLight);
	pointLight.position.set(0.0, 0.0, .9);

	scene.attach(pointLight);

	var ambientLight = new HX.AmbientLight();
	ambientLight.intensity = .03;
	scene.attach(new HX.Entity(ambientLight));
    lights.push(ambientLight);

    var material = new HX.BasicMaterial();
    material.roughness = 0.45;
    material.fixedLights = lights;

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

	var audioEmitter = new HX.AudioEmitter(assetLibrary.get("collision-sound"));
	// set the name of the sound because it's used to trigger the sound from BounceComponent
    audioEmitter.name = "collision";
    audioEmitter.panningModel = HX.AudioPanningModel.HRTF;

	ball.addComponent(audioEmitter);
	ball.addComponent(new BounceComponent(room.worldBounds));
	scene.attach(ball);
}