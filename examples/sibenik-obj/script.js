var project = new DemoProject();
var pointLight;

project.onInit = function()
{
    initRenderer(this.renderer);
    initCamera(this.camera);
    initScene(this.scene);
};

project.onUpdate = function()
{
    var diff = HX.Float4.subtract(this.camera.position, pointLight.position);
    diff.scale(.05);
    pointLight.position.add(diff);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.useHDR = true;
    project.init(document.getElementById('webglContainer'), options);
};

function initRenderer(renderer)
{
    var ssr = new HX.ScreenSpaceReflections(32);
    ssr.scale = .25;
    ssr.stepSize = 20;
    renderer.localReflections = ssr;

    var ssao = new HX.HBAO(5, 6);
    ssao.strength = 1.0;
    ssao.sampleRadius = 1.0;
    renderer.ambientOcclusion = ssao;
}

function initCamera(camera)
{
    camera.position.set(0.0, 0.0, 0.0);
    camera.nearDistance = .1;
    camera.farDistance = 200.0;

    var flightController = new FlightController();
    flightController.speed = 10.0;
    camera.addComponent(flightController);
}

function initScene(scene)
{
    var ambientLight = new HX.AmbientLight();
    ambientLight.color = new HX.Color(.3,.3,.3);

    var dirLight = new HX.DirectionalLight();
    dirLight.color = new HX.Color(1.0, .9, .7);
    dirLight.direction = new HX.Float4(0.0, -.3, 1.0);
    dirLight.intensity = 1.2;
    dirLight.numCascades = 3;
    dirLight.numShadowSamples = 8;
    dirLight.shadowSoftness = .05;
    dirLight.castShadows = true;

    pointLight = new HX.PointLight();
    pointLight.color = new HX.Color(.6,.8, 1.0);
    pointLight.intensity = 100.0;
    pointLight.position.y = 1;
    pointLight.position.z = 1;

    scene.attach(pointLight);
    scene.attach(ambientLight);
    scene.attach(dirLight);

    var loader = new HX.AssetLoader(HX.OBJ);
    var sibenik = loader.load('resources/sibenik/sibenik.obj');
    scene.attach(sibenik);
}