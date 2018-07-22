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
    assetLibrary.queueAsset("hellknight-albedo", "hellknight/hellknight_diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("hellknight-specular", "hellknight/hellknight_specular.png", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("hellknight-normals", "hellknight/hellknight_normals.png", HX.AssetLibrary.Type.ASSET, HX.PNG);

    // These models are not available freely
    assetLibrary.queueAsset("model", "hellknight/hellknight.md5mesh", HX.AssetLibrary.Type.ASSET, HX.MD5Mesh);
    assetLibrary.queueAsset("animation-clip", "hellknight/idle2.md5anim", HX.AssetLibrary.Type.ASSET, HX.MD5Anim);
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

    var material = new HX.BasicMaterial();

    material.colorMap = assetLibrary.get("hellknight-albedo");
    material.specularMap = assetLibrary.get("hellknight-specular");
    material.normalMap = assetLibrary.get("hellknight-normals");
    material.roughness = .3;
    material.roughnessRange = .32;
    material.fixedLights = lights;

    var model = assetLibrary.get("model");
    var modelInstance = new HX.ModelInstance(model, material);
    // material._setUseSkinning(false);
    modelInstance.scale.set(.015,.015,.015);
    scene.attach(modelInstance);

    // modelInstance.lookAt(new HX.Float4(1.0, 0.0, 0.0));

    var clip = assetLibrary.get("animation-clip");
    var animation = new HX.SkeletonAnimation(clip);
    animation.transferRootJoint = true;
    modelInstance.addComponent(animation);

    // modelInstance.addComponent(new HX.DebugBoundsComponent());
}