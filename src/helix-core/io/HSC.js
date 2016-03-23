/**
 * Helix Scene files
 * @constructor
 */
HX.HSC = function()
{
    HX.Importer.call(this, HX.Scene);
};

HX.HSC.prototype = Object.create(HX.Importer.prototype);

HX.HSC.prototype.parse = function(data, target)
{
    var data = JSON.parse(data);
    if (data.version !== "0.1") throw "Incompatible file format version!";

    var objects = this._processObjects(data.objects, target);
    this._processConnections(data.connections, objects);

    this._notifyComplete(target);
};

HX.HSC.prototype._processObjects = function(definitions, scene)
{
    var objects = [];
    var len = definitions.length;

    for (var i = 0; i < len; ++i) {
        var object;
        var def = definitions[i];

        switch (def.type) {
            case "scene":
                // use existing scene instead of creating a new one
                object = scene;
                break;
            case "mesh":
                object = this._processMesh(def);
                break;
            case "model":
                object = new HX.ModelData();
                break;
            case "modelinstance":
                object = this._processModelInstance(def);
                break;
            case "material":
                object = this._processMaterial(def);
                break;
            case "dirlight":
                object = this._processDirLight(def);
                break;
            case "ptlight":
                object = this._processPointLight(def);
                break;
            case "amblight":
                object = this._processAmbientLight(def);
                break;
            default:
                console.warn("Unsupported object of type " + def.type);
                object = null;
        }

        if (object) {
            object.name = def.name;
            objects[def.id] = object;
        }

        objects.push(object);
    }

    return objects;
};

HX.HSC.prototype._processMesh = function(def)
{
    var meshData = new HX.MeshData();
    var numVertices = def.numVertices;
    var vertexData = def.vertexData;
    var data = [];

    for (var attribName in vertexData) {
        if (vertexData.hasOwnProperty(attribName)) {
            var array = vertexData[attribName];
            meshData.addVertexAttribute(attribName, array.length / numVertices, 0);
            data.push(array);
        }
    }

    var mode = 0;
    var appendNormals = !vertexData.hasOwnProperty("hx_normal");
    var appendTangents = !vertexData.hasOwnProperty("hx_tangent");

    if (appendNormals) {
        meshData.addVertexAttribute("hx_normal", 3);
        mode |= HX.NormalTangentGenerator.MODE_NORMALS;
    }

    if (appendTangents) {
        meshData.addVertexAttribute("hx_tangent", 4);
        mode |= HX.NormalTangentGenerator.MODE_TANGENTS;
    }

    var vertices = [];
    var v = 0;

    for (var i = 0; i < numVertices; ++i) {
        for (var j = 0; j < data.length; ++j) {
            var arr = data[j];
            var numComponents = arr.length / numVertices;
            for (var k = 0; k < numComponents; ++k)
            {
                vertices[v++] = arr[i * numComponents + k];
            }
        }

        var len = appendNormals? 3 : 0;
        len += appendTangents? 4 : 0;
        for (var j = 0; j < len; ++j) {
            vertices[v++] = 0;
        }
    }

    meshData.setIndexData(def.indexData);
    meshData.setVertexData(vertices, 0);

    if (mode) {
        var generator = new HX.NormalTangentGenerator();
        generator.generate(meshData, mode);
    }

    return meshData;
};

