var project = new DemoProject();

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene);
};

window.onload = function ()
{
    // INIT WITH OPTIONS TO USE HDR
    var options = new HX.InitOptions();
    options.useHDR = true;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.addComponent(new OrbitController());

    // ADD POST-PROCESSING COMPONENTS:
    camera.addComponent(new HX.FXAA());

    var bloom = new HX.BloomEffect(512, 1.0, 8);
    bloom.thresholdLuminance = 1.0;
    camera.addComponent(bloom);

    camera.addComponent(new HX.FilmicToneMapEffect());
}

function initScene(scene)
{
    var ambientLight = new HX.AmbientLight();
    ambientLight.color = new HX.Color(.1, .1, .1);

    var light1 = new HX.PointLight();
    var light2 = new HX.PointLight();
    var light3 = new HX.PointLight();

    light1.intensity = 30;
    light2.intensity = 30;
    light3.intensity = 30;

    light1.color = 0xff2020;
    light2.color = 0x2020ff;
    light3.color = 0x20ff20;

    scene.attach(ambientLight);
    scene.attach(light1);
    scene.attach(light2);
    scene.attach(light3);

    var component = new AnimateOrbitComponent();
    component.axis = new HX.Float4(1.0, 1.0, 1.0);
    component.radius = 2.0;
    light1.addComponent(component);

    component = new AnimateOrbitComponent();
    component.axis = new HX.Float4(-1.0, 1.0, 1.0);
    component.radius = 2.0;
    component.speed = .7;
    light2.addComponent(component);

    component = new AnimateOrbitComponent();
    component.axis = new HX.Float4(1.0, 1.0, 1.0);
    component.radius = 2.0;
    component.speed = .1;
    light3.addComponent(component);

    var textureLoader = new HX.AssetLoader(HX.JPG);
    var albedoMap = textureLoader.load("textures/diffuse.jpg");
    var normalMap = textureLoader.load("textures/normals.png");
    var material = new HX.PBRMaterial();
    material.colorMap = albedoMap;
    material.normalMap = normalMap;
    material.setRoughness(.3);

    var primitive = new HX.SpherePrimitive(
        {
            radius:.25,
            numSegmentsH: 20,
            numSegmentsW: 30
        });

    var modelInstance = new HX.ModelInstance(primitive, material);
    modelInstance.addComponent(new AnimateRotateComponent());
    scene.attach(modelInstance);
}