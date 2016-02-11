var project = new DemoProject();

project.onInit = function()
{
    initRenderer(project.renderer);
    initCamera(project.camera);
    initScene(project.scene);
};
project.onUpdate = function(dt)
{
    // no updates necessary, everything happens through components
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.useHDR = true;
    options.lightingModel = HX.GGXLightingModel;
    project.init(document.getElementById('webglContainer'), options);
};

function initRenderer(renderer)
{
    renderer.localReflections = new HX.ScreenSpaceReflections(32);

    var ssao = new HX.SSAO(16);
    ssao.strength = 1.5;
    ssao.sampleRadius = .5;
    ssao.fallOffDistance = 1.0;
    renderer.ambientOcclusion = ssao;
}

function initCamera(camera)
{
    // camera properties
    camera.nearDistance = .01;
    camera.farDistance = 50.0;

    var bloom = new HX.BloomEffect(300, .5);
    var tonemap = new HX.FilmicToneMapEffect(true);
    tonemap.exposure = 2.0;

    var orbitController = new OrbitController();
    orbitController.radius = 2.0;
    orbitController.minRadius = .3;
    orbitController.lookAtTarget.y = .25;

    camera.addComponents([bloom, tonemap, orbitController]);
}

function initScene(scene)
{
    var light = new HX.DirectionalLight();
    light.color = new HX.Color(1.0,.8,.6);
    light.direction = new HX.Float4(0.0, -0.8, -1.0, 0.0);
    light.castShadows = true;
    //light.shadowMapSize = 2048;
    //light.shadowSoftness = .01;
    light.numShadowSamples = 8;
    light.numCascades = 3;
    light.intensity = 1.0;
    scene.attach(light);

    // textures from http://kay-vriend.blogspot.be/2014/04/tarnished-metal-first-steps-in-pbr-and.html
    var textureLoader = new HX.AssetLoader(HX.JPG);
    var colorMap = textureLoader.load("textures/Tarnished_Metal_01_diffuse.jpg");
    var normalMap = textureLoader.load("textures/Tarnished_Metal_01_normal.png");
    var specularMap = textureLoader.load("textures/Tarnished_Metal_01_specular.jpg");
    var opaqueMaterial = new HX.PBRMaterial();
    opaqueMaterial.colorMap = colorMap;
    opaqueMaterial.normalMap = normalMap;
    opaqueMaterial.specularMap = specularMap;
    opaqueMaterial.specularMapMode = HX.PBRMaterial.SPECULAR_MAP_ALL;
    opaqueMaterial.metallicness = 1.0;
    opaqueMaterial.roughness = 0.001;

    var transparentMaterial = new HX.PBRMaterial();
    transparentMaterial.color = 0x801010;
    transparentMaterial.transparent = true;
    transparentMaterial.refractiveRatio = 1.0 / 1.1;
    transparentMaterial.refract = true;
    transparentMaterial.roughness = .01;

    var primitive = HX.SpherePrimitive.create(
        {
            radius:.125,
            numSegmentsH: 20,
            numSegmentsW: 30,
            scaleU: 3,
            scaleV: 3
        });


    for (var x = -4; x <= 4; ++x) {
        for (var z = -4; z <= 4; ++z) {
            var material = x === 0 && z === 0? transparentMaterial : opaqueMaterial;
            var modelInstance = new HX.ModelInstance(primitive, material);
            modelInstance.position.x = x * .25 * 1.3;
            modelInstance.position.z = z * .25 * 1.3;
            modelInstance.position.y = (Math.sin(x *.5 + 1) + Math.cos(z *.5 +.5)) * .125 + .1;
            scene.attach(modelInstance);
        }
    }

    // textures are from http://www.alexandre-pestana.com/pbr-textures-sponza/
    var textureLoader = new HX.AssetLoader(HX.JPG);
    var colorMap = textureLoader.load("textures/Sponza_Ceiling_diffuse.jpg");
    var normalMap = textureLoader.load("textures/Sponza_Ceiling_normal.png");
    var specularMap = textureLoader.load("textures/Sponza_Ceiling_roughness.jpg");
    var material = new HX.PBRMaterial();
    material.colorMap = colorMap;
    material.normalMap = normalMap;
    material.specularMap = specularMap;
    material.roughness = 1.0;

    // also apply to transparent, just for fun
    transparentMaterial.normalMap = normalMap;

    primitive = HX.PlanePrimitive.create(
        {
            numSegmentsW: 10,
            numSegmentsH: 10,
            width: 50,
            height: 50,
            scaleU: 50,
            scaleV: 50
        });

    var modelInstance = new HX.ModelInstance(primitive, material);
    modelInstance.position.y = -.25;
    //modelInstance.castShadows = false;
    scene.attach(modelInstance);

    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("textures/skybox/skybox_irradiance.hcm");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    skybox.setGlobalSpecularProbe(new HX.GlobalSpecularProbe(skyboxSpecularTexture));
    skybox.setGlobalIrradianceProbe(new HX.GlobalIrradianceProbe(skyboxIrradianceTexture));
    scene.skybox = skybox;
}