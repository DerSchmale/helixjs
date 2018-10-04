/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();
var lights;

project.queueAssets = function(assetLibrary)
{
    // assetLibrary.queueAsset("specular", "fake-cornell/radiance.hdr", HX.AssetLibrary.Type.ASSET, HX.HDR, {equiToCube: true});
    assetLibrary.queueAsset("irradiance_FL", "fake-cornell/irradiance_FL.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
    assetLibrary.queueAsset("irradiance_FR", "fake-cornell/irradiance_FR.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
    assetLibrary.queueAsset("irradiance_NL", "fake-cornell/irradiance_NL.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
    assetLibrary.queueAsset("irradiance_NR", "fake-cornell/irradiance_FR.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
};

project.onInit = function()
{
    var orbit = new OrbitController();
    orbit.radius = 1.0;
    this.camera.addComponent(orbit);
    this.camera.farDistance = 5;
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.hdr = true;
    options.debug = true;
    // IMPORTANT in case we're using dynamic rendering
    options.maxDiffuseProbes = 4;
    if (!HX.Platform.isMobile) {
        options.ambientOcclusion = new HX.HBAO(5, 5);
        options.ambientOcclusion.sampleRadius = 0.5;
        options.ambientOcclusion.fallOffDistance = 0.5;
        options.ambientOcclusion.strength = 1.0;
        options.defaultLightingModel = HX.LightingModel.GGX_FULL;
    }
    else
        options.defaultLightingModel = HX.LightingModel.GGX;


    project.init(document.getElementById('webglContainer'), options);
};

function initScene(scene, assetLibrary)
{
    var pointLight = new HX.PointLight();
    pointLight.intensity = 1.0;
    var point = new HX.Entity(pointLight);

    lights = [ pointLight ];
    point.position.z = .45;
    scene.attach(point);

    lights.push(addProbe(assetLibrary, scene, "irradiance_NL", -0.45, -0.45, 0.0));
    lights.push(addProbe(assetLibrary, scene, "irradiance_NR", 0.45, -0.45, 0.0));
    lights.push(addProbe(assetLibrary, scene, "irradiance_FL", -0.45, 0.45, 0.0));
    lights.push(addProbe(assetLibrary, scene, "irradiance_FR", 0.45, 0.45, 0.0));

    var cube = new HX.BoxPrimitive();
    var materialWhite = new HX.BasicMaterial({roughness: .5, color: 0xe0e0e0});
    var materialRed = new HX.BasicMaterial({roughness: .5, color: 0xe00000});
    var materialGreen = new HX.BasicMaterial({roughness: .5, color: 0x00e000});
    materialWhite.fixedLights = lights;
    materialRed.fixedLights = lights;
    materialGreen.fixedLights = lights;
    var leftWall = new HX.Entity(new HX.MeshInstance(cube, materialRed));
    var rightWall = new HX.Entity(new HX.MeshInstance(cube, materialGreen));
    var topWall = new HX.Entity(new HX.MeshInstance(cube, materialWhite));
    var bottomWall = new HX.Entity(new HX.MeshInstance(cube, materialWhite));
    var backWall = new HX.Entity(new HX.MeshInstance(cube, materialWhite));
    topWall.scale.x = 3.0;
    bottomWall.scale.x = 3.0;
    leftWall.position.x = -1;
    rightWall.position.x = 1;
    topWall.position.z = 1;
    bottomWall.position.z = -1;
    backWall.position.y = 1;
    scene.attach(leftWall);
    scene.attach(rightWall);
    scene.attach(topWall);
    scene.attach(bottomWall);
    scene.attach(backWall);

    var box1 = new HX.Entity(new HX.MeshInstance(cube, materialWhite));
    box1.scale.set(.25, .25, .4);
    box1.position.x = -.2;
    box1.position.y = -.1;
    box1.position.z = -0.5 + .2;
    box1.euler.z = .2;
    scene.attach(box1);

    var box2 = new HX.Entity(new HX.MeshInstance(cube, materialWhite));
    box2.scale.set(.2, .2, .6);
    box2.position.x = .2;
    box2.position.y = .1;
    box2.position.z = -0.5 + .3;
    box2.euler.z = -.2;
    scene.attach(box2);


    // this is how the hdr maps were made before generating sh maps
    // main specular map:
    // generateHDR(scene, 0.0, 0.0, 0.0);
    // Near Left
    // generateHDR(scene, -0.45, -0.45, 0.0);
    // Near Right
    // generateHDR(scene, 0.45, -0.45, 0.0);
    // Far Left
    // generateHDR(scene, -0.45, 0.45, 0.0);
    // Far Right
    // generateHDR(scene, 0.45, 0.45, 0.0);
}

function generateHDR(scene, x, y, z)
{
    var cubeTexture = new HX.TextureCube();
    cubeTexture.initEmpty(512, HX.TextureFormat.RGB, HX.capabilities.HDR_DATA_TYPE);
    var cubeRenderer = new HX.CubeRenderer(cubeTexture);
    var cubeCamera = new HX.CubeCamera();
    cubeCamera.position.set(x, y, z);
    cubeRenderer.render(cubeCamera, scene);
    var pano = HX.EquirectangularTexture.fromCube(cubeTexture);
    saveHDR(pano);
}

function saveHDR(pano)
{
    var h = pano.height, w = pano.width;
    var data = HX.TextureUtils.getData(pano);
    var scanlines = [];
    var header ="#?RADIANCE\n# Made with Helix\nGAMMA=1\nPRIMARIES=0 0 0 0 0 0 0 0\nFORMAT=32-bit_rle_rgbe\n\n";
    header += "-Y " + h + " +X " + w + "\n";
    // we're just using this to generate other maps, so don't bother with RLE

    var l = 0, i = 0;
    var runLen = 100;
    var stride = Math.ceil(w / runLen) + w;    // pixels + length indicators

    for (var y = 0; y < h; ++y) {
        scanlines.push(0x02, 0x02, (w & 0xff00) >> 8, w & 0xff);
        l += 4;

        for (var x = 0; x < w; ++x) {
            if (x % runLen === 0) {
                var len = Math.min(runLen, w - x);
                scanlines[l] = len;
                scanlines[l + stride] = len;
                scanlines[l + stride * 2] = len;
                scanlines[l + stride * 3] = len;
                ++l;
            }

            // gamma to linear
            var r = Math.pow(data[i++], 2.2);
            var g = Math.pow(data[i++], 2.2);
            var b = Math.pow(data[i++], 2.2);
            i++;    // alpha, don't care

            var maxComp = Math.max(r, g, b) / 256.0;
            var e = HX.MathX.clamp(Math.ceil(HX.MathX.log2(maxComp)) + 136, 0.0, 0xff);
            var sc = Math.pow(2, e - 136);
            r = HX.MathX.clamp(r / sc, 0, 0xff);
            g = HX.MathX.clamp(g / sc, 0, 0xff);
            b = HX.MathX.clamp(b / sc, 0, 0xff);

            scanlines[l] = r;
            scanlines[l + stride] = g;
            scanlines[l + stride * 2] = b;
            scanlines[l + stride * 3] = e;
            ++l;
        }

        l += stride * 3;
    }

    var blob = new Blob([header, new Uint8Array(scanlines)], {type: "application/octet-stream"});
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "pano.hdr";
    a.style = "display: none";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function addProbe(assetLibrary, scene, id, x, y, z)
{
    var probe = new HX.LightProbe(assetLibrary.get(id));
    var entity = new HX.Entity(probe);
    entity.position.set(x, y, z);
    scene.attach(entity);
    return probe;
}