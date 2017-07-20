/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/marbletiles_diffuse_white.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    this.camera.addComponent(new HX.OrbitController());
    this.camera.nearDistance = .1;
    this.camera.farDistance = 1.0;

    initScene(this.scene, this.assetLibrary);
};

function initScene(scene, assetLibrary)
{
    var light = new HX.DirectionalLight();
    light.direction = new HX.Float4(-1.0, -1.0, -1.0, 0.0);
    light.intensity = 5.0;
    scene.attach(light);

    var ambientLight = new HX.AmbientLight();
    ambientLight.intensity = .02;
    scene.attach(ambientLight);

    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("albedo");
    material.lightingModel = HX.LightingModel.GGX;

    var primitive = new HX.SpherePrimitive(
        {
            radius:.25,
            numSegmentsH: 20,
            numSegmentsW: 30
        });

    scene.attach(new HX.ModelInstance(primitive, material));
}