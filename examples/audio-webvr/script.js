/**
 * @author derschmale <http://www.derschmale.com>
 */
var project = new VRProject();
var vrDisplays;
var audioListener;

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("collision-sound", "sound/collision.mp3", HX.AssetLibrary.Type.ASSET, HX.AudioFile);
};

project.onInit = function()
{
    this.renderer.shadowMapSize = 1024;

    initCamera(this.camera, this.vrCamera);
    initScene(this.scene, this.assetLibrary);

    this.vrButton = document.getElementById("toggleVRButton");
    this.vrButton.addEventListener("click", toggleVR.bind(this));

    // displays need to be retrieved up front
    initVR();
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.numShadowCascades = 2;
    options.shadowFilter = new HX.PCFShadowFilter();
    project.init(document.getElementById('webglContainer'), options);
};

function toggleVR()
{
    var select = document.getElementById("displaySelection");

    if (HX.META.VR_DISPLAY) {
        HX.disableVR();
        select.disabled = false;

        this.vrCamera.removeComponent(audioListener);
        this.camera.addComponent(audioListener);

    }
    else {
        HX.enableVR(vrDisplays[select.selectedIndex]);
        select.disabled = true;

        this.camera.removeComponent(audioListener);
        this.vrCamera.addComponent(audioListener);
    }
}

function initVR()
{
    if (!navigator.getVRDisplays) {
        document.getElementById("controlsField").classList.add("hidden");
        return;
    }

    navigator.getVRDisplays().then(displays => {
        vrDisplays = displays;
        if (displays.length === 0) {
            document.getElementById("controlsField").classList.add("hidden");
            return;
        }

        var select = document.getElementById("displaySelection");

        for (var i = 0, len = displays.length; i < len; ++i) {
            var option = document.createElement("option");
            option.innerHTML = displays[i].displayName;
            select.appendChild(option);
        }
        select.selectedIndex = 0;

        project.vrButton.classList.remove("hidden");
    });
}

function initCamera(camera, vrCamera)
{
    audioListener = new HX.AudioListener();

    camera.position.set(0.0, 0.0, 0.0);
    camera.nearDistance = .1;
    camera.farDistance = 100.0;
    vrCamera.copyFrom(camera);

    camera.addComponent(audioListener);

    var controller = new HX.OrbitController();
	controller.radius = 0; // radius 0 turns it into a look-around controller
    camera.addComponent(controller);
}

function initScene(scene, assetLibrary)
{
	var pointLight = new HX.PointLight();
	pointLight.castShadows = true;
	pointLight.intensity = 10;
	pointLight.radius = 100000;
	pointLight = new HX.Entity(pointLight);
	pointLight.position.set(0.0, 0.0, .9);

	scene.attach(pointLight);

	var ambientLight = new HX.AmbientLight();
	ambientLight.intensity = .03;
	scene.attach(new HX.Entity(ambientLight));

    var material = new HX.BasicMaterial();
    material.roughness = 0.45;

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