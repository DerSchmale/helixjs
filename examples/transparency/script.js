/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox", "skyboxes/river_rocks/river_rocks_1k.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG_EQUIRECTANGULAR);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
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

function initScene(scene, assetLibrary)
{
    var skyboxTexture = assetLibrary.get("skybox");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxTexture);
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(null, skyboxTexture);
    scene.attach(lightProbe);

    var light = new HX.DirectionalLight();
    light.intensity = .15;

	light = new HX.Entity(light);
    light.lookAt(new HX.Float4(-1.0, -1.0, -1.0));
    scene.attach(light);

	var entity = new HX.Entity();
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

	entity.addComponent(new HX.MeshInstance(primitive, material));

    // the second layer forms the reflective layer
    material = new HX.BasicMaterial();
    material.blendState = HX.BlendState.ADD;
    material.color = HX.Color.BLACK;
    material.lightingModel = HX.LightingModel.GGX;
    material.renderOrder = 50;  // be sure the render after first layer
    material.roughness = .01;

	entity.addComponent(new HX.MeshInstance(primitive, material));
    scene.attach(entity);
}