var project = new DemoProject();

project.onInit = function()
{
    initScene(this.scene);
};

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

function initScene(scene)
{
    // if we don't use any lights, we at least need an ambient light to show something!
    var light = new HX.AmbientLight();
    light.color = 0xffffff;
    scene.attach(light);

    var material = new HX.PBRMaterial();
    material.color = 0xff0000;

    var primitive = HX.SpherePrimitive.create(
        {
            radius:.25
        });

    scene.attach(new HX.ModelInstance(primitive, material));
}