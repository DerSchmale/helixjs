/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.fileMap = {
        "Muro_body_dm.tga": "Muro_body_dm.jpg",
        "Muro_body_nm.tga": "Muro_body_nm.png",
        "Muro_body_sm.tga": "Muro_body_sm.jpg",
        "Muro_head_dm.tga": "Muro_head_dm.jpg",
        "Muro_head_nm.tga": "Muro_head_nm.png",
        "Muro_head_sm.tga": "Muro_head_sm.jpg"
    };

    assetLibrary.queueAsset("skybox-specular", "textures/skybox/skybox_specular.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("floor-albedo", "textures/Sponza_Ceiling_diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("floor-normals", "textures/Sponza_Ceiling_normal.png", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("floor-specular", "textures/Sponza_Ceiling_roughness.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("model", "model/muro.fbx", HX.AssetLibrary.Type.ASSET, HX.FBX);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

function initCamera(camera)
{
    camera.nearDistance = .3;
    camera.farDistance = 20.0;

    var orbitController = new HX.OrbitController();
    orbitController.lookAtTarget.y = 1.2;
    orbitController.speed = 10.0;
    orbitController.radius = 2.0;
    orbitController.maxRadius = 100.0;
    camera.addComponent(orbitController);
}

function initScene(scene, assetLibrary)
{
    // textures are from http://www.alexandre-pestana.com/pbr-textures-sponza/
    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("floor-albedo");
    material.normalMap = assetLibrary.get("floor-normals");
    material.specularMap = assetLibrary.get("floor-specular");

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

    var skyboxSpecularTexture = assetLibrary.get("skybox-specular");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var node = assetLibrary.get("model");
    var bounds = node.worldBounds;
    node.position.y = -bounds.minimum.y;
    node.scale.set(.01, .01, .01);   // back to meters
    scene.attach(node);
}