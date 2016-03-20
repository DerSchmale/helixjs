/**
 * This landscape demo shows how to create custom materials to do specialized vertex/fragment shaders (granted, this demo is quite inefficient, but serves as a purpose).
 */

var project = new DemoProject();
var patchSnap;
var patchContainer;
var waterMaterial;
var waterPhase1 = new HX.Float4(0.01, 0.0, 0.0);
var waterPhase2 = new HX.Float4(.1, 0.0, 0.0);
var waterPhase3 = new HX.Float4(1.0, 0.0, 0.0);

project.onInit = function()
{
    initRenderer(project.renderer);
    initScene(project.scene);
    initCamera(project.camera);
};

project.onUpdate = function(dt)
{
    patchContainer.position.x = Math.round(this.camera.position.x / patchSnap) * patchSnap;
    patchContainer.position.z = Math.round(this.camera.position.z / patchSnap) * patchSnap;

    waterPhase1.y += dt / 15000.0;
    waterPhase1.z += dt / 14000.0;
    waterPhase2.y += dt / 12000.0;
    waterPhase2.z += dt / 11000.0;
    waterPhase3.y += dt / 90000.0;
    waterPhase3.z += dt / 80000.0;

    waterMaterial.setUniform("normalScaleOffset1", waterPhase1);
    waterMaterial.setUniform("normalScaleOffset2", waterPhase2);
    waterMaterial.setUniform("normalScaleOffset3", waterPhase3);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.useHDR = true;
    options.maxDepthPrecision = true;   // in case depth textures are not supported
    //options.lightingModel = HX.GGXLightingModel;
    options.directionalShadowFilter = new HX.VarianceDirectionalShadowFilter();

    project.init(document.getElementById("webglContainer"), options);
};

function initRenderer(renderer)
{
    renderer.localReflections = new HX.ScreenSpaceReflections(64);
    renderer.localReflections.maxDistance = 4000.0;
    renderer.localReflections.scale = 1.0;

    var ssao = new HX.HBAO(5, 6);
    ssao.sampleRadius = 1000.0;
    ssao.fallOffDistance = 2000.0;
    renderer.ambientOcclusion = ssao;
}

function initLandscape(scene)
{
    var materialLoader = new HX.AssetLoader(HX.HMT);
    var material = materialLoader.load("materials/landscapeMaterial.hmt");

    var patchSize = 500;
    var numPatches = 5;
    var maxSegments = 64;

    var primitives = [];

    patchSnap = patchSize / maxSegments;

    for (var i = 0; i < numPatches; ++i) {
        var offset = Math.pow(i / numPatches, 3.0) * numPatches;
        var primitive = HX.PlanePrimitive.create(
            {
                numSegmentsW: maxSegments >> offset,
                numSegmentsH: maxSegments >> offset,
                width: patchSize,
                height: patchSize
            });

        // make sure they're not treated as planes
        primitive.localBounds.growToIncludeMinMax(new HX.Float4(0, -500, 0), new HX.Float4(0, 500, 0));
        primitives[i] = primitive;

    }

    patchContainer = new HX.GroupNode();

    for (var x = -numPatches + 1; x < numPatches; ++x) {
        for (var y = -numPatches + 1; y < numPatches; ++y) {
            var primitive = primitives[Math.max(Math.abs(x), Math.abs(y))];
            var modelInstance = new HX.ModelInstance(primitive, material);
            modelInstance.position.x = patchSize * x;
            modelInstance.position.z = patchSize * y;
            patchContainer.attach(modelInstance);
        }
    }

    scene.attach(patchContainer);
}

function initWater(scene)
{
    var primitive = HX.PlanePrimitive.create(
        {
            numSegmentsW: 64,
            numSegmentsH: 64,
            width: 2500,
            height: 2500,
            scaleU: 40,
            scaleV: 40
        });


    var materialLoader = new HX.AssetLoader(HX.HMT);
    waterMaterial = materialLoader.load("materials/waterMaterial.hmt");

    var modelInstance = new HX.ModelInstance(primitive, waterMaterial);
    modelInstance.castShadows = false;
    modelInstance.position.y = -130;
    scene.attach(modelInstance);
}

function initCamera(camera)
{
    var fog = new HX.FogEffect();
    fog.density = .0005;
    fog.startDistance = 0.0;
    fog.tint = new HX.Color(0x38526b).gammaToLinear();

    camera.nearDistance = .1;
    camera.farDistance = 3000.0;
    camera.position = new HX.Float4(-80, -107, -200);

    var bloom = new HX.BloomEffect(500, .05);
    bloom.thresholdLuminance = 1.0;

    var tonemap = new HX.FilmicToneMapEffect(true);
    tonemap.exposure = 1.0;

    var flightController = new FlightController(camera);
    flightController.speed = 20.0;
    flightController.shiftMultiplier = 10.0;
    camera.addComponents([flightController, fog, bloom, tonemap, new HX.FXAA() ]);
}

function initScene(scene)
{
    var light = new HX.DirectionalLight();
    light.color = new HX.Color(1.0,.8,.6);
    light.direction = new HX.Float4(0.0, -0.3, -1.0, 0.0);
    light.castShadows = true;
    light.intensity = 3.1415;
    light.shadowMapSize = 2048;
    light.numCascades = 4;
    scene.attach(light);


    initLandscape(scene);
    initWater(scene);


    // Mipped
    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("textures/skybox/skybox_irradiance.hcm");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    skybox.setGlobalSpecularProbe(new HX.GlobalSpecularProbe(skyboxSpecularTexture));
    skybox.setGlobalIrradianceProbe(new HX.GlobalIrradianceProbe(skyboxIrradianceTexture));
    scene.skybox = skybox;
}