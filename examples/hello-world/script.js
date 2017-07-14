/**
 * This demo shows how to initialize Helix from scratch. The other demos basically hide stuff in a shared framework
 * to make the relevant things easier to follow.
 *
 * @author derschmale <http://www.derschmale.com>
 */

var renderer;
var camera;
var scene;

window.onload = function()
{
    HX.init(document.getElementById('webglContainer'));

    renderer = new HX.Renderer();
    scene = new HX.Scene();
    camera = new HX.PerspectiveCamera();

    // add a the Component OrbitController to the Camera Entity to update the camera every frame
    var orbitController = new HX.OrbitController();
    camera.addComponent(orbitController);

    var material = new HX.BasicMaterial();
    material.color = 0xff0000;

    var primitive = new HX.SpherePrimitive(
        {
            radius: .25
        });

    scene.attach(new HX.ModelInstance(primitive, material));

    // required to register camera as an Entity in the Scene
    scene.attach(camera);

    // register to the HX.onFrame Signal for frame updates
    HX.onFrame.bind(update);
};

window.onresize = function()
{
    resizeCanvas();
};

function update(dt)
{
    renderer.render(camera, scene, dt);
}

function resizeCanvas()
{
    // helix does NOT adapt the size automatically, so you can have complete control over the resolution
    var dpr = window.devicePixelRatio || 1;
    var canvas = document.getElementById('webglContainer');
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
}