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
    assetLibrary.queueAsset("model", "zombie/walk.FBX", HX.AssetLibrary.Type.ASSET, HX.FBX);
    assetLibrary.queueAsset("zombie-diffuse", "zombie/diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("zombie-normal", "zombie/normal.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("zombie-specular", "zombie/specular.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.maxSkeletonJoints = 128;
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

    var model = assetLibrary.get("model");

    model.scale.set(.1,.1,.1);
    model.position.x = -model.worldBounds.center.x;
    model.position.z = -model.worldBounds.center.z;
    model.position.y = -model.worldBounds.minimum.y;

    scene.attach(model);

    // TODO: Fix FBX animations

    // something wrong with this fbx file in that the textures aren't connected to the material

    var material = model.findMaterialByName("wire_028089177");
    material.colorMap = assetLibrary.get("zombie-diffuse");
    material.normalMap = assetLibrary.get("zombie-normal");
    material.specularMap = assetLibrary.get("zombie-specular");

    model.applyFunction(function (obj) {
        if (obj instanceof HX.ModelInstance && obj.skeleton) {
            obj.addComponent(new HX.DebugSkeletonComponent());
        }
    }, this);
}