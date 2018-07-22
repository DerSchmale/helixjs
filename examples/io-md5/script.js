/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-specular", "skyboxes/river_rocks/river_rocks_1k.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG_EQUIRECTANGULAR);
    assetLibrary.queueAsset("skybox-irradiance", "skyboxes/river_rocks/river_rocks_irradiance.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG_EQUIRECTANGULAR);
    assetLibrary.queueAsset("floor-albedo", "crytek-sponza/textures_pbr/Sponza_Ceiling_diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("floor-normals", "crytek-sponza/textures_pbr/Sponza_Ceiling_normal.png", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("floor-specular", "crytek-sponza/textures_pbr/Sponza_Ceiling_roughness.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("body-albedo", "bob-md5/bob_body.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("body-specular", "bob-md5/bob_body_s.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("body-normals", "bob-md5/bob_body_local.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("head-albedo", "bob-md5/bob_head.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("head-specular", "bob-md5/bob_head_s.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("head-normals", "bob-md5/bob_head_local.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("helmet-albedo", "bob-md5/bob_helmet.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("helmet-specular", "bob-md5/bob_helmet_s.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("helmet-local", "bob-md5/bob_helmet_local.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("lantern-albedo", "bob-md5/lantern.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("lantern-normals", "bob-md5/lantern_local.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("lantern-top-albedo", "bob-md5/lantern_top.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("lantern-bottom-albedo", "bob-md5/lantern_top_local.png", HX.AssetLibrary.Type.ASSET, HX.PNG);


    assetLibrary.queueAsset("model", "bob-md5/bob_lamp_update.md5mesh", HX.AssetLibrary.Type.ASSET, HX.MD5Mesh);
    assetLibrary.queueAsset("animation-clip", "bob-md5/bob_lamp_update.md5anim", HX.AssetLibrary.Type.ASSET, HX.MD5Anim);

    // There's also the helix-custom file format
    // assetLibrary.queueAsset("model", "hmodel/bob.hmodel", HX.AssetLibrary.Type.ASSET, HX.HMODEL);
    // assetLibrary.queueAsset("animation-clip", "hmodel/bob.hclip", HX.AssetLibrary.Type.ASSET, HX.HCLIP);
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
    options.defaultLightingModel = HX.LightingModel.GGX;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.nearDistance = .3;
    camera.farDistance = 20.0;

    var orbitController = new HX.OrbitController();
    orbitController.lookAtTarget.z = 1.2;
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
    var skyboxIrradianceTexture = assetLibrary.get("skybox-irradiance");

    var lightProbe = new HX.LightProbe(skyboxIrradianceTexture, skyboxSpecularTexture);
    scene.attach(lightProbe);

    var light = new HX.DirectionalLight();
    scene.attach(light);

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var lights = [lightProbe, light];

    var materialBody = new HX.BasicMaterial();
    var materialHead = new HX.BasicMaterial();
    var materialHelmet = new HX.BasicMaterial();
    var materialLantern = new HX.BasicMaterial();
    var materialLanternTop = new HX.BasicMaterial();

    materialBody.colorMap = assetLibrary.get("body-albedo");
    materialBody.specularMap = assetLibrary.get("body-specular");
    materialBody.normalMap = assetLibrary.get("body-normals");
    materialBody.fixedLights = lights;

    materialHead.colorMap = assetLibrary.get("head-albedo");
    materialHead.specularMap = assetLibrary.get("head-specular");
    materialHead.normalMap = assetLibrary.get("head-normals");
    materialHead.fixedLights = lights;

    materialHelmet.colorMap = assetLibrary.get("helmet-albedo");
    materialHelmet.specularMap = assetLibrary.get("helmet-specular");
    materialHelmet.normalMap = assetLibrary.get("helmet-normals");
    materialHelmet.metallicness = 1.0;
    materialHelmet.doubleSided = true;
    materialHelmet.fixedLights = lights;

    materialLantern.colorMap = assetLibrary.get("lantern-albedo");
    materialLantern.normalMap = assetLibrary.get("lantern-normals");
    materialLantern.metallicness = 1.0;
    materialLantern.fixedLights = lights;

    materialLanternTop.colorMap = assetLibrary.get("lantern-top-albedo");
    materialLanternTop.normalMap = assetLibrary.get("lantern-top-normals");
    materialLanternTop.metallicness = 1.0;
    materialLanternTop.doubleSided = true;
    materialLanternTop.fixedLights = lights;

    var model = assetLibrary.get("model");
    var modelInstance = new HX.ModelInstance(model, [materialBody, materialHead, materialHelmet, materialLantern, materialLanternTop]);
    modelInstance.scale.set(.3,.3,.3);
    scene.attach(modelInstance);

    // modelInstance.lookAt(new HX.Float4(1.0, 0.0, 0.0));

    var clip = assetLibrary.get("animation-clip");
    var animation = new HX.SkeletonAnimation(clip);
    animation.transferRootJoint = true;
    modelInstance.addComponent(animation);

    // modelInstance.addComponent(new HX.DebugBoundsComponent());
}