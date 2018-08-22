/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var primitive;

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("albedo", "textures/marble_tiles/marbletiles_diffuse_white.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    document.getElementById("exportInfo").style.display = "block";
    this.camera.addComponent(new OrbitController());
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

function initScene(scene, assetLibrary)
{
    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("albedo");

    primitive = new HX.SpherePrimitive(
        {
            radius:.25
        });

    scene.attach(new HX.Entity(new HX.MeshInstance(primitive, material)));
}

function doExport()
{

    var exporter = new HX.MeshExporter();
    var data = exporter.export(primitive);
    var blob = new Blob([data], {type: "application/octet-stream"});
    saveAs(blob, "model.hmesh");
}