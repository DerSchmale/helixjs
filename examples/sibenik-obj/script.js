/**
 * @author derschmale <http://www.derschmale.com>
 */
var project = new DemoProject();
var spotLight;

window.onload = function ()
{
    var options = new HX.InitOptions();

    var ssao = new HX.HBAO(5, 6);
    ssao.strength = 2.0;
    ssao.sampleRadius = 1.0;
    options.ambientOcclusion = ssao;

    options.shadowFilter = new HX.VarianceShadowFilter();
    // options.debug = true;

    options.defaultLightingModel = HX.LightingModel.GGX;
    options.hdr = true;
    project.init(document.getElementById('webglContainer'), options);
};


project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("model", "sibenik/sibenik.obj", HX.AssetLibrary.Type.ASSET, HX.OBJ);
};

project.onInit = function()
{
    this.renderer.shadowMapSize = 256;
    initCamera(this.camera);
    initScene(this.scene, this.camera, this.assetLibrary);
};

project.onUpdate = function()
{
};

function initCamera(camera)
{
    // camera.position.set(0.0, 0.0, 0.0);
    camera.nearDistance = .1;
    camera.farDistance = 200.0;

    var floatController = new HX.FloatController();
    floatController.speed = 10.0;
    camera.addComponent(floatController);
}

function initScene(scene, camera, assetLibrary)
{
    var ambientLight = new HX.AmbientLight();
    ambientLight.intensity = .1;

    spotLight = new HX.SpotLight();
    spotLight.castShadows = true;
    spotLight.color = new HX.Color(.6,.8, 1.0);
    spotLight.intensity = 300.0;
    spotLight.position.z = 1;
    spotLight.position.x = .5;
    spotLight.lookAt(new HX.Float4(0.0, 4.0, 0.0));
    spotLight.innerAngle = 0.2;
    spotLight.radius = 20;
    spotLight.outerAngle = 1.0;

    camera.attach(spotLight);
    scene.attach(ambientLight);

    scene.attach(assetLibrary.get("model"));

    var axes = new HX.DebugAxes();
    scene.attach(axes);
}