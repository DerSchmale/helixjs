/**
 * @author derschmale <http://www.derschmale.com>
 */

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
    var material = new HX.BasicMaterial();
    material.color = 0xff0000;

    var primitive = new HX.SpherePrimitive(
        {
            radius: .25
        });

    scene.attach(new HX.ModelInstance(primitive, material));
}