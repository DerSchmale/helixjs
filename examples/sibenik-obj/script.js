/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var pointLight;

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("model", "resources/sibenik/sibenik.obj", HX.AssetLibrary.Type.ASSET, HX.OBJ);
};

project.onInit = function()
{
    initRenderer(this.renderer);
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
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
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.hdr = true;
    project.init(document.getElementById('webglContainer'), options);
};

function initRenderer(renderer)
{
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

    var floatController = new HX.FloatController();
    floatController.speed = 10.0;
    camera.addComponent(floatController);
}

function initScene(scene, assetLibrary)
{
    var ambientLight = new HX.AmbientLight();
    ambientLight.color = new HX.Color(.3,.3,.3);

    pointLight = new HX.PointLight();
    pointLight.color = new HX.Color(.6,.8, 1.0);
    pointLight.intensity = 100.0;
    pointLight.position.y = 1;
    pointLight.position.z = 1;

    scene.attach(pointLight);
    scene.attach(ambientLight);

    scene.attach(assetLibrary.get("model"));
}