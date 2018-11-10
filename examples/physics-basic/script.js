/**
 * @author derschmale <http://www.derschmale.com>
 */

var project = new DemoProject();

project.queueAssets = function(assetLibrary)
{
    assetLibrary.queueAsset("skybox-specular", "skyboxes/river_rocks/river_rocks_1k.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG, {equiToCube: true});
	assetLibrary.queueAsset("irradiance", "skyboxes/river_rocks/river_rocks_sh.ash", HX.AssetLibrary.Type.ASSET, HX.ASH);
    assetLibrary.queueAsset("floor-albedo", "textures/brick_wall/diffuse.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("floor-normals", "textures/brick_wall/normals.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);
    assetLibrary.queueAsset("floor-specular", "textures/brick_wall/specular.jpg", HX.AssetLibrary.Type.ASSET, HX.JPG);

    if (HX.META.AUDIO_CONTEXT)
        assetLibrary.queueAsset("collision-sound", "sound/collision.wav", HX.AssetLibrary.Type.ASSET, HX.AudioFile);
};

project.onInit = function()
{
    this.scene.startSystem(new HX_PHYS.PhysicsSystem());
    initCamera(this.camera);
    initScene(this.scene, this.assetLibrary);
};

window.onload = function ()
{
    var options = new HX.InitOptions();
    options.maxSkeletonJoints = 39;
    options.useSkinningTexture = true;
    options.defaultLightingModel = HX.LightingModel.GGX;
    options.ambientOcclusion = new HX.SSAO();
    options.ambientOcclusion.sampleRadius = 4.0;
    options.ambientOcclusion.fallOffDistance = 6.0;
    project.init(document.getElementById('webglContainer'), options);
};

function initCamera(camera)
{
    camera.nearDistance = .3;
    camera.farDistance = 100.0;

    if (HX.META.AUDIO_CONTEXT)
        camera.addComponent(new HX.AudioListener());

    var orbitController = new OrbitController();
    orbitController.lookAtTarget.y = 1.2;
    orbitController.speed = 10.0;
    orbitController.radius = 5.0;
    orbitController.maxRadius = 100.0;
    camera.addComponent(orbitController);
}

function initScene(scene, assetLibrary)
{
    var skyboxSpecularTexture = assetLibrary.get("skybox-specular");
    var skyboxIrradiance = assetLibrary.get("irradiance");

    var lightProbe = new HX.LightProbe(skyboxIrradiance, skyboxSpecularTexture);
    scene.attach(new HX.Entity(lightProbe));

    var light = new HX.DirectionalLight();
    // light.intensity = 4.5;

	var lightEntity = new HX.Entity(light);
	lightEntity.lookAt(new HX.Float4(1, 1, -1));
	scene.attach(lightEntity);

    var lights = [lightProbe, light];

    // textures are from http://www.alexandre-pestana.com/pbr-textures-sponza/
    var material = new HX.BasicMaterial();
    material.colorMap = assetLibrary.get("floor-albedo");
    material.normalMap = assetLibrary.get("floor-normals");
    material.specularMap = assetLibrary.get("floor-specular");
    material.fixedLights = lights;

    var primitive = new HX.PlanePrimitive(
        {
            numSegmentsW: 10,
            numSegmentsH: 10,
            width: 50,
            height: 50,
            scaleU: 10,
            scaleV: 10
        });

    var floorInstance = new HX.Entity(new HX.MeshInstance(primitive, material));
    var rigidBody = new HX_PHYS.RigidBody(new HX_PHYS.InfinitePlaneCollider());
    rigidBody.mass = 0;
    floorInstance.addComponent(rigidBody);
    scene.attach(floorInstance);


    // top level of specular texture is the original skybox texture
    var skybox = new HX.Skybox(skyboxSpecularTexture);
    scene.skybox = skybox;


    material = new HX.BasicMaterial();
    material.fixedLights = lights;
    material.roughness = .1;
    primitive = new HX.BoxPrimitive({width: .5});

    for (var x = -1; x <= 1; ++x) {
        for (var z = 0; z < 5; ++z) {
            for (var y = -1; y <= 1; ++y) {
                var entity = new HX.Entity(new HX.MeshInstance(primitive, material));

                entity.position.set(x + (Math.random() - .5) * .3, y + (Math.random() - .5) * .3, 1.0 + z * 2.0 + Math.random() * 15);
                entity.position.scale(5.0);
                entity.rotation.fromEuler(Math.random(), Math.random(), Math.random());

                rigidBody = new HX_PHYS.RigidBody();
                rigidBody.linearDamping = .2;
                rigidBody.angularDamping = .2;
                entity.addComponent(rigidBody);

                if (HX.META.AUDIO_CONTEXT) {
                    var audioEmitter = new HX.AudioEmitter(assetLibrary.get("collision-sound"));
                    // set the name of the sound because it's used to trigger the sound from onHit
                    audioEmitter.name = "collision";
                    audioEmitter.panningModel = HX.AudioPanningModel.HRTF;
                    entity.addComponent(audioEmitter);
                }

                // bind a function to the collision message, provide entity as "this" param
                entity.messenger.bind(HX_PHYS.RigidBody.COLLISION_MESSAGE, onHit, entity);

                scene.attach(entity);
            }
        }
    }
}

function onHit(message, collision)
{
    // remember "entity" was bound as "this"
    var gain = collision.relativeVelocity.length * .006;
    if (gain < .001) return;
    this.messenger.broadcast(HX.AudioEmitter.PLAY_MESSAGE, "collision", gain);
}