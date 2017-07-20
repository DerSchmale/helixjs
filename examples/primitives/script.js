/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    this.camera.addComponent(new HX.OrbitController());

    initScene(this.scene, this.assetLibrary);

    this.renderer.backgroundColor = 0x808080;
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.defaultLightingModel = HX.LightingModel.GGX;
    project.init(document.getElementById('webglContainer'), options);
};

function initScene(scene, assetLibrary)
{
    var ambientLight = new HX.AmbientLight();
    ambientLight.color = new HX.Color(.5,.5,.5);
    var light1 = new HX.PointLight();
    light1.radius = 4;

    scene.attach(ambientLight);
    scene.attach(light1);

    var component = new AnimateOrbitComponent();
    component.axis = new HX.Float4(1.0, 1.0, 1.0);
    component.radius = 2.0;
    light1.addComponent(component);

    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("albedo");
    material.roughness = .15;

    var primitive = new HX.SpherePrimitive(
    {
        radius:.25,
        numSegmentsH: 8,
        numSegmentsW: 10
    });

    var modelInstance = new HX.ModelInstance(primitive, material);
    modelInstance.position.x = -.3;
    modelInstance.position.y = .3;
    scene.attach(modelInstance);

    primitive = new HX.ConePrimitive(
        {
            radius:.19,
            height:.5,
            numSegmentsH: 10,
            numSegmentsW: 20
        });

    modelInstance = new HX.ModelInstance(primitive, material);
    modelInstance.position.x = .3;
    modelInstance.position.y = .3;
    scene.attach(modelInstance);

    primitive = new HX.BoxPrimitive(
        {
            width:.5
        });

    modelInstance = new HX.ModelInstance(primitive, material);
    modelInstance.position.x = -.3;
    modelInstance.position.y = -.3;
    scene.attach(modelInstance);

    primitive = new HX.TorusPrimitive(
        {
            alignment: HX.TorusPrimitive.ALIGN_XY,
            doubleSided: true,
            radius:.25,
            tubeRadius:.05,
            numSegmentsH: 20,
            numSegmentsW: 30
        });

    modelInstance = new HX.ModelInstance(primitive, material);
    modelInstance.position.x = .3;
    modelInstance.position.y = -.3;
    scene.attach(modelInstance);
}