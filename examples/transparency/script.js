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
    var controller = new HX.OrbitController();
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
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(null, skyboxTexture);
    scene.attach(lightProbe);

    var light = new HX.DirectionalLight();
    light.intensity = .15;
    scene.attach(light);

    var primitive = new HX.SpherePrimitive(
        {
            numSegmentsH: 20,
            numSegmentsW: 30
        });

    // the first layer forms the diffuse absorption
    var material = new HX.BasicMaterial();
    material.blendState = HX.BlendState.MULTIPLY;
    material.color = new HX.Color(.5,.1,.1);
    material.lightingModel = HX.LightingModel.Unlit;

    scene.attach(new HX.ModelInstance(primitive, material));

    // the second layer forms the reflective layer
    material = new HX.BasicMaterial();
    material.blendState = HX.BlendState.ADD;
    material.color = HX.Color.BLACK;
    material.lights = [ lightProbe ];
    material.renderOrder = 50;  // be sure the render after first layer
    material.roughness = .01;
    scene.attach(new HX.ModelInstance(primitive, material));
}