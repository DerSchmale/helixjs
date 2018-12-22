/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var motionBlur;

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.debug = true;
    options.defaultLightingModel = HX.LightingModel.GGX_FULL;
    options.renderMotionVectors = true;
    project.init(document.getElementById('webglContainer'), options);
};

var controller;
project.onInit = function()
{
    controller = new OrbitController();
    controller.radius = 3;
    this.camera.addComponent(controller);
    this.camera.nearDistance = .1;
    this.camera.farDistance = 100.0;

    motionBlur = new HX.MotionBlur(8);
    this.camera.addComponent(motionBlur);

    initScene(this.scene, this.assetLibrary);
    initGui();
};

project.onUpdate = function()
{
    controller.azimuth -= .1;
};

function initScene(scene, assetLibrary)
{
    var light = new HX.Entity();
    light.lookAt(new HX.Float4(-1.0, 2.0, -1.0, 0.0));

    var dirLight = new HX.DirectionalLight();
	dirLight.intensity = 5.0;

	light.addComponent(dirLight);

	scene.attach(light);

	// we're assigning the ambient to the dir light, considering it as the "bounce" coming from this one
    var ambientLight = new HX.AmbientLight();
    ambientLight.intensity = .3;
    light.addComponent(ambientLight);

    var greyMaterial = new HX.BasicMaterial();
    greyMaterial.color = 0xa0a0a0;
    var redMaterial = new HX.BasicMaterial();
    redMaterial.color = 0xff4060;
    var blueMaterial = new HX.BasicMaterial();
    blueMaterial.color = 0x6040ff;

    var primitive = new HX.BoxPrimitive({width: 100, invert:true});
    var entity = new HX.Entity();
    entity.addComponent(new HX.MeshInstance(primitive, greyMaterial));
    scene.attach(entity);

    primitive = new HX.BoxPrimitive();
    entity = new HX.Entity();
    entity.addComponent(new HX.MeshInstance(primitive, redMaterial));

    var rotator = new AnimateRotateComponent();
    rotator.speed = -30.0;
    entity.addComponent(rotator);
    scene.attach(entity);

    primitive = new HX.SpherePrimitive();
    for (var i = 0; i < 10; ++i) {
        var entity = new HX.Entity();
        entity.addComponent(new HX.MeshInstance(primitive, blueMaterial));
        entity.position.set((Math.random() - .5) * 10, (Math.random() - .5) * 10, (Math.random() - .5) * 10);
        scene.attach(entity);
    }
}

function initGui()
{
    var gui = new dat.gui.GUI();
    gui.remember(motionBlur);
    gui.add(motionBlur, "enabled");
    gui.add(motionBlur, "amount").min(0).max(1).step(.01);
    gui.add(motionBlur, "numSamples").min(4).max(64).step(1);
    gui.add(motionBlur, "maxRadius").min(1).max(500).step(1);
}

