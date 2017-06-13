var project = new DemoProject();

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    var controller = new HX.OrbitController();
    controller.azimuth = Math.PI * .5;
    controller.polar = Math.PI * .5;
    controller.radius = 1.6;

    var tonemap = new HX.ReinhardToneMapEffect(false);
    tonemap.exposure = 1.0;

    camera.addComponents([ controller, tonemap ]);
}

function initScene(scene)
{
    var light = new HX.DirectionalLight();
    light.color = new HX.Color(1.0,.8,.6);
    light.direction = new HX.Float4(0.0, -0.3, -1.0, 0.0);
    light.intensity = .3;
    scene.attach(light);

    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("textures/skybox/skybox_irradiance.hcm");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;
    var lightProbe = new HX.LightProbe(skyboxIrradianceTexture, skyboxSpecularTexture);
    scene.attach(lightProbe);

    var primitive = new HX.SpherePrimitive(
        {
            radius:.075,
            numSegmentsH: 10,
            numSegmentsW: 20
        });

    var lights = [ light, lightProbe ];
    var numX = 10;
    var numY = 7;
    for (var x = 0; x < numX; ++x) {
        for (var y = 0; y < numY; ++y) {
            var material = new HX.BasicMaterial();
            //var gold = new HX.Color(1, 0.765557, 0.336057);
            //material.color = new HX.Color(1, 0.0, 0.0);
            material.roughness = x / (numX - 1.0);
            material.metallicness = y / (numY - 1.0);
            material.lights = lights;

            var modelInstance = new HX.ModelInstance(primitive, material);
            modelInstance.position.x = -((x + .5) / numX - .5) * 3.0;
            modelInstance.position.y = -((y + .5) / numY - .5) * 1.5;
            modelInstance.position.z = 0.0;
            scene.attach(modelInstance);
        }
    }
}