HX.HSC.prototype._processMaterial = function(def)
{
    var material = new HX.PBRMaterial();
    if (def.hasOwnProperty("color")) material.color = new HX.Color(def.color[0], def.color[1], def.color[2]);
    if (def.hasOwnProperty("metallicness")) material.metallicness = def.metallicness;
    if (def.hasOwnProperty("specularNormalReflection")) material.specularNormalReflection = def.specularNormalReflection;
    if (def.hasOwnProperty("refractiveRatio")) {
        material.refractiveRatio = def.refractiveRatio;
        material.refract = def.refractiveRatio !== 1;
    }
    if (def.hasOwnProperty("transparent")) material.transparent = def.transparent;
    if (def.hasOwnProperty("alpha")) material.alpha = def.alpha;
    if (def.hasOwnProperty("alphaThreshold")) material.alphaThreshold = def.alphaThreshold;
    if (def.hasOwnProperty("roughness")) material.setRoughness(def.roughness);
    if (def.hasOwnProperty("minRoughness")) material.minRoughness = def.minRoughness;
    if (def.hasOwnProperty("maxRoughness")) material.maxRoughness = def.maxRoughness;
    if (def.hasOwnProperty("specularMapMode")) material.specularMapMode = def.specularMapMode;  // 1: SPECULAR_MAP_ROUGHNESS_ONLY, 2: SPECULAR_MAP_ALL, 3: SPECULAR_MAP_SHARE_NORMAL_MAP

    return material;
};

HX.HSC.prototype._processDirLight = function(def)
{
    var light = new HX.DirectionalLight();
    this._processLight(def, light);
    if (def.hasOwnProperty("direction")) light.direction = new HX.Float4(def.direction[0], def.direction[1], def.direction[2]);
    if (def.hasOwnProperty("shadows")) light.castShadows = def.shadows;
    return light;
};

HX.HSC.prototype._processPointLight = function(def)
{
    var light = new HX.PointLight();
    this._processLight(def, light);
    if (def.hasOwnProperty("radius")) light.radius = def.radius;
    return light;
};

HX.HSC.prototype._processAmbientLight = function(def)
{
    var light = new HX.AmbientLight();
    this._processLight(def, light);
    return light;
};

HX.HSC.prototype._processLight = function(def, light)
{
    this._processSceneNode(def, light);
    if (def.hasOwnProperty("color")) light.color = new HX.Color(def.color[0], def.color[1], def.color[2]);
    if (def.hasOwnProperty("intensity")) light.intensity = def.intensity;
};

HX.HSC.prototype._processModelInstance = function(def)
{
    var instance = new HX.ModelInstance();
    this._processSceneNode(def, instance);
    return instance;
};

HX.HSC.prototype._processSceneNode = function(def, target)
{
    if (def.hasOwnProperty("matrix")) {
        target.transform = new HX.Matrix4x4(def.matrix);
    }
    else {
        if (def.hasOwnProperty("position")) {
            target.position.x = def.position[0];
            target.position.y = def.position[1];
            target.position.z = def.position[2];
        }
        if (def.hasOwnProperty("rotation")) {
            target.rotation.x = def.rotation[0];
            target.rotation.y = def.rotation[1];
            target.rotation.z = def.rotation[2];
            target.rotation.w = def.rotation[3];
        }
        if (def.hasOwnProperty("scale")) {
            target.scale.x = def.scale[0];
            target.scale.y = def.scale[1];
            target.scale.z = def.scale[2];
        }
    }
};

HX.HSC.prototype._processConnections = function(connections, objects)
{
    var modelLinks = [];
    var materialLinks = [];
    var len = connections.length;

    for (var i = 0; i < len; ++i) {
        var parentID = connections[i].p;
        var childID = connections[i].c;
        var parent = objects[parentID];
        var child = objects[childID];

        if (child instanceof HX.MeshData) {
            parent.addMeshData(child);
        }
        else if (child instanceof HX.ModelData) {
            // deferred until all meshdata is assigned:
            modelLinks.push({c: childID, p: connections[i].p})
        }
        else if (child instanceof HX.SceneNode) {
            parent.attach(child);
        }
        else if (child instanceof HX.Material) {
            materialLinks[parentID] = materialLinks[parentID] || [];
            materialLinks[parentID].push(child);
        }
    }

    // now all ModelDatas are complete, can assign to instances
    len = modelLinks.length;
    for (var i = 0; i < len; ++i) {
        var instance = objects[modelLinks[i].p];
        var modelData = objects[modelLinks[i].c];
        var model = new HX.Model(modelData);
        instance.init(model, materialLinks[modelLinks[i].p]);
    }
};