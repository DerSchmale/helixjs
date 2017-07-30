/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/brick_wall/diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("normals", "textures/brick_wall/normals.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("specular", "textures/brick_wall/specular.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
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
    options.deferredLightingModel = HX.LightingModel.GGX;
    project.init(document.getElementById('webglContainer'), options);
};

function initScene(scene, assetLibrary)
{
    var ambientLight = new HX.AmbientLight();
    ambientLight.color = new HX.Color(.5,.5,.5);
    var light1 = new HX.PointLight();
    var light2 = new HX.PointLight();
    var light3 = new HX.PointLight();
    light1.radius = 4;
    light2.radius = 4;
    light3.radius = 4;
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

    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("albedo");
    material.normalMap = assetLibrary.get("normals");
    material.specularMap = assetLibrary.get("specular");
    material.roughness = .6;
    material.roughnessRange = .2;
    // material.fixedLights = [ light1, light2, light3 ];

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