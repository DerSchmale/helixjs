/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var sunLight;
var earthMaterial;
var earth;
var time = 0;

var settings = {
    sunIntensity: 50.0,
    scatterIntensityBoost: 1,
    cloudColor: new HX.Color(),
    effects: []
};

// units are million km

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("sunMaterial", "blue-marble/materials/sunMaterial.hmt", HX.AssetLibrary.Type.ASSET, HX.HMT);
    assetLibrary.queueAsset("earthMaterial", "blue-marble/materials/earthMaterial.hmt", HX.AssetLibrary.Type.ASSET, HX.HMT);
    assetLibrary.queueAsset("atmosMaterial", "blue-marble/materials/atmosphereMaterial.hmt", HX.AssetLibrary.Type.ASSET, HX.HMT);
    assetLibrary.queueAsset("moon-albedo", "blue-marble/textures/moon/albedo.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("moon-normals", "blue-marble/textures/moon/normals.png", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("skybox", "blue-marble/textures/skybox/milkyway.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG_EQUIRECTANGULAR);
};

project.onInit = function()
{
    if (HX.META.OPTIONS.hdr)
        initHDRSettings();
    else
        initLDRSettings();

    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);

    time = 0;
};

project.onUpdate = function(dt)
{
    time += dt;
    earth.rotation.fromEuler(-23.5 * Math.PI / 180.0, 0.0, time * .00001 + 1.0);

    var v = this.camera.viewMatrix.transformVector(sunLight.direction);
    earthMaterial.setUniform("sunViewDirection", v);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = !HX.Platform.isMobile;
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.deferredLightingModel = HX.LightingModel.GGX;
    project.init(document.getElementById("webglContainer"), options);
};

function initHDRSettings()
{
    var bloom1 = new HX.Bloom(15, 1.0, 4);
    bloom1.thresholdLuminance = 5.0;

    var bloom2 = new HX.Bloom(100, .25, 4,.8);
    bloom2.thresholdLuminance = 5.0;

    var bloom3 = new HX.Bloom(500, .1, 8,.2);
    bloom3.thresholdLuminance = 15.0;

    // TODO: Implement pseudo lens flare

    var tonemap = new HX.ACESToneMapping(false);
    tonemap.exposure = 0;

    settings.effects = [bloom1, bloom2, bloom3, tonemap];
    settings.sunIntensity = 10.0;
    settings.cloudColor = new HX.Color(0.8, 0.78, 0.75);

    settings.scatterIntensityBoost = .25;

}

function initLDRSettings()
{
    settings.sunIntensity = 10.0;
    settings.cloudColor = new HX.Color(0.64, 0.624, 0.6);

    settings.scatterIntensityBoost = .25;
}

function initCamera(camera)
{
    camera.position.x = -0.014656872488558292;
    camera.position.y = -0.00644469540566206;
    camera.position.z = 0.001973972423002124;

    camera.lookAt(HX.Float4.ORIGIN_POINT);
    // earth sun distance ~150

    camera.nearDistance = 0.0001;
    camera.farDistance = 1000.0;

    var controller = new HX.FloatController();
    controller.speed = .07;
    controller.shiftMultiplier = 5.0;
    controller.pitch = 0.15;
    controller.yaw = 0.6484073464101978;
    camera.addComponent(controller);

    camera.addComponents(settings.effects);
}

function initSun(container, assetLibrary)
{
    var distanceToSun = 150;    // same as with moon, we're bringing it 5x closer than it is
    var sunPosX = 0;
    var sunPosY = 15;
    var sunPosZ = 8;

    sunLight = new HX.DirectionalLight();
    // sunlight actually has more green in its spectrum, but it's filtered out by the atmosphere
    sunLight.intensity = settings.sunIntensity;
    sunLight.color = new HX.Color(1.0, 1.0, 1.0);
    sunLight.direction = new HX.Float4(-sunPosX, -sunPosY, -sunPosZ);
    container.attach(sunLight);

    var sunSpherePrimitive = new HX.SpherePrimitive(
        {
            radius: 0.696
        }
    );

    var sunMaterial = assetLibrary.get("sunMaterial");
    sunMaterial.lightingModel = HX.LightingModel.Unlit;

    var sun = new HX.ModelInstance(sunSpherePrimitive, sunMaterial);
    // not heliocentric, apparently ;)
    // let's put the sun away and the earth at 0, so camera animation is easier
    var len = distanceToSun / Math.sqrt(sunPosX * sunPosX + sunPosY * sunPosY + sunPosZ * sunPosZ);
    sun.position.set(sunPosX * len, sunPosY * len, sunPosZ * len);
    container.attach(sun);
}

