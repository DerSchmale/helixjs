var project = new DemoProject();

project.onInit = function()
{
    this.camera.addComponent(new OrbitController());
    initScene(this.scene);
};

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

function initScene(scene)
{
    var textureLoader = new HX.AssetLoader(HX.JPG);
    var texture = textureLoader.load("textures/marbletiles_diffuse_white.jpg");
    var material = new HX.BasicMaterial();
    material.colorMap = texture;

    var primitive = new HX.SpherePrimitive(
        {
            radius:.25
        });

    scene.attach(new HX.ModelInstance(primitive, material));
}