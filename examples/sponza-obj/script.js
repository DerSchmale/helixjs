/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var sponza;

window.onload = function ()
{
    var options = new HX.InitOptions();

    var ssao = new HX.SSAO(25);
    ssao.strength = 2.0;
    ssao.sampleRadius = 4.0;
    ssao.fallOffDistance = 8.0;
    options.ambientOcclusion = ssao;

    options.hdr = true;
    options.numShadowCascades = 3;
    options.directionalShadowFilter = new HX.VarianceDirectionalShadowFilter();
    options.directionalShadowFilter.useHalfFloat = false;
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.deferredLightingModel = HX.LightingModel.GGX;
    project.init(document.getElementById('webglContainer'), options);
};

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-specular", "resources/skybox/skybox_specular.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("skybox-irradiance", "resources/skybox/skybox_irradiance.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("model", "resources/crytek-sponza/sponza.obj", HX.AssetLibrary.Type.ASSET, HX.OBJ);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
};

function initCamera(camera)
{
    camera.position.set(0.0, 1.80, 0.0);
    camera.nearDistance = .1;
    camera.farDistance = 100.0;

    var floatController = new HX.FloatController();
    floatController.speed = 10.0;
    floatController.yaw = Math.PI * .5;
    camera.addComponent(floatController);

    // var bloom = new HX.Bloom(250, .5, 8);
    // bloom.thresholdLuminance = 1.0;
    // camera.addComponent(bloom);

    var tonemap = new HX.FilmicToneMapping(true);
    tonemap.exposure = -1;
    camera.addComponent(tonemap);

    camera.addComponent(new HX.FXAA());
}

function initScene(scene, assetLibrary)
{
    var dirLight = new HX.DirectionalLight();
    dirLight.color = new HX.Color(1.0, .95, .9);
    dirLight.direction = new HX.Float4(3.0, -5.0, 1.0);
    dirLight.intensity = 1.0;
    dirLight.castShadows = true;

    scene.attach(dirLight);

    var skyboxSpecularTexture = assetLibrary.get("skybox-specular");
    var skyboxIrradianceTexture = assetLibrary.get("skybox-irradiance");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var dummyLightProbe = new HX.LightProbe(skyboxIrradianceTexture);
    scene.attach(dummyLightProbe);

    sponza = assetLibrary.get("model");
    sponza.scale.set(1.0/40.0, 1.0/40.0, 1.0/40.0);
    scene.attach(sponza);

    processMaterials();

    var dynLightProbe = new HX.DynamicLightProbe(512, HX.capabilities.HDR_FORMAT);
    scene.attach(dynLightProbe);
    dynLightProbe.render();

    scene.detach(dynLightProbe);
    scene.detach(dummyLightProbe);

    var lightProbe = new HX.LightProbe(skyboxIrradianceTexture, dynLightProbe.specularTexture);
    scene.attach(lightProbe);
}

function processMaterials()
{
    var material = sponza.findMaterialByName("chain");
    material.alphaThreshold = .5;
    material.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    material.metallicness = 1.0;
    material.doubleSided = true;

    material = sponza.findMaterialByName("leaf");
    material.doubleSided = true;
    material.alphaThreshold = .5;

    material = sponza.findMaterialByName("Material__57");
    material.doubleSided = true;
    material.alphaThreshold = .5;

    material = sponza.findMaterialByName("flagpole");
    material.metallicness = 1;

    material = sponza.findMaterialByName("fabric_e");
    material.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    material.metallicness = 1;

    material = sponza.findMaterialByName("fabric_d");
    material.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    material.metallicness = 1;

    material = sponza.findMaterialByName("fabric_a");
    material.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    material.metallicness = 1;

    material = sponza.findMaterialByName("fabric_g");
    material.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    material.metallicness = 1;

    material = sponza.findMaterialByName("fabric_c");
    material.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    material.metallicness = 1;

    material = sponza.findMaterialByName("fabric_f");
    material.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    material.metallicness = 1;

    material = sponza.findMaterialByName("details");
    material.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    material.metallicness = 1;

    material = sponza.findMaterialByName("vase_hanging");
    material.metallicness = 1;
}