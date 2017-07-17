/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var indicator;

project.onInit = function()
{
    initScene(this.scene);

    this.camera.addComponent(new HX.OrbitController());

    var self = this;
    HX.META.TARGET_CANVAS.addEventListener("mousemove", function(evt) { self._onMouseMove.call(self, evt); });
};

project._onMouseMove = function(event)
{
    // TODO:
    // For now, raycasting happens manually
    // We may want a set of interaction components
    // fe: a simple Clickable component etc

    var canvas = HX.META.TARGET_CANVAS;
    var ray = this.camera.getRay(
        event.clientX / canvas.clientWidth * 2.0 - 1.0,
        -(event.clientY / canvas.clientHeight * 2.0 - 1.0)
    );

    indicator.visible = false;

    var rayCaster = new HX.RayCaster();
    var hitData = rayCaster.cast(ray, this.scene);

    if (hitData) {
        indicator.visible = true;
        indicator.position.copyFrom(hitData.point);
    }
};

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

function initScene(scene)
{
    var material = new HX.BasicMaterial();
    material.color = 0xff0000;

    var primitive = new HX.BoxPrimitive(
        {
            width: .5
        });


    var instance = new HX.ModelInstance(primitive, material);
    instance.name = "Sphere";
    instance.rotation.fromEuler(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.attach(instance);


    material = new HX.BasicMaterial();
    material.color = 0xffff00;

    primitive = new HX.SpherePrimitive(
        {
            radius: .01
        });

    indicator = new HX.ModelInstance(primitive, material);
    indicator.visible = false;
    indicator.name = "Indicator";
    scene.attach(indicator);
}