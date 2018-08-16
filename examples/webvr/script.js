/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new VRProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/marble_tiles/marbletiles_diffuse_white.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("boombox", "boombox/BoomBox.gltf", HX.AssetLibrary.Type.ASSET, HX_IO.GLTF);
};

project.onInit = function()
{
    // this.renderer.debugMode = HX.Renderer.DebugMode.SHADOW_MAP;
    this.renderer.shadowMapSize = 4096;

    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);

    this.vrButton = document.getElementById("toggleVRButton");
    this.vrButton.addEventListener("click", toggleVR);

    // displays need to be retrieved up front
    initVR();
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.maxDirLights = 1;
    options.defaultLightingModel = HX.LightingModel.GGX;
    project.init(document.getElementById('webglContainer'), options);
};

function toggleVR()
{
    if (HX.META.VR_DISPLAY)
        HX.disableVR();
    else
        HX.enableVR(project.vrDisplay);
}

function initVR()
{
    if (!navigator.getVRDisplays) {
        project.showError("It seems like WebVR is not supported on your device.")
        return;
    }

    navigator.getVRDisplays().then(displays => {
        if (displays.length === 0) {
            project.showError("It seems like you don't have any compatible VR devices.")
            return;
        }

        project.vrDisplay = displays[0];
        project.vrButton.classList.remove("hidden");
    });
}

function initCamera(camera)
{
    camera.position.set(0.0, 0.0, 0.0);
    camera.nearDistance = .1;
    camera.farDistance = 100.0;

    // var floatController = new HX.FloatController();
    // floatController.speed = 5.0;
    // camera.addComponent(floatController);
}

function initScene(scene, assetLibrary)
{
    var lights = [];
    var dirLight = new HX.DirectionalLight();
    dirLight.castShadows = true;
	lights.push(dirLight);

	dirLight = new HX.Entity(dirLight);
    dirLight.lookAt(new HX.Float4(-1.0, -1.0, -1.0));

    scene.attach(dirLight);

    var ambientLight = new HX.AmbientLight();
    ambientLight.intensity = .03;
    scene.attach(new HX.Entity(ambientLight));

    var material = new HX.BasicMaterial();
    // the difference is, we don't assign lights, but we do assign a lighting model
    material.colorMap = assetLibrary.get("albedo");
    material.roughness = 0.05;

    var material2 = new HX.BasicMaterial();
    material2.colorMap = assetLibrary.get("albedo");
    material2.roughness = 0.2;

    var primitive = new HX.SpherePrimitive(
        {
            radius:.24,
            numSegmentsH: 10,
            numSegmentsW: 15
        });

    var spacing = 4;
    for (var x = -5; x <= 5; ++x) {
        for (var y = -5; y <= 5; ++y) {
            for (var z = -5; z <= 5; ++z) {
                var instance = new HX.Entity();
                instance.addComponent(new HX.MeshInstance(primitive, material));
                instance.position.set(x + Math.random() *.5 -.25, y + Math.random() *.5 -.25, z + Math.random() *.5 -.25);
                instance.position.scale(spacing);
                scene.attach(instance);
            }
        }
    }

    primitive = new HX.BoxPrimitive(
        {
            width: 22,
            invert:true,
            numSegmentsW: 10,
            scaleU: 20,
            scaleV: 20
        });

    var instance = new HX.Entity();
    var meshInstance = new HX.MeshInstance(primitive, material);
    meshInstance.castShadows = false;
	instance.addComponent(meshInstance);
	scene.attach(instance);

	// temporary, to figure out orientation
    var gltf = assetLibrary.get("boombox");
    gltf.defaultScene.rootNode.scale.set(100, 100, 100);
    gltf.defaultScene.rootNode.position.y = 3;
    scene.attach(gltf.defaultScene.rootNode);
}