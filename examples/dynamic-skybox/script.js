/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var skybox;
var sun;

project.queueAssets = function(assetLibrary)
{

};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.debug = true;
    project.init(document.getElementById('webglContainer'), options);
};

project.onInit = function()
{
    var controller = new OrbitController();
    this.camera.addComponent(controller);

    initScene(this.scene, this.assetLibrary);
    initGUI();

    // this.camera.addComponent(new HX.FilmicToneMapping(true));
    // this.camera.addComponent(new HX.Bloom());
};


function initScene(scene, assetLibrary)
{
    sun = new HX.Entity();
    sun.addComponent(new SunComponent());
    scene.attach(sun);

    skybox = new HX.DynamicSkybox(sun.components.light[0]);
    scene.skybox = skybox;

    var debugAxes = new HX.DebugAxes();
    scene.attach(debugAxes);
}

function initGUI()
{
    var sunComp = sun.components.sun[0];
    var gui = new dat.gui.GUI();
    gui.remember(sun.components.sun);
    gui.remember(skybox);
    gui.add(sunComp, "timeOfDay").min(0).max(24).step(.0001);
    gui.add(sunComp, "dayOfYear").min(0).max(365).step(.0001);
    gui.add(sunComp, "latitude").min(-90).max(90).step(.0001);
    gui.add(skybox, "mieCoefficient").min(0.0).max(.9).step(.0001);
    gui.add(skybox, "mieScattering").min(0.0).max(1.0e-4).step(1e-7);
}
