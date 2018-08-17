/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new VRProject();
var vrDisplays;

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/marble_tiles/marbletiles_diffuse_white.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    this.renderer.shadowMapSize = 1024;

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
    // allow mirroring the VR display
    options.preserveDrawingBuffer = true;
    project.init(document.getElementById('webglContainer'), options);
};

function toggleVR()
{
    var select = document.getElementById("displaySelection");

    if (HX.META.VR_DISPLAY) {
        HX.disableVR();
        select.disabled = false;
    }
    else {
        HX.enableVR(vrDisplays[select.selectedIndex]);
        select.disabled = true;
    }
}

function initVR()
{
    if (!navigator.getVRDisplays) {
        project.showError("It seems like WebVR is not supported on your device.")
        return;
    }

    navigator.getVRDisplays().then(displays => {
        vrDisplays = displays;
        if (displays.length === 0) {
            project.showError("It seems like you don't have any compatible VR devices.")
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

function initCamera(camera)
{
    camera.position.set(0.0, 0.0, -9.2);
    camera.nearDistance = .03;
    camera.farDistance = 100.0;
}

function initScene(scene, assetLibrary)
{
    var lights = [];
    var dirLight = new HX.DirectionalLight();
    dirLight.castShadows = true;
	lights.push(dirLight);

	dirLight = new HX.Entity(dirLight);
    dirLight.lookAt(new HX.Float4(-1.0, 1.0, -1.0));

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
    for (var x = -2; x <= 2; ++x) {
        for (var y = -2; y <= 2; ++y) {
            for (var z = -2; z <= 2; ++z) {
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
}