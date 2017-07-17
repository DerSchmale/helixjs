/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var indicator;

project.onInit = function()
{
    initScene(this.scene);
    var self = this;
    HX.META.TARGET_CANVAS.addEventListener("mousemove", function(evt) { self._onMouseMove.call(self, evt); });
};

project._onMouseMove = function(event)
{
    // TODO: This should become an interaction Component!
    // (could store this in a System, so we can have a localized RayCaster?)

    var canvas = HX.META.TARGET_CANVAS;
    var ray = this.camera.getRay(
        event.clientX / canvas.clientWidth * 2.0 - 1.0,
        -(event.clientY / canvas.clientHeight * 2.0 - 1.0)
    );

    var rayCaster = new HX.RayCaster();
    var hitData = rayCaster.cast(ray, this.scene);

    if (hitData) {
        indicator.visible = true;
        indicator.position.copyFrom(hitData.point);
    }
    else {
        indicator.visible = false;
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

    var primitive = new HX.SpherePrimitive(
        {
            radius: .25
        });

    scene.attach(new HX.ModelInstance(primitive, material));


    material = new HX.BasicMaterial();
    material.color = 0xffff00;

    primitive = new HX.SpherePrimitive(
        {
            radius: .01
        });

    indicator = new HX.ModelInstance(primitive, material);
    indicator.visible = false;
    scene.attach(indicator);
}