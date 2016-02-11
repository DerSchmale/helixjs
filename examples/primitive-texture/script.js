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
    // add ambient light so we can actually see something
    var light = new HX.AmbientLight();
    light.color = 0xffffff;
    scene.attach(light);

    var textureLoader = new HX.AssetLoader(HX.JPG);
    var texture = textureLoader.load("textures/marbletiles_diffuse_white.jpg");
    var material = new HX.PBRMaterial();
    material.colorMap = texture;

    var primitive = HX.SpherePrimitive.create(
        {
            radius:.25
        });

    scene.attach(new HX.ModelInstance(primitive, material));
}