/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var skyboxTexture;
var sun;
var cubeSize = 1024;
var cubeRenderer, cubeScene, cubeCam, cubeSun;

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-material", "dynamic-skybox/materials/dynamic-skybox.hmat", HX.AssetLibrary.Type.ASSET, HX.HMAT);

};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.debug = true;
    project.init(document.getElementById('webglContainer'), options);
};

project.onInit = function()
{
    var controller = new OrbitController();
    this.camera.addComponent(controller);

    initSun(this.scene);
    initSkybox(this.assetLibrary);
    initScene(this.scene, this.assetLibrary);
    initGUI();

    this.camera.addComponent(new HX.Bloom());
};

function initSun(scene)
{
    sun = new HX.Entity();
    sun.addComponent(new SunComponent());
    scene.attach(sun);
}

function initSkybox(assetLibrary)
{
    skyboxTexture = new HX.TextureCube();
    skyboxTexture.initEmpty(cubeSize, HX.TextureFormat.RGBA, HX.capabilities.HDR_DATA_TYPE);
    cubeRenderer = new HX.CubeRenderer(skyboxTexture);
    cubeScene = new HX.Scene();
    cubeCam = new HX.CubeCamera();

    var cube = new HX.BoxPrimitive({invert: true});
    var material = assetLibrary.get("skybox-material");
    var entity = new HX.Entity();
    entity.addComponent(new HX.MeshInstance(cube, material));
    cubeScene.attach(entity);

    cubeSun = new HX.Entity();
    cubeSun.addComponent(sun.components.light[0].clone());
    cubeScene.attach(cubeSun);

    renderSkybox();
}

function renderSkybox()
{
    cubeSun.matrix = sun.matrix;
    cubeRenderer.render(cubeCam, cubeScene);
}

function initScene(scene, assetLibrary)
{
    // debug:
    // var prim = new HX.SpherePrimitive({radius: .01});
    // var mat = new HX.BasicMaterial();
    // sun.addComponent(new HX.MeshInstance(prim, mat));

    // use it as skybox
    var skybox = new HX.Skybox(skyboxTexture);
    scene.skybox = skybox;

    var debugAxes = new HX.DebugAxes();
    scene.attach(debugAxes);
}

function initGUI()
{
    var sunComp = sun.components.sun[0];
    var gui = new dat.gui.GUI();
    gui.remember(sun.components.sun);
    gui.add(sunComp, "timeOfDay").min(0).max(24).onChange(renderSkybox).step(.0001);
    gui.add(sunComp, "dayOfYear").min(0).max(365).onChange(renderSkybox).step(.0001);
    gui.add(sunComp, "latitude").min(-90).max(90).onChange(renderSkybox).step(.0001);
}
