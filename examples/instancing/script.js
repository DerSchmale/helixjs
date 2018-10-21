/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var batch;

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/brick_wall/diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("normals", "textures/brick_wall/normals.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    this.camera.addComponent(new OrbitController());
    this.camera.nearDistance = .1;
    this.camera.farDistance = 100.0;

    initScene(this.scene, this.assetLibrary);
};

function initScene(scene, assetLibrary)
{
    var light = new HX.Entity();
    light.lookAt(new HX.Float4(-1.0, 1.0, -1.0, 0.0));

    var dirLight = new HX.DirectionalLight();
	dirLight.intensity = 5.0;

	light.addComponent(dirLight);

	scene.attach(light);

	// we're assigning the ambient to the dir light, considering it as the "bounce" coming from this one
    var ambientLight = new HX.AmbientLight();
    ambientLight.intensity = .02;
    light.addComponent(ambientLight);

    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("albedo");
    material.normalMap = assetLibrary.get("normals");
    material.lightingModel = HX.LightingModel.GGX;

    var primitive = new HX.SpherePrimitive(
        {
            radius:.25,
            numSegmentsH: 10,
            numSegmentsW: 15
        });

    var entity = new HX.Entity();
    batch = new HX.MeshBatch(primitive, material);
    entity.addComponent(batch);
    scene.attach(entity);

    var tr = new HX.Transform();
    for (var i = 0; i < 1000; ++i) {
        tr.position.set((Math.random() - .5) * 30, (Math.random() - .5) * 30, (Math.random() - .5) * 30);
        batch.createInstance(tr);
    }
}