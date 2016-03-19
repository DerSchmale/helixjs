var project = new DemoProject();

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.useHDR = true;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.position.set(0.0, 0.0, 0.0);
    camera.nearDistance = .1;
    camera.farDistance = 100.0;

    var flightController = new FlightController();
    flightController.speed = 5.0;
    camera.addComponent(flightController);
}

function initScene(scene)
{
    for (var i = 0; i < 200; ++i) {
        var light = new HX.PointLight();
        light.radius = 7;
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
    }

    var textureLoader = new HX.AssetLoader(HX.JPG);
    var texture = textureLoader.load("textures/marbletiles_diffuse_white.jpg");
    var material = new HX.PBRMaterial();
    material.colorMap = texture;
    material.roughness = 0.05;

    var primitive = HX.SpherePrimitive.create(
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

    primitive = HX.SpherePrimitive.create(
        {
            radius: 16,
            invert:true,
            numSegmentsH: 30,
            numSegmentsW: 45,
            scaleU: 20,
            scaleV: 20
        });
    var instance = new HX.ModelInstance(primitive, material);
    scene.attach(instance);
}