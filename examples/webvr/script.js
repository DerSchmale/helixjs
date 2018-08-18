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
    initCamera(this.camera);
    initScene(this.scene);

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
	options.ambientOcclusion = new HX.HBAO();
	options.ambientOcclusion.strength = 3;
	options.ambientOcclusion.sampleRadius = .5;
	options.ambientOcclusion.fallOffDistance = 1.0;
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
        project.showError("It seems like WebVR is not supported on your device.");
        return;
    }

    navigator.getVRDisplays().then(displays => {
        vrDisplays = displays;
        if (displays.length === 0) {
            project.showError("It seems like you don't have any compatible VR devices.");
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
    camera.nearDistance = .03;
    camera.farDistance = 100.0;
}

function initScene(scene)
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


    var primitive = new HX.BoxPrimitive();

    var spacing = 4;

    for (var i = 0; i < 20; ++i) {
		var material = new HX.BasicMaterial();
		material.roughness = 0.05;
		material.color = new HX.Color(Math.random(), Math.random(), Math.random());

		var entity = new HX.Entity();
        entity.addComponent(new HX.MeshInstance(primitive, material));
        entity.position.set(Math.random() - .5, Math.random() - .5, Math.random() - .5);
        entity.position.scale(spacing);
        entity.scale.set(.5 + Math.random() * .5, .5 + Math.random() * .5, .5 + Math.random());
        entity.position.y += spacing * .75;
        scene.attach(entity);
    }

	primitive = new HX.BoxPrimitive({
        width: 10,
        height: 10,
        invert: true
    });

    material = new HX.BasicMaterial();
	material.color = 0xffffff;
	material.roughness = .2;
	entity = new HX.Entity();
	var meshInstance = new HX.MeshInstance(primitive, material);
	meshInstance.castShadows = false;
	entity.addComponent(meshInstance);
	scene.attach(entity);
}
