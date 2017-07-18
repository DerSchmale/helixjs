/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-specular", "textures/skybox/skybox_specular.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("floor-albedo", "textures/Sponza_Ceiling_diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("floor-normals", "textures/Sponza_Ceiling_normal.png", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("floor-specular", "textures/Sponza_Ceiling_roughness.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("body-albedo", "model/bob_body.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("body-specular", "model/bob_body_s.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("body-normals", "model/bob_body_local.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("head-albedo", "model/bob_head.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("head-specular", "model/bob_head_s.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("head-normals", "model/bob_head_local.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("helmet-albedo", "model/bob_helmet.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("helmet-specular", "model/bob_helmet_s.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("helmet-local", "model/bob_helmet_local.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("lantern-albedo", "model/lantern.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("lantern-normals", "model/lantern_local.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("lantern-top-albedo", "model/lantern_top.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("lantern-bottom-albedo", "model/lantern_top_local.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("model", "model/bob_lamp_update.md5mesh", HX.AssetLibrary.Type.ASSET, HX.MD5Mesh);
    assetLibrary.queueAsset("animation-clip", "model/bob_lamp_update.md5anim", HX.AssetLibrary.Type.ASSET, HX.MD5Anim);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.maxSkeletonJoints = 39;
    options.useSkinningTexture = true;
    project.init(document.getElementById('webglContainer'), options);
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

    var materialBody = new HX.BasicMaterial();
    var materialHead = new HX.BasicMaterial();
    var materialHelmet = new HX.BasicMaterial();
    var materialLantern = new HX.BasicMaterial();
    var materialLanternTop = new HX.BasicMaterial();

    materialBody.colorMap = assetLibrary.get("body-albedo");
    materialBody.specularMap = assetLibrary.get("body-specular");
    materialBody.normalMap = assetLibrary.get("body-normals");

    materialHead.colorMap = assetLibrary.get("head-albedo");
    materialHead.specularMap = assetLibrary.get("head-specular");
    materialHead.normalMap = assetLibrary.get("head-normals");

    materialHelmet.colorMap = assetLibrary.get("helmet-albedo");
    materialHelmet.specularMap = assetLibrary.get("helmet-specular");
    materialHelmet.normalMap = assetLibrary.get("helmet-normals");
    materialHelmet.metallicness = 1.0;
    materialHelmet.doubleSided = true;

    materialLantern.colorMap = assetLibrary.get("lantern-albedo");
    materialLantern.normalMap = assetLibrary.get("lantern-normals");
    materialLantern.metallicness = 1.0;

    materialLanternTop.colorMap = assetLibrary.get("lantern-top-albedo");
    materialLanternTop.normalMap = assetLibrary.get("lantern-top-normals");
    materialLanternTop.metallicness = 1.0;
    materialLanternTop.doubleSided = true;

    var model = assetLibrary.get("model");
    var modelInstance = new HX.ModelInstance(model, [materialBody, materialHead, materialHelmet, materialLantern, materialLanternTop]);
    modelInstance.scale.set(.3,.3,.3);
    scene.attach(modelInstance);

    var clip = assetLibrary.get("animation-clip");
    var animation = new HX.SkeletonAnimation(clip);
    animation.transferRootJoint = true;
    modelInstance.addComponent(animation);
}