/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new MultiDemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/brick_wall/diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("normals", "textures/brick_wall/normals.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("specular", "textures/brick_wall/specular.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    var camera1 = new HX.PerspectiveCamera();
    var camera2 = new HX.PerspectiveCamera();
    var camera3 = new HX.PerspectiveCamera();
    camera3.position.set(0, 1, 0);
    camera3.lookAt(HX.Float4.ORIGIN_POINT);
    var scene = new HX.Scene();

    initScene(scene, this.assetLibrary);

    scene.attach(camera1);
    scene.attach(camera2);
    camera1.addComponent(new OrbitController());

    var bloom = new HX.Bloom(50, 5.0, 2);
    bloom.thresholdLuminance = .5;
    camera2.addComponents([bloom]);

    var view1 = new HX.View(scene, camera1,.01,.1,.48,.8);
    var view2 = new HX.View(scene, camera2,.51,.1,.48,.4);
    var view3 = new HX.View(scene, camera3,.51,.55,.48,.35);
    this.addView(view1);
    this.addView(view2);
    this.addView(view3);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.defaultLightingModel = HX.LightingModel.GGX;
    project.init(document.getElementById('webglContainer'), options);
};

function initScene(scene, assetLibrary)
{
    var ambientLight = new HX.AmbientLight();
    ambientLight.color = new HX.Color(.1, .1,.1);

    var light1 = new HX.PointLight();
    var light2 = new HX.PointLight();
    var light3 = new HX.PointLight();
    light1.color = 0xff2020;
    light2.color = 0x2020ff;
    light3.color = 0x20ff20;

    light1.intensity = 20.0;
    light2.intensity = 20.0;
    light3.intensity = 20.0;

	// convert to entity
	ambientLight = new HX.Entity(ambientLight);
	light1 = new HX.Entity(light1);
	light2 = new HX.Entity(light2);
	light3 = new HX.Entity(light3);

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
    material.roughness = .15;
    material.roughnessRange = .12;

    var primitive = new HX.SpherePrimitive(
        {
            radius:.25,
            numSegmentsH: 20,
            numSegmentsW: 30
        });

    var model = new HX.Entity(new HX.MeshInstance(primitive, material));
    model.addComponent(new AnimateRotateComponent());
    scene.attach(model);
}