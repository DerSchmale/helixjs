/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/brick_wall/diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("normals", "textures/brick_wall/normals.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    // INIT WITH OPTIONS TO USE HDR
    var options = new HX.InitOptions();
    options.hdr = true;
    options.defaultLightingModel = HX.LightingModel.GGX;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.addComponent(new OrbitController());

    // ADD POST-PROCESSING COMPONENTS:
    //camera.addComponent(new HX.FXAA());

    var bloom = new HX.Bloom(128, 1.0);
    bloom.thresholdLuminance = .5;
    camera.addComponent(bloom);

    camera.addComponent(new HX.FilmicToneMapping());
}

function initScene(scene, assetLibrary)
{
    var ambientLight = new HX.AmbientLight();
    ambientLight.color = new HX.Color(.1, .1, .1);

    var light1 = new HX.PointLight();
    var light2 = new HX.PointLight();
    var light3 = new HX.PointLight();

    light1.intensity = 120;
    light2.intensity = 160;
    light3.intensity = 160;

    light1.color = 0xff2020;
    light2.color = 0x2020ff;
    light3.color = 0x20ff20;

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
    material.roughness = .3;

    var primitive = new HX.SpherePrimitive(
        {
            radius:.25,
            numSegmentsH: 20,
            numSegmentsW: 30
        });

    var entity = new HX.Entity();
    entity.addComponent(new HX.MeshInstance(primitive, material));
    entity.addComponent(new AnimateRotateComponent());
    scene.attach(entity);
}