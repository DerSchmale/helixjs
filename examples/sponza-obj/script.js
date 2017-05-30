var project = new DemoProject();
var sponza;
var lights;

project.onInit = function()
{
    initRenderer(this.renderer);
    initCamera(this.camera);
    initScene(this.scene);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.directionalShadowFilter = new HX.VarianceDirectionalShadowFilter();
    project.init(document.getElementById('webglContainer'), options);
};

function initRenderer(renderer)
{
    //var ssr = new HX.ScreenSpaceReflections(32);
    //ssr.scale = .5;
    //ssr.stepSize = 20;
    //renderer.localReflections = ssr;

    var ssao = new HX.SSAO(25);
    ssao.strength = 2.0;
    ssao.sampleRadius = 4.0;
    ssao.fallOffDistance = 8.0;
    renderer.ambientOcclusion = ssao;
}

function initCamera(camera)
{
    camera.position.set(0.0, 10.0, 0.0);
    camera.nearDistance = .1;
    camera.farDistance = 100.0;

    var floatController = new FloatController();
    floatController.speed = 10.0;
    camera.addComponent(floatController);

    // var bloom = new HX.Bloom(250, .5, 8);
    // bloom.thresholdLuminance = 1.0;
    // camera.addComponent(bloom);

    var tonemap = new HX.FilmicToneMapEffect(true);
    tonemap.exposure = 2;
    camera.addComponent(tonemap);

    camera.addComponent(new HX.FXAA());
}

function initScene(scene)
{
    var dirLight = new HX.DirectionalLight();
    dirLight.color = new HX.Color(1.0, .9, .7);
    dirLight.direction = new HX.Float4(3.0, -5.0, 1.0);
    dirLight.intensity = 5.0;
    dirLight.numCascades = 3;
    dirLight.castShadows = true;

    scene.attach(dirLight);

    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("resources/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("resources/skybox/skybox_irradiance.hcm");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(skyboxIrradianceTexture);
    scene.attach(lightProbe);

    lights = [ lightProbe, dirLight ];

    var loader = new HX.AssetLoader(HX.OBJ);
    loader.onComplete.bind(onSponzaComplete);
    sponza = loader.load('resources/crytek-sponza/sponza.obj');
    sponza.scale.set(1.0/40.0, 1.0/40.0, 1.0/40.0);
    scene.attach(sponza);
}

function onSponzaComplete()
{
    sponza.applyFunction(function(obj)
    {
        if (obj instanceof HX.ModelInstance) {
            for (var i = 0; i < obj.numMeshInstances; ++i) {
                var mesh = obj.getMeshInstance(i);
                if (mesh.material) {
                    mesh.material.lights = lights;
                    mesh.material.ssao = true;
                }
            }
        }
    });

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