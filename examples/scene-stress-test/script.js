/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/marbletiles_diffuse_white.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    // this will make sure the GGX model is calculated deferredly
    options.defaultLightingModel = HX.LightingModel.GGX;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.position.set(0.0, 0.0, 0.0);
    camera.nearDistance = .1;
    camera.farDistance = 100.0;

    var floatController = new HX.FloatController();
    floatController.speed = 5.0;
    camera.addComponent(floatController);
}

function initScene(scene, assetLibrary)
{
    // TODO: Do this dynamically
    var lights = [ ];
    for (var i = 0; i < 200; ++i) {
        var light = new HX.PointLight();
        light.radius = 5;
        scene.attach(light);
        light.position.set(
            (Math.random() - .5) * 20,
            (Math.random() - .5) * 20,
            (Math.random() - .5) * 20
        );

        light.color.set(
            Math.random(),
            Math.random(),
            Math.random()
        );
        light.intensity = 3.1415;
        lights.push(light);
    }

    // TODO: Should num cascades be initialized as a Helix option?
    // that way, things can be optimized in the shader
    var dirLight = new HX.DirectionalLight();
    dirLight.intensity = .1;
    dirLight.direction = new HX.Float4(-1.0, -1.0, -1.0);
    lights.push(dirLight);

    scene.attach(dirLight);

    var material = new HX.BasicMaterial();
    // the difference is, we don't assign lights, but we do assign a lighting model
    material.colorMap = assetLibrary.get("albedo");
    material.roughness = 0.05;

    var material2 = new HX.BasicMaterial();
    material2.colorMap = assetLibrary.get("albedo");
    material2.roughness = 0.2;
    // use non-default lighting model to cause forward lighting
    material2.lightingModel = HX.LightingModel.BlinnPhong;

    var primitive = new HX.SpherePrimitive(
        {
            radius:.24,
            numSegmentsH: 10,
            numSegmentsW: 15
        });

    var spacing = 2;
    for (var x = -5; x <= 5; ++x) {
        for (var y = -5; y <= 5; ++y) {
            for (var z = -5; z <= 5; ++z) {
                var instance = new HX.ModelInstance(primitive, material);
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
    var instance = new HX.ModelInstance(primitive, material);
    scene.attach(instance);
}