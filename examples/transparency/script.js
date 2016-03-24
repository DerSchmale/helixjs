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
    var controller = new OrbitController();
    controller.azimuth = Math.PI * .5;
    controller.polar = Math.PI * .5;
    controller.radius = 1.5;
    camera.addComponent(controller);

    var tonemap = new HX.FilmicToneMapEffect(false);
    tonemap.exposure = 1.0;
    camera.addComponent(tonemap);
}

function initScene(scene)
{
    var light = new HX.DirectionalLight();
    light.intensity = .15;
    light.color = 0xffffff;
    scene.attach(light);

    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("textures/skybox/skybox_irradiance.hcm");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    skybox.setGlobalSpecularProbe(new HX.GlobalSpecularProbe(skyboxSpecularTexture));
    skybox.setGlobalIrradianceProbe(new HX.GlobalIrradianceProbe(skyboxIrradianceTexture));
    scene.skybox = skybox;

    var material = new HX.PBRMaterial();
    material.color = 0x801010;
    material.transparent = true;
    material.refract = true;
    material.refractiveRatio = 1.0 / 1.33;
    material.setRoughness(.04);

    var primitive = new HX.SpherePrimitive(
        {
            numSegmentsH: 40,
            numSegmentsW: 60
        });

    scene.attach(new HX.ModelInstance(primitive, material));
}