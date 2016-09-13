var project = new DemoProject();

project.onInit = function()
{
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

function initCamera(camera)
{
    camera.nearDistance = .3;
    camera.farDistance = 20.0;

    var orbitController = new OrbitController();
    orbitController.lookAtTarget.y = 1.2;
    orbitController.speed = 10.0;
    orbitController.radius = 2.0;
    orbitController.maxRadius = 100.0;
    camera.addComponent(orbitController);

    var tonemap = new HX.FilmicToneMapEffect();
    tonemap.exposure = 1.5;
    camera.addComponent(tonemap);
}

function initScene(scene)
{
    var dirLight = new HX.DirectionalLight();
    dirLight.color = new HX.Color(1.0, .9, .7);
    dirLight.direction = new HX.Float4(0.0, -5.0, -1.0);
    dirLight.intensity = 1.2;
    dirLight.numCascades = 3;
    dirLight.castShadows = true;

    scene.attach(dirLight);

    // textures are from http://www.alexandre-pestana.com/pbr-textures-sponza/
    var textureLoader = new HX.AssetLoader(HX.JPG);
    var colorMap = textureLoader.load("textures/Sponza_Ceiling_diffuse.jpg");
    var normalMap = textureLoader.load("textures/Sponza_Ceiling_normal.png");
    var specularMap = textureLoader.load("textures/Sponza_Ceiling_roughness.jpg");
    var material = new HX.BasicMaterial();
    material.colorMap = colorMap;
    material.normalMap = normalMap;
    material.specularMap = specularMap;
    material.setRoughness(1.0);

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

    // using the Function override approach for this demo
    loader.onComplete = function(asset)
    {
        var bounds = scene.worldBounds;
        asset.position.y = -bounds.minimum.y;
    };

    loader.fileMap = {
        "Muro_body_dm.tga": "Muro_body_dm.jpg",
        "Muro_body_nm.tga": "Muro_body_nm.png",
        "Muro_body_sm.tga": "Muro_body_sm.jpg",
        "Muro_head_dm.tga": "Muro_head_dm.jpg",
        "Muro_head_nm.tga": "Muro_head_nm.png",
        "Muro_head_sm.tga": "Muro_head_sm.jpg"
    };

    var node = loader.load("model/muro.fbx");
    node.scale.set(.01, .01, .01);   // back to meters
    scene.attach(node);
}