/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new VRProject();
var vrDisplays;
var activeVRDisplay;
var audioListener;
var leftController = null;
var rightController = null;
var input = new HX.Input();
var headCollider;


window.onload = function ()
{
    var options = new HX.InitOptions();
    options.shadowFilter.softness = .001;
    options.shadowFilter.dither = true;
    options.hdr = true;
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.shadowFilter = new HX.PCFShadowFilter();
    options.shadowFilter.softness = .001;
    project.init(document.getElementById('webglContainer'), options);
};


project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("collision-sound", "sound/collision.wav", HX.AssetLibrary.Type.ASSET, HX.AudioFile);
};

project.onInit = function()
{
    this.renderer.shadowMapSize = 1024;

    initCamera(this.camera, this.vrCamera);
    initScene(this.scene, this.assetLibrary);

    var physics = new HX_PHYS.PhysicsSystem();
    // no gravity
    physics.gravity = 0.0;
    physics.allowSleep = false; // cannon does not work well with kinematic objects if bodies are allowed to sleep
    this.scene.startSystem(physics);

    this.vrButton = document.getElementById("toggleVRButton");
    this.vrButton.addEventListener("click", toggleVR.bind(this));

    // displays need to be retrieved up front
	HX.getVRDisplays(onVRDisplaysReceived);
};

function toggleVR()
{
    var select = document.getElementById("displaySelection");

    if (activeVRDisplay) {
        destroyController(activeVRDisplay.gamepadLeft);
        destroyController(activeVRDisplay.gamepadRight);

        HX.disableVR();
        select.disabled = false;

        this.scene.detach(headCollider);
        this.vrCamera.removeComponent(audioListener);
        this.camera.addComponent(audioListener);

        activeVRDisplay = null;
    }
    else {
        activeVRDisplay = vrDisplays[select.selectedIndex];
        HX.enableVR(activeVRDisplay);

        select.disabled = true;

        this.scene.attach(headCollider);
        this.camera.removeComponent(audioListener);
        this.vrCamera.addComponent(audioListener);

        // use room scale
        if (activeVRDisplay.sittingToStandingTransform)
            this.vrCamera.matrix = activeVRDisplay.sittingToStandingTransform;

        // init gamepads
        if (activeVRDisplay.gamepadLeft)
            initController(activeVRDisplay.gamepadLeft);

        if (activeVRDisplay.gamepadRight)
            initController(activeVRDisplay.gamepadRight);

        activeVRDisplay.onGamepadConnected.bind(initController);
        activeVRDisplay.onGamepadDisconnected.unbind(destroyController);
    }
}

function initController(gamepad)
{
    input.enable(gamepad);

    var radius = .01;
    var height = .2;

    var entity = new HX.Entity();
    entity.name = "stick: " + gamepad.hand;

    var primitive = new HX.CylinderPrimitive({
        alignment: HX.CylinderPrimitive.ALIGN_Y,
        radius: radius,
        height: height
    });
    var material = new HX.BasicMaterial({color: 0xff80ff});
    var meshInstance = new HX.MeshInstance(primitive, material);
    entity.addComponent(meshInstance);

    var rigidBody = new HX_PHYS.RigidBody(new HX_PHYS.CylinderCollider(radius, height, HX.Float4.Y_AXIS));
    rigidBody.linearDamping = 0;
    rigidBody.material = new HX_PHYS.PhysicsMaterial(0, 1);
    entity.addComponent(rigidBody);

    // need to add this AFTER RigidBody, since it requires grabbing the component from the Entity
    entity.addComponent(new TrackedController(gamepad));

    // this is important: the controller is in "VR space", which matches the VR camera
    project.vrCamera.attach(entity);

    if (gamepad.hand === HX.Gamepad.HAND_LEFT) {
        leftController = entity;
    }
    else if (gamepad.hand === HX.Gamepad.HAND_RIGHT) {
        rightController = entity;
    }
}

function destroyController(gamepad)
{
    if (!gamepad) return;

    input.disable(gamepad);

    if (gamepad.hand === HX.Gamepad.HAND_LEFT && leftController) {
        console.log("Destroying left");
        project.vrCamera.detach(leftController);
        leftController = null;
    }
    else if (gamepad.hand === HX.Gamepad.HAND_RIGHT && rightController) {
        console.log("Destroying right");
        project.vrCamera.detach(rightController);
        rightController = null;
    }
}

function onVRDisplaysReceived(displays)
{
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
}

function initCamera(camera, vrCamera)
{
    audioListener = new HX.AudioListener();

    camera.position.set(0.0, 0.0, 1.0);
    camera.nearDistance = .1;
    camera.farDistance = 100.0;
    vrCamera.copyFrom(camera);

    vrCamera.position.set(0.0, 0.0, 0.0);

    headCollider = new HX.Entity();
    var headBody = new HX_PHYS.RigidBody(new HX_PHYS.SphereCollider(.07));
    headBody.isKinematic = true;
    headCollider.addComponent(headBody);
    headCollider.addComponent(new TrackHMDController(vrCamera));

    camera.addComponent(audioListener);

    var controller = new OrbitController();
	controller.radius = 0; // radius 0 turns it into a look-around controller
    controller.lookAtTarget.copyFrom(camera.position);
    camera.addComponent(controller);
}

function initScene(scene, assetLibrary)
{
	var pointLight = new HX.PointLight();
	pointLight.castShadows = true;
	pointLight.intensity = 5;
	pointLight.radius = 1000;
	pointLight = new HX.Entity(pointLight);
	pointLight.position.set(0.0, 0.0, 1.9);

	scene.attach(pointLight);

	var ambientLight = new HX.AmbientLight();
	ambientLight.intensity = .03;
	scene.attach(new HX.Entity(ambientLight));

    var material = new HX.BasicMaterial();
    material.roughness = 0.45;

    var primitive = new HX.BoxPrimitive(
        {
            width: 1.5,
            height: 2.0,
            depth: 1.5,
            invert:true
        });

    var room = new HX.Entity();
    room.position.set(0.0, 0.0, 1.0); // 0 is floor
    room.name = "room";
    var meshInstance = new HX.MeshInstance(primitive, material);
	meshInstance.castShadows = false;
	room.addComponent(meshInstance);

	var roomBody = new HX_PHYS.RigidBody(new HX_PHYS.InvertedBoxCollider(10)); // walls 10 meter thick to make sure to catch fast collisions
    roomBody.mass = 0;
	room.addComponent(roomBody);

	scene.attach(room);

	primitive = new HX.SpherePrimitive(
		{
			radius:.05,
			numSegmentsH: 10,
			numSegmentsW: 15
		});

	material = new HX.BasicMaterial();
	material.color = 0x8050ff;
	material.roughness = 0.4;

	var ball = new HX.Entity();
    ball.name = "ball";
	ball.position.z = 1.0;
	ball.position.y = 0.3;
	ball.addComponent(new HX.MeshInstance(primitive, material));
	ball.addComponent(new AudioTrigger());

	var audioEmitter = new HX.AudioEmitter(assetLibrary.get("collision-sound"));
    // set the name of the sound because it's used to trigger the sound from BounceComponent
    audioEmitter.name = "collision";
    audioEmitter.panningModel = HX.AudioPanningModel.HRTF;

	ball.addComponent(audioEmitter);
	ball.addComponent(new HX_PHYS.RigidBody());
	scene.attach(ball);
}