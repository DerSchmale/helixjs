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
    var material = new HX.PBRMaterial();
    material.colorMap = colorMap;
    material.normalMap = normalMap;
    material.specularMap = specularMap;
    material.setRoughness(1.0);

    var primitive = HX.PlanePrimitive.create(
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

    var texLoader = new HX.AssetLoader(HX.JPG);
    var materialBody = new HX.PBRMaterial();
    var materialHead = new HX.PBRMaterial();
    var materialHelmet = new HX.PBRMaterial();
    var materialLantern = new HX.PBRMaterial();
    var materialLanternTop = new HX.PBRMaterial();

    materialBody.colorMap = texLoader.load("model/bob_body.jpg");
    materialBody.specularMap = texLoader.load("model/bob_body_s.jpg");
    materialBody.normalMap = texLoader.load("model/bob_body_local.png");

    materialHead.colorMap = texLoader.load("model/bob_head.jpg");
    materialHead.specularMap = texLoader.load("model/bob_head_s.jpg");
    materialHead.normalMap = texLoader.load("model/bob_head_local.png");

    materialHelmet.colorMap = texLoader.load("model/bob_helmet.jpg");
    materialHelmet.specularMap = texLoader.load("model/bob_helmet_s.jpg");
    materialHelmet.normalMap = texLoader.load("model/bob_helmet_local.png");
    materialHelmet.metallicness = 1.0;
    materialHelmet.setRoughness(.1);
    materialHelmet.doubleSided = true;

    materialLantern.colorMap = texLoader.load("model/lantern.jpg");
    materialLantern.normalMap = texLoader.load("model/lantern_local.png");
    materialLantern.metallicness = 1.0;
    materialLantern.setRoughness(.5);

    materialLanternTop.colorMap = texLoader.load("model/lantern_top.jpg");
    materialLanternTop.normalMap = texLoader.load("model/lantern_top_local.png");
    materialLanternTop.metallicness = 1.0;
    materialLanternTop.setRoughness(.5);
    materialLanternTop.doubleSided = true;

    var loader = new HX.AssetLoader(HX.MD5Mesh);

    loader.onComplete = function(model)
    {
        var modelInstance = new HX.ModelInstance(model, [materialBody, materialHead, materialHelmet, materialLantern, materialLanternTop]);
        modelInstance.scale.set(.3,.3,.3);
        scene.attach(modelInstance);

        loader = new HX.AssetLoader(HX.MD5Anim);
        loader.onComplete = function(clip)
        {
            modelInstance.addComponent(new HX.SkeletonAnimation(clip));
        };
        loader.load("model/bob_lamp_update.md5anim");
    };

    loader.load("model/bob_lamp_update.md5mesh");

}