function initEarth(container, assetLibrary)
{
    var earthRadius = 0.006371;
    var atmosphereScale = 1.025;
    var avgDensityHeight = .15;

    earth = new HX.SceneNode();
    var earthSpherePrimitive = new HX.SpherePrimitive(
        {
            radius: earthRadius,
            numSegmentsH: 60,
            numSegmentsW: 80
        }
    );

    var atmosphereRadius = earthRadius * atmosphereScale;
    var atmosphereTickness = atmosphereRadius - earthRadius;

    var lightDir = sunLight.worldMatrix.getColumn(1);

    earthMaterial = assetLibrary.get("earthMaterial");
    earthMaterial.setUniform("lightDir", lightDir);
    earthMaterial.setUniform("atmosphereRadius", atmosphereRadius);
    earthMaterial.setUniform("earthRadius", earthRadius);
    earthMaterial.setUniform("rcpAtmosThickness", 1.0 / atmosphereTickness);
    earthMaterial.setUniform("rcpThicknessOverScaleDepth", 1.0 / atmosphereTickness / avgDensityHeight);
    earthMaterial.setUniform("expThicknessOverScaleDepth", Math.exp((earthRadius - atmosphereRadius) / avgDensityHeight));

    var globe = new HX.ModelInstance(earthSpherePrimitive, earthMaterial);
    earth.attach(globe);

    var atmosMaterial = assetLibrary.get("atmosMaterial");
    var atmosphere = new HX.ModelInstance(earthSpherePrimitive, atmosMaterial);

    atmosphere.scale.set(atmosphereScale, atmosphereScale, atmosphereScale);
    earth.attach(atmosphere);
    atmosMaterial.setUniform("atmosphereRadius", atmosphereRadius);
    atmosMaterial.setUniform("earthRadius", earthRadius);
    atmosMaterial.setUniform("rcpAtmosThickness", 1.0 / atmosphereTickness);
    atmosMaterial.setUniform("rcpThicknessOverScaleDepth", 1.0 / atmosphereTickness / avgDensityHeight);
    atmosMaterial.setUniform("boost", settings.sunIntensity * settings.scatterIntensityBoost);
    atmosMaterial.setUniform("lightDir", lightDir);
    atmosMaterial.lightingModel = HX.LightingModel.Unlit;

    earth.rotation.fromEuler(-23.5 * Math.PI / 180.0, 0.0, 1.0);

    container.attach(earth);
}

function initMoon(container, assetLibrary)
{
    // bringing it 5x closer than it is
    var distanceToEarth = 0.384400 / 5;
    var moonRadius = 0.001738;
    var moonSpherePrimitive = new HX.SpherePrimitive(
        {
            radius: moonRadius,
            numSegmentsH: 30,
            numSegmentsW: 40
        }
    );

    var colorMap = assetLibrary.get("moon-albedo");
    var normalMap = assetLibrary.get("moon-normals");

    var moonMaterial = new HX.BasicMaterial();
    moonMaterial.colorMap = colorMap;
    moonMaterial.normalMap = normalMap;
    moonMaterial.roughness = .99;

    var moon = new HX.ModelInstance(moonSpherePrimitive, moonMaterial);

    var dir = new HX.Float4(5.0,1.0,2.0);
    dir.normalize();
    dir.scale(distanceToEarth);
    moon.position.copyFrom(dir);
    moon.lookAt(HX.Float4.ORIGIN_POINT);

    container.attach(moon);
}

function initScene(scene, assetLibrary)
{
    // rotate everything so the skybox is oriented
    var container = new HX.SceneNode();
    container.rotation.fromEuler(0, .6, 0);
    scene.attach(container);
    initSun(container, assetLibrary);
    initEarth(container, assetLibrary);
    initMoon(container, assetLibrary);

    scene.detach(project.camera);
    container.attach(project.camera);

    var skyboxTexture = assetLibrary.get("skybox");
    scene.skybox = new HX.Skybox(skyboxTexture);
}