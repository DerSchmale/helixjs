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
    options.directionalShadowFilter = new HX.VarianceDirectionalShadowFilter();
    //options.directionalShadowFilter.dither = true;
    options.directionalShadowFilter.blurRadius = 1;
    options.hdr = true;
    project.init(document.getElementById('webglContainer'), options);
};

function initRenderer(renderer)
{
    //renderer.localReflections = new HX.ScreenSpaceReflections(32);

    //var ssao = new HX.SSAO(16);
    var ssao = new HX.HBAO(5, 6);
    ssao.strength = 5.0;
    ssao.sampleRadius = 2.0;
    ssao.fallOffDistance = 2.0;
    renderer.ambientOcclusion = ssao;
}

function initCamera(camera)
{
    // camera properties
    camera.nearDistance = .01;
    camera.farDistance = 50.0;

    var bloom = new HX.Bloom(200, 1);
    bloom.thresholdLuminance = .25;
    var tonemap = new HX.FilmicToneMapEffect(true);
    tonemap.exposure = 0.0;

    var orbitController = new OrbitController();
    orbitController.radius = 5.0;
    orbitController.minRadius = .3;
    orbitController.maxRadius = 20.0;
    orbitController.lookAtTarget.y = .25;

    camera.addComponents([bloom, tonemap, orbitController]);
}

function initScene(scene)
{
    var light = new HX.DirectionalLight();
    light.color = new HX.Color(0.0, 1.0, 1.0);
    light.direction = new HX.Float4(0.0, -0.8, -1.0, 0.0);
    light.castShadows = true;
    light.numCascades = 4;
    light.intensity = 2.0;
    // add 1 for show (numCascades === 3, so cutoff is after 3)
    light.setCascadeRatios(.12,.25,.5, 1);
    scene.attach(light);

    var light2 = new HX.DirectionalLight();
    light2.color = new HX.Color(1.0, 0.0, 0.0);
    light2.direction = new HX.Float4(0.5, -0.8, 1.0, 0.0);
    light2.castShadows = true;
    light2.numCascades = 1;
    light2.intensity = 2.0;
    light2.setCascadeRatios(1.0);
    scene.attach(light2);

    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("textures/skybox/skybox_irradiance.hcm");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(skyboxIrradianceTexture, skyboxSpecularTexture);
    scene.attach(lightProbe);

    var lights = [ light, light2, lightProbe ];

    // textures from http://kay-vriend.blogspot.be/2014/04/tarnished-metal-first-steps-in-pbr-and.html
    var textureLoader = new HX.AssetLoader(HX.JPG);
    var colorMap = textureLoader.load("textures/Tarnished_Metal_01_diffuse.jpg");
    var normalMap = textureLoader.load("textures/Tarnished_Metal_01_normal.png");
    var specularMap = textureLoader.load("textures/Tarnished_Metal_01_specular.jpg");
    var opaqueMaterial = new HX.BasicMaterial();
    opaqueMaterial.colorMap = colorMap;
    opaqueMaterial.normalMap = normalMap;
    opaqueMaterial.specularMap = specularMap;
    opaqueMaterial.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    opaqueMaterial.metallicness = 1.0;
    opaqueMaterial.lights = lights;
    opaqueMaterial.ssao = true;
    opaqueMaterial.setRoughness(0.05, .5);

    var primitive = new HX.SpherePrimitive(
        {
            radius:.5,
            numSegmentsH: 10,
            numSegmentsW: 15,
            scaleU: 3,
            scaleV: 3
        });


    for (var x = -8; x <= 8; ++x) {
        for (var z = -8; z <= 8; ++z) {
            var modelInstance = new HX.ModelInstance(primitive, opaqueMaterial);
            modelInstance.position.x = x * 2.0;
            modelInstance.position.z = z * 2.0;
            modelInstance.position.y = (Math.sin(x *.5 + 1) + Math.cos(z *.5 +.5)) * .5 + .75;
            scene.attach(modelInstance);
        }
    }

    // textures are from http://www.alexandre-pestana.com/pbr-textures-sponza/
    var textureLoader = new HX.AssetLoader(HX.JPG);
    var colorMap = textureLoader.load("textures/Sponza_Ceiling_diffuse.jpg");
    var normalMap = textureLoader.load("textures/Sponza_Ceiling_normal.png");
    var specularMap = textureLoader.load("textures/Sponza_Ceiling_roughness.jpg");
    var material = new HX.BasicMaterial();
    material.colorMap = colorMap;
    material.normalMap = normalMap;
    material.specularMap = specularMap;
    material.lights = lights;
    material.ssao = true;
    material.setRoughness(.3);

    primitive = new HX.PlanePrimitive(
        {
            numSegmentsW: 5,
            numSegmentsH: 5,
            width: 50,
            height: 50,
            scaleU: 50,
            scaleV: 50
        });

    var modelInstance = new HX.ModelInstance(primitive, material);
    modelInstance.position.y = -.25;
    scene.attach(modelInstance);
}