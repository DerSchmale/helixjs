var project = new DemoProject();

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    var controller = new OrbitController();
    controller.azimuth = Math.PI * .5;
    controller.polar = Math.PI * .5;
    controller.radius = 1.5;
    camera.addComponent(controller);
}

function initScene(scene)
{
    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("textures/skybox/skybox_irradiance.hcm");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    skybox.setGlobalSpecularProbe(new HX.GlobalSpecularProbe(skyboxSpecularTexture));
    skybox.setGlobalIrradianceProbe(new HX.GlobalIrradianceProbe(skyboxIrradianceTexture));
    scene.skybox = skybox;

    var light = new HX.DirectionalLight();
    light.intensity = .15;
    scene.attach(light);

    var primitive = new HX.SpherePrimitive(
        {
            numSegmentsH: 20,
            numSegmentsW: 30
        });

    var material = new HX.PBRMaterial();
    material.alpha = 1.0;
    material.color = HX.Color.BLACK;
    material.transparencyMode = HX.TransparencyMode.ADDITIVE;
    material.setRoughness(.01);

    scene.attach(new HX.ModelInstance(primitive, material));
}