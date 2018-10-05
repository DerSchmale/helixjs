/**
 * @author derschmale <http://www.derschmale.com>
 */
var project = new DemoProject();
var sponza;

window.onload = function ()
{
    var options = new HX.InitOptions();

    var ssao = new HX.HBAO(5, 5);
    ssao.strength = 2.0;
    ssao.sampleRadius = 2.5;
    ssao.fallOffDistance = 5.0;
    options.ambientOcclusion = ssao;

    options.hdr = true;
    options.numShadowCascades = HX.Platform. isMobile? 2 : 1;
    options.shadowFilter = new HX.VarianceShadowFilter();
    // options.shadowFilter.useHalfFloat = false;
    options.defaultLightingModel = HX.LightingModel.GGX;

    project.init(document.getElementById('webglContainer'), options);
};

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-specular", "skyboxes/field-mips/skybox_specular.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("skybox-irradiance", "skyboxes/field-mips/irradiance_sh.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
    assetLibrary.queueAsset("model", "crytek-sponza/sponza.obj", HX.AssetLibrary.Type.ASSET, HX_IO.OBJ);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
};

function initCamera(camera)
{
    camera.position.set(0.0, 0.0, 1.80);
    camera.nearDistance = .1;
    camera.farDistance = 100.0;

	camera.euler.z = -Math.PI * .5;
    var floatController = new FloatController();
    camera.addComponent(floatController);

    // var bloom = new HX.Bloom(250, .5, 8);
    // bloom.thresholdLuminance = 1.0;
    // camera.addComponent(bloom);

    var tonemap = new HX.FilmicToneMapping(true);
    if (tonemap.adaptive)
        tonemap.exposure = 2;
    else
        tonemap.exposure = 4;
    camera.addComponent(tonemap);

    camera.addComponent(new HX.FXAA());
}

function initScene(scene, assetLibrary)
{
	scene.startSystem(new HX.FixedLightsSystem());

    var dirLight = new HX.DirectionalLight();
    dirLight.color = new HX.Color(1.0, .95, .9);
    dirLight.intensity = 1.0;
	dirLight.castShadows = true;

	dirLight = new HX.Entity(dirLight);
	dirLight.lookAt(new HX.Float4(3.0, 1.0, -5.0));

    scene.attach(dirLight);

    var skyboxSpecularTexture = assetLibrary.get("skybox-specular");
    var skyboxIrradianceSH = assetLibrary.get("skybox-irradiance");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

	sponza = assetLibrary.get("model");
	sponza.scale.set(1.0/40.0, 1.0/40.0, 1.0/40.0);
	scene.attach(sponza);

	processMaterials();

    var lightProbe = new HX.LightProbe(skyboxIrradianceSH, skyboxSpecularTexture);
    var probe = new HX.Entity(lightProbe);
    scene.attach(probe);
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