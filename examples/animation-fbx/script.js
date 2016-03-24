var project = new DemoProject();

project.onInit = function()
{
    initRenderer(this.renderer);
    initCamera(this.camera);
    initScene(this.scene);
};

window.onload = function ()
{
    var shadowFilter = new HX.PCFDirectionalShadowFilter();
    shadowFilter.softness = .02;
    shadowFilter.dither = true;
    shadowFilter.numShadowSamples = 8;

    var options = new HX.InitOptions();
    options.useHDR = true;
    options.directionalShadowFilter = shadowFilter;
    project.init(document.getElementById('webglContainer'), options);
};

function initRenderer(renderer)
{
    /*var ssr = new HX.ScreenSpaceReflections(32);
    ssr.scale = .25;
    ssr.stepSize = 20;
    renderer.localReflections = ssr;*/

    /*var ssao = new HX.SSAO(25);
    ssao.strength = 1.0;
    ssao.sampleRadius = .25;
    ssao.fallOffDistance = .5;
    ssao.scale = 1.0;
    renderer.ambientOcclusion = ssao;*/
}

function initCamera(camera)
{
    camera.nearDistance = .1;
    camera.farDistance = 10.0;

    var orbitController = new OrbitController();
    orbitController.lookAtTarget.y = 2.0;
    orbitController.speed = 10.0;
    orbitController.radius = 1.0;
    orbitController.maxRadius = 100.0;
    camera.addComponent(orbitController);

    var tonemap = new HX.FilmicToneMapEffect();
    tonemap.exposure = 2;
    camera.addComponent(tonemap);
    //camera.addComponent(new HX.FXAA());
}

function initScene(scene)
{
    var dirLight = new HX.DirectionalLight();
    dirLight.color = new HX.Color(1.0, .9, .7);
    dirLight.direction = new HX.Float4(0.0, -5.0, -1.0);
    dirLight.intensity = .4;
    dirLight.castShadows = true;

    scene.attach(dirLight);

    // textures are from http://www.alexandre-pestana.com/pbr-textures-sponza/
    var textureLoader = new HX.AssetLoader(HX.JPG);
    var colorMap = textureLoader.load("textures/Sponza_Ceiling_diffuse.jpg");
    var normalMap = textureLoader.load("textures/Sponza_Ceiling_normal.png");
    var specularMap = textureLoader.load("textures/Sponza_Ceiling_roughness.jpg");
    var material = new HX.PBRMaterial();
    material.colorMap = colorMap;
    material.normalMap = normalMap;
    material.specularMap = specularMap;
    material.setRoughness(0.0);

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

    var cubeLoader = new HX.AssetLoader(HX.HCM);
    var skyboxSpecularTexture = cubeLoader.load("textures/skybox/skybox_specular.hcm");
    var skyboxIrradianceTexture = cubeLoader.load("textures/skybox/skybox_irradiance.hcm");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    skybox.setGlobalSpecularProbe(new HX.GlobalSpecularProbe(skyboxSpecularTexture));
    skybox.setGlobalIrradianceProbe(new HX.GlobalIrradianceProbe(skyboxIrradianceTexture));
    scene.skybox = skybox;

    var loader = new HX.AssetLoader(HX.FBX);

    // using the Signal approach for this demo
    loader.onComplete.bind(function(node)
    {
        node.scale.set(.1,.1,.1);
        node.position.x = -node.worldBounds.center.x;
        node.position.z = -node.worldBounds.center.z;
        node.position.y = -node.worldBounds.minimum.y;

        scene.attach(node);

        // something wrong with this fbx file in that the textures aren't connected to the material

        var material = node.findMaterialByName("wire_028089177");
        var textureLoader = new HX.AssetLoader(HX.JPG);
        material.colorMap = textureLoader.load("model/zombie/diffuse.jpg");
        material.normalMap = textureLoader.load("model/zombie/normal.jpg");
        material.specularMap = textureLoader.load("model/zombie/specular.jpg");
        material.setRoughness(0.0);
    });

    loader.load("model/zombie/walk.FBX");
}