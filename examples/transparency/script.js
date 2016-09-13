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
    var envMapLoader = new HX.AssetLoader(HX.JPG_EQUIRECTANGULAR);
    var skyboxTexture = envMapLoader.load("textures/skybox/river_rocks_1k.jpg");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxTexture);
    skybox.setGlobalSpecularProbe(new HX.GlobalSpecularProbe(skyboxTexture));
    scene.skybox = skybox;

    var light = new HX.DirectionalLight();
    light.intensity = .15;
    scene.attach(light);

    var primitive = new HX.SpherePrimitive(
        {
            numSegmentsH: 20,
            numSegmentsW: 30
        });

    var material = new HX.BasicMaterial();
    material.alpha = 1.0;
    material.color = HX.Color.BLACK;
    material.transparencyMode = HX.TransparencyMode.ADDITIVE;
    material.setRoughness(.01);

    scene.attach(new HX.ModelInstance(primitive, material));
}