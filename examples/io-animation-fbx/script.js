/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene);
};

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

function initCamera(camera)
{
    camera.nearDistance = .1;
    camera.farDistance = 10.0;

    var orbitController = new HX.OrbitController();
    orbitController.lookAtTarget.y = 2.0;
    orbitController.speed = 10.0;
    orbitController.radius = 1.0;
    orbitController.maxRadius = 100.0;
    camera.addComponent(orbitController);
}

function initScene(scene)
{
    // textures are from http://www.alexandre-pestana.com/pbr-textures-sponza/
    var textureLoader = new HX.AssetLoader(HX.JPG);
    var colorMap = textureLoader.load("textures/Sponza_Ceiling_diffuse.jpg");
    var normalMap = textureLoader.load("textures/Sponza_Ceiling_normal.png");
    var specularMap = textureLoader.load("textures/Sponza_Ceiling_roughness.jpg");
    var material = new HX.BasicMaterial();
    material.colorMap = colorMap;
    material.normalMap = normalMap;
    material.specularMap = specularMap;

    var primitive = new HX.PlanePrimitive(
        {
            numSegmentsW: 10,
            numSegmentsH: 10,
            width: 50,
            height: 50,
            scaleU: 50,
            scaleV: 50
        });

    var floorInstance = new HX.ModelInstance(primitive, material);
    scene.attach(floorInstance);

    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var loader = new HX.AssetLoader(HX.FBX);

    // using the Signal approach for this demo
    loader.onComplete.bind(function(node)
    {
        node.scale.set(.1,.1,.1);
        node.position.x = -node.worldBounds.center.x;
        node.position.z = -node.worldBounds.center.z;
        node.position.y = -node.worldBounds.minimum.y;

        scene.attach(node);

        // something wrong with this fbx file in that the textures aren't connected to the material

        var material = node.findMaterialByName("wire_028089177");
        var textureLoader = new HX.AssetLoader(HX.JPG);
        material.colorMap = textureLoader.load("model/zombie/diffuse.jpg");
        material.normalMap = textureLoader.load("model/zombie/normal.jpg");
        material.specularMap = textureLoader.load("model/zombie/specular.jpg");
    });

    loader.load("model/zombie/walk.FBX");
}