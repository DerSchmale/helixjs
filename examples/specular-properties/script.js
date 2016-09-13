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
    options.lightingModel = HX.GGXLightingModel;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    var controller = new OrbitController();
    controller.azimuth = Math.PI * .5;
    controller.polar = Math.PI * .5;
    controller.radius = 1.6;

    var tonemap = new HX.FilmicToneMapEffect(false);
    tonemap.exposure = 1.0;

    var fxaa = new HX.FXAA();
    camera.addComponents([ controller, tonemap, fxaa ]);
}

function initScene(scene)
{
    var light = new HX.DirectionalLight();
    light.color = new HX.Color(1.0,.8,.6);
    light.direction = new HX.Float4(0.0, -0.3, -1.0, 0.0);
    light.intensity = .2;
    scene.attach(light);

    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("textures/skybox/skybox_irradiance.hcm");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    skybox.setGlobalSpecularProbe(new HX.GlobalSpecularProbe(skyboxSpecularTexture));
    skybox.setGlobalIrradianceProbe(new HX.GlobalIrradianceProbe(skyboxIrradianceTexture));
    scene.skybox = skybox;

    var primitive = new HX.SpherePrimitive(
        {
            radius:.075,
            numSegmentsH: 20,
            numSegmentsW: 30
        });

    var numX = 10;
    var numY = 7;
    for (var x = 0; x < numX; ++x) {
        for (var y = 0; y < numY; ++y) {
            var material = new HX.BasicMaterial();
            //var gold = new HX.Color(1, 0.765557, 0.336057);
            //material.color = new HX.Color(1, 0.0, 0.0);
            material.setRoughness(x / (numX - 1.0));
            material.metallicness = y / (numY - 1.0);

            var modelInstance = new HX.ModelInstance(primitive, material);
            modelInstance.position.x = -((x + .5) / numX - .5) * 3.0;
            modelInstance.position.y = -((y + .5) / numY - .5) * 1.5;
            modelInstance.position.z = 0.0;
            scene.attach(modelInstance);
        }
    }
}