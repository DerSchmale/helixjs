/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

window.onload = function ()
{
    var options = new HX.InitOptions();

    var ssao = new HX.SSAO(24);
    ssao.strength = 3.0;
    ssao.sampleRadius = 1.0;
    ssao.fallOffDistance = 2.5;
    options.ambientOcclusion = ssao;
    // options.debug = true;

    if (HX.Platform.isMobile) {
        options.numShadowCascades = 1;
        options.shadowFilter = new HX.PCFShadowFilter();
        options.shadowFilter.dither = true;
        options.shadowFilter.softness = .001;
        options.hdr = false;
    }
    else {
        options.numShadowCascades = 2;
        options.shadowFilter = new HX.VarianceShadowFilter();
        options.hdr = true;
    }

    options.defaultLightingModel = HX.LightingModel.GGX;

    project.init(document.getElementById('webglContainer'), options);
};


project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-specular", "skyboxes/field-mips/skybox_specular.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("skybox-irradiance", "skyboxes/field-mips/skybox_irradiance.hcm", HX.AssetLibrary.Type.ASSET, HX.HCM);
    assetLibrary.queueAsset("floor-albedo", "crytek-sponza/textures_pbr/Sponza_Ceiling_diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("floor-normals", "crytek-sponza/textures_pbr/Sponza_Ceiling_normal.png", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("floor-specular", "crytek-sponza/textures_pbr/Sponza_Ceiling_roughness.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("metal-albedo", "textures/Tarnished_Metal_01/Tarnished_Metal_01_diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("metal-normals", "textures/Tarnished_Metal_01/Tarnished_Metal_01_normal.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
    assetLibrary.queueAsset("metal-specular", "textures/Tarnished_Metal_01/Tarnished_Metal_01_specular.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
};

project.onInit = function()
{
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
    // this.renderer.debugMode = HX.Renderer.DebugMode.SSAO;
};

project.onUpdate = function(dt)
{
    // no updates necessary, everything happens through components
};

function initCamera(camera)
{
    // camera properties
    camera.nearDistance = .01;
    camera.farDistance = 50.0;

    var orbitController = new OrbitController();
    orbitController.radius = 10.0;
    orbitController.polar = 1.0;
    orbitController.minRadius = .3;
    orbitController.maxRadius = 20.0;
    orbitController.lookAtTarget.z = .25;
    camera.addComponent(orbitController);
}

function initScene(scene, assetLibrary)
{
    var light = new HX.DirectionalLight();
    light.color = new HX.Color(1.0, .95, .9);
    light.castShadows = true;
    light.intensity = 3.0;
    // no need for the cascades to reach all the way back
    // if (HX.META.OPTIONS.numShadowCascades === 2)
    //     light.setCascadeRatios(.25,.5);
    // else
    //     light.setCascadeRatios(.5);
	var lightEntity = new HX.Entity(light);
	lightEntity.lookAt(new HX.Float4(0.0, 0.8, -1.0, 0.0));
    scene.attach(lightEntity);

    var skyboxSpecularTexture = assetLibrary.get("skybox-specular");
    var skyboxIrradianceTexture = assetLibrary.get("skybox-irradiance");

    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;

    var lightProbe = new HX.LightProbe(skyboxIrradianceTexture, skyboxSpecularTexture);
	scene.attach(new HX.Entity(lightProbe));

    // textures from http://kay-vriend.blogspot.be/2014/04/tarnished-metal-first-steps-in-pbr-and.html
    var opaqueMaterial = new HX.BasicMaterial();
    opaqueMaterial.colorMap = assetLibrary.get("metal-albedo");
    opaqueMaterial.normalMap = assetLibrary.get("metal-normals");
    opaqueMaterial.specularMap = assetLibrary.get("metal-specular");
    opaqueMaterial.specularMapMode = HX.BasicMaterial.SPECULAR_MAP_ALL;
    opaqueMaterial.metallicness = 1.0;
    opaqueMaterial.roughness = 0.5;
    opaqueMaterial.roughnessRange = 0.4;
    opaqueMaterial.lightingModel = HX.LightingModel.GGX;

    var primitive = new HX.SpherePrimitive(
        {
            radius:.5,
            numSegmentsH: 10,
            numSegmentsW: 15,
            scaleU: 3,
            scaleV: 3
        });


    for (var x = -8; x <= 8; ++x) {
        for (var y = -8; y <= 8; ++y) {
            var material = opaqueMaterial;
            var entity = new HX.Entity(new HX.MeshInstance(primitive, material));
            entity.position.x = x * 2.0;
            entity.position.y = y * 2.0;
            entity.position.z = (Math.sin(x *.5 + 1) + Math.cos(y *.5 +.5)) * .5 + .75;
            scene.attach(entity);
        }
    }

    // textures are from http://www.alexandre-pestana.com/pbr-textures-sponza/
    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("floor-albedo");
    material.normalMap = assetLibrary.get("floor-normals");
    material.specularMap = assetLibrary.get("floor-specular");
    material.roughness = .8;
    material.lightingModel = HX.LightingModel.GGX;

    primitive = new HX.PlanePrimitive(
        {
            numSegmentsW: 5,
            numSegmentsH: 5,
            width: 50,
            height: 50,
            scaleU: 50,
            scaleV: 50,

            // doublesided is necessary to get good results with VSM
            doubleSided: true
        });

    var modelInstance = new HX.Entity(new HX.MeshInstance(primitive, material));
    modelInstance.position.z = -.25;
    scene.attach(modelInstance);
}