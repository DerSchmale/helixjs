/**
 * @author derschmale <http://www.derschmale.com>
 */
var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-specular", "textures/skybox/skybox_specular.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("skybox-irradiance", "textures/skybox/skybox_irradiance.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("model-sword", "model/Rapier.fbx", HX.AssetLibrary.Type.ASSET, HX.FBX);
    assetLibrary.queueAsset("model-sheath", "model/Rapier_Sheath.fbx", HX.AssetLibrary.Type.ASSET, HX.FBX);
    assetLibrary.queueAsset("handle-albedo", "model/Rapier_RapierHandle_BaseColor.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("handle-specular", "model/Rapier_RapierHandle_Specular.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("handle-normals", "model/Rapier_RapierHandle_NormalDX.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("blade-sheath-albedo", "model/Rapier_RapierBlandeAndSheath_BaseColor.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("blade-sheath-specular", "model/Rapier_RapierBlandeAndSheath_Specular.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("blade-sheath-normals", "model/Rapier_RapierBlandeAndSheath_NormalDX.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    var initOptions = new HX.InitOptions();
    initOptions.hdr = !HX.Platform.isMobile;
    project.init(document.getElementById('webglContainer'), initOptions);
};

function initCamera(camera)
{
    camera.nearDistance = .3;
    camera.farDistance = 20.0;

    var orbitController = new HX.OrbitController();
    orbitController.speed = 10.0;
    orbitController.radius = 2.0;
    orbitController.azimuth = 0;
    orbitController.maxRadius = 100.0;
    camera.addComponent(orbitController);

    if (HX.META.OPTIONS.hdr) {
        var bloom = new HX.Bloom();
        bloom.thresholdLuminance = 1.0;
        bloom.strength = .25;
        camera.addComponent(bloom);
        var toneMap = new HX.FilmicToneMapping();
        toneMap.exposure = 0;
        camera.addComponent(toneMap);
    }

    if (!HX.Platform.isMobile) {
        var fxaa = new HX.FXAA();
        camera.addComponent(fxaa);
    }
}

function initScene(scene, assetLibrary)
{
    var skyboxSpecularTexture = assetLibrary.get("skybox-specular");
    var skyboxIrradianceTexture = assetLibrary.get("skybox-irradiance");

    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(skyboxIrradianceTexture, skyboxSpecularTexture);
    scene.attach(lightProbe);

    var dirLight = new HX.DirectionalLight();
    dirLight.color = new HX.Color(1.0,.8,.6);
    dirLight.direction = new HX.Float4(0.0, -0.3, -1.0, 0.0);
    scene.attach(dirLight);

    if (!HX.META.OPTIONS.hdr) {
        var ambientLight = new HX.AmbientLight();
        ambientLight.color = 0xddddff;
        scene.attach(ambientLight);
    }

    var node = assetLibrary.get("model-sword");
    var rapier = node.findNodeByName("Rapier");
    node.detach(rapier);
    rapier.scale.set(.02, .02, .02);
    var bounds = rapier.worldBounds;
    rapier.position.y = -bounds.center.y;
    rapier.position.z = .3;
    scene.attach(rapier);

    var handleMaterial = rapier.getMeshInstance(0).material;
    handleMaterial.colorMap = assetLibrary.get("handle-albedo");
    handleMaterial.normalMap = assetLibrary.get("handle-normals");
    handleMaterial.specularMap = assetLibrary.get("handle-specular");
    handleMaterial.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    handleMaterial.roughness = .125;
    handleMaterial.roughnessMapRange = .124;
    handleMaterial.metallicness = 1.0;
    handleMaterial.lightingModel = HX.LightingModel.GGX;

    var bladeSheathMaterial = rapier.getMeshInstance(1).material;
    bladeSheathMaterial.colorMap = assetLibrary.get("blade-sheath-albedo");
    bladeSheathMaterial.normalMap = assetLibrary.get("blade-sheath-normals");
    bladeSheathMaterial.specularMap = assetLibrary.get("blade-sheath-specular");
    bladeSheathMaterial.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    bladeSheathMaterial.metallicness = 1.0;
    bladeSheathMaterial.roughness = .125;
    bladeSheathMaterial.roughnessMapRange = .124;
    bladeSheathMaterial.lightingModel = HX.LightingModel.GGX;

    var node = assetLibrary.get("model-sheath");
    var sheath = node.findNodeByName("Sheath");
    node.detach(sheath);
    sheath.scale.set(.02, .02, .02);
    sheath.position.y = rapier.position.y;
    sheath.position.z = -.3;
    sheath.assignMaterial(bladeSheathMaterial);
    scene.attach(sheath);
}