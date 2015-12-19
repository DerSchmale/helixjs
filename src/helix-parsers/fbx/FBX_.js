/**
 *
 * @constructor
 */
HX._FBX = function()
{
    HX.AssetParser.call(this, HX.GroupNode, HX.URLLoader.DATA_BINARY);
    this._rootNode = null;
    this._templates = null;
    this._objects = null;
    this._target = null;
    this._modelInstanceSetups = null;
    this._skeletonSetups = null;
    this._animationStacks = null;
    this._ctrlPointLookUp = null;
};

HX._FBX.prototype = Object.create(HX.AssetParser.prototype);

HX._FBX.prototype.parse = function(data, target)
{
    this._data = new HX.DataStream(data);


    this._objects = [];
    this._modelMaterialIDs = [];
    this._modelInstanceSetups = {};
    this._skeletonSetups = {};
    this._animationStacks = [];
    this._ctrlPointLookUp = {};

    // the rootNode
    this._objects["00"] = this._target = target;

    if (!this._verifyHeader()) {
        this._notifyFailure("Incorrect FBX header");
        return;
    }

    if (this._data.getUint16() !== 0x001a)
        console.log("Suspected oddity with FBX file");

    var version = this._data.getUint32();

    try {
        this._rootNode = new HX._FBX._NodeRecord();
        this._parseChildren(this._rootNode, 0);

        this._processTemplates();
        this._processObjects();
        this._processConnections();
    }
    catch(err) {
        console.error(err.stack);
        this._notifyFailure(err.message);
        return;
    }

    // TODO: only notify complete when textures have loaded
    this._notifyComplete(target);
};

HX._FBX.prototype._parseChildren = function(parent, lvl)
{
    var node;
    do {
        node = this._parseNode(lvl);
        if (node) parent.children.push(node);
    } while (node);
};

HX._FBX.prototype._verifyHeader = function()
{
    return this._data.getString(21) === "Kaydara FBX Binary  \0";
};

// TODO: Remove lvl stuff once it's working
HX._FBX.prototype._parseNode = function(lvl)
{
    if (lvl === undefined)
        lvl = 0;
    var data = this._data;
    var endOffset = data.getUint32();
    var numProperties = data.getUint32();
    var propertyListLen = data.getUint32();
    var nameLen = data.getUint8();

    if (endOffset === 0) {
        if (numProperties !== 0 || propertyListLen !== 0 || nameLen !== 0) throw new Error("Invalid null node!");
        return null;
    }

    var record = new HX._FBX._NodeRecord();
    record.name = data.getString(nameLen);

    // forget children and properties
    if (this._isIrrelevantNode(record.name)) {
        data.offset = endOffset;
        return record;
    }

    //var str = "";
    //for (var i = 0; i < lvl; ++i)
    //    str += "\t";

    //console.log(str + record.name);

    for (var i = 0; i < numProperties; ++i) {
        var dataElm = this._parseDataElement();
        record.data.push(dataElm);
        //if (dataElm.typeCode === dataElm.typeCode.toUpperCase() && dataElm.typeCode !== HX._FBX._DataElement.RAW)
        //    console.log(str + "[data] " + dataElm.typeCode + " : " + dataElm.value);
        //else
        //    console.log(str + "[data] " + dataElm.typeCode + " : [array object]");
    }

    // there's more data, must contain child nodes (terminated by null node)
    if (data.offset !== endOffset)
        this._parseChildren(record, lvl + 1);

    return record;
};

HX._FBX.prototype._parseDataElement = function()
{
    var prop = new HX._FBX._DataElement();
    prop.typeCode = this._data.getChar();

    switch (prop.typeCode) {
        case HX._FBX._DataElement.BOOLEAN:
            prop.value = this._data.getUint8();
            break;
        case HX._FBX._DataElement.INT16:
            prop.value = this._data.getInt16();
            break;
        case HX._FBX._DataElement.INT32:
            prop.value = this._data.getInt32();
            break;
        case HX._FBX._DataElement.INT64:
            // just concatting strings, since they're only used for ids
            prop.value = this._data.getInt32() + "" + this._data.getInt32();
            break;
        case HX._FBX._DataElement.FLOAT:
            prop.value = this._data.getFloat32();
            break;
        case HX._FBX._DataElement.DOUBLE:
            prop.value = this._data.getFloat64();
            break;
        case HX._FBX._DataElement.STRING:
            var len = this._data.getUint32();
            prop.value = this._data.getString(len);
            break;
        case HX._FBX._DataElement.RAW:
            var len = this._data.getUint32();
            prop.value = this._data.getUint8Array(len);
            break;
        default:
            prop.value = this._parseArray(prop.typeCode);
    }

    return prop;
};

HX._FBX.prototype._parseArray = function(type)
{
    var len = this._data.getUint32();
    var encoding = this._data.getUint32();
    var compressedLength = this._data.getUint32();

    if (encoding === 0) {
        switch (type) {
            case HX._FBX._DataElement.BOOLEAN_ARRAY:
                return this._data.getUint8Array(len);
            case HX._FBX._DataElement.INT32_ARRAY:
                return this._data.getInt32Array(len);
            case HX._FBX._DataElement.INT64_ARRAY:
                // not sure what to do with this eventually
                return this._data.getInt32Array(len * 2);
                break;
            case HX._FBX._DataElement.FLOAT_ARRAY:
                return this._data.getFloat32Array(len);
                break;
            case HX._FBX._DataElement.DOUBLE_ARRAY:
                return this._data.getFloat64Array(len);
                break;
            default:
                throw new Error("Unknown data type code " + type);
        }
    }
    else {
        var data = this._data.getUint8Array(compressedLength);
        data = pako.inflate(data).buffer;

        switch (type) {
            case HX._FBX._DataElement.BOOLEAN_ARRAY:
                return new Uint8Array(data.buffer);
            case HX._FBX._DataElement.INT32_ARRAY:
                return new Int32Array(data);
            case HX._FBX._DataElement.INT64_ARRAY:
                // INCORRECT
                return new Int32Array(data);
            case HX._FBX._DataElement.FLOAT_ARRAY:
                return new Float32Array(data);
            case HX._FBX._DataElement.DOUBLE_ARRAY:
                return new Float64Array(data);
            default:
                throw new Error("Unknown data type code " + type);
        }
    }
};

HX._FBX.prototype._isIrrelevantNode = function(name)
{
    return  name === "FBXHeaderExtension" ||
            name === "CreationTime" ||
            name === "Creator" ||
            name === "Documents" ||
            name === "FileId" ||
            name === "References" ||
            name === "GlobalSettings";
};

HX._FBX.prototype._processTemplates = function()
{
    var templateDefs = this._rootNode.getChildNode("Definitions").children;
    var len = templateDefs.length;
    this._templates = [];
    for (var i = 0; i < len; ++i) {
        var template = templateDefs[i];

        if (template.name === "ObjectType") {
            var type = template.data[0].value;
            var props = template.getChildNode("PropertyTemplate");
            if (props) {
                props = props.getChildNode("Properties70").children;

                var list = [];
                var numProps = props.length;
                for (var j = 0; j < numProps; ++j) {
                    var prop = props[j];
                    list[prop.data[0].value] = prop;
                }

                this._templates[type] = list;
            }
        }
    }
};

HX._FBX.prototype._processObjects = function()
{
    var objectDefs = this._rootNode.getChildNode("Objects");

    var children = objectDefs.children;
    var len = children.length;

    for (var i = 0; i < len; ++i) {
        var objDef = children[i];
        var name = this._getObjectDefName(objDef);
        var UID = objDef.data[0].value; // haven't seen 32MSBs being used
        var obj = null;

        switch (objDef.name) {
            case "NodeAttribute":
                obj = this._processNodeAttribute(objDef, UID);
                break;
            case "Geometry":
                obj = this._processMeshGeometry(objDef, UID);
                break;
            case "Model":
                obj = this._processModel(objDef, UID);
                break;
            case "Material":
                obj = this._processMaterial(objDef, UID);
                break;
            case "Video":
                obj = this._processVideo(objDef, UID);
                break;
            case "Texture":
                obj = this._processTexture(objDef, UID);
                break;
            case "AnimationStack":
                //console.log(JSON.stringify(objDef));
                //console.log("");
                //console.log("");
                //console.log("");
                //console.log("");
                 //SHOULD be only one, but you never know
                 //keep them in a separate list, because they won't be connected at the end
                obj = {};
                this._animationStacks.push(obj);
                break;
            //case "Pose":
            //    obj = this._processPose(objDef, UID);
            //    break;
            case "Deformer":
                obj = this._processDeformer(objDef, UID);
                break;
            case "AnimationLayer":
                break;
            case "AnimationCurveNode":
            case "AnimationCurve":
                break;

        }

        if (obj) {
            obj.name = name;
            this._objects[UID] = obj;
        }
    }
};

HX._FBX.prototype._getObjectDefName = function(objDef)
{
    return objDef.data[1].value.split(HX._FBX._STRING_DEMARCATION)[0];
};

HX._FBX.prototype._processNodeAttribute = function(objDef, UID)
{
    var subclass = objDef.data[2].value;
    var obj;

    switch(subclass) {
        case "Light":
            obj = this._processLight(objDef);
            break;
        case "Camera":
            obj = this._processCamera(objDef);
            break;
    }

    if (obj) {
        if (this._templates["NodeAttribute"]) this._applyModelProps(obj, this._templates["NodeAttribute"]);
        return obj;
    }

    return null;
};

HX._FBX.prototype._processModel = function(objDef, UID)
{
    var subclass = objDef.data[2].value;
    var obj;
    var undoScale;

    switch(subclass) {
        case "Camera":
            return new HX._FBX._DummyNode();
        case "Light":
            obj = new HX._FBX._DummyNode();
            obj.useTransform = true;
            undoScale = true;
            break;
        case "Mesh":
            obj = this._processMeshModel(objDef, UID);
            if (this._templates["NodeAttribute"]) this._applyModelProps(obj, this._templates["NodeAttribute"]);
            break;
        case "LimbNode":
            console.log(JSON.stringify(objDef));
            obj = new HX._FBX._LimbNode();
            break;
    }

    if (obj) {
        var props = objDef.getChildNode("Properties70");
        if (this._templates["Model"]) this._applyModelProps(obj, this._templates["Model"]);
        if (props) this._applyModelProps(obj, props.children);
        if (undoScale) {
            obj.scale.set(1, 1, 1);
        }
    }

    return obj;
};

HX._FBX.prototype._applyModelProps = function(target, props)
{
    var len = props.length;
    var lclRotation;
    var preRotation;
    var postRotation;
    var lclTranslation;
    var rotationPivot;
    var scalingPivot;
    var lclScaling;
    var scalingOffset;
    var rotationOffset;

    // geometric translation should be handled differently, in that it should not be allowed to affect children (should be baked in geometry, hence the name)
    var geometricTranslation;

    for (var i = 0; i < len; ++i) {
        var prop = props[i];
        var name = prop.data[0].value;
        switch(name) {
            case "GeometricTranslation":
                geometricTranslation = new HX.Float4(prop.data[4].value, prop.data[5].value, prop.data[6].value, 0.0);
                break;

            case "Lcl Scaling":
                lclScaling = new HX.Float4(prop.data[4].value, prop.data[5].value, prop.data[6].value, 1.0);
                break;
            case "ScalingPivot":
                scalingPivot = new HX.Float4(prop.data[4].value, prop.data[5].value, prop.data[6].value, 0.0);
                break;
            case "ScalingOffset":
                scalingOffset = new HX.Float4(prop.data[4].value, prop.data[5].value, prop.data[6].value, 0.0);
                break;

            case "RotationPivot":
                rotationPivot = new HX.Float4(prop.data[4].value, prop.data[5].value, prop.data[6].value, 0.0);
                break;
            case "PreRotation":
                preRotation = new HX.Quaternion();
                preRotation.fromXYZ(prop.data[4].value * HX.DEG_TO_RAD, prop.data[5].value * HX.DEG_TO_RAD, prop.data[6].value * HX.DEG_TO_RAD, 0.0);
                break;
            case "PostRotation":
                postRotation = new HX.Quaternion();
                postRotation.fromXYZ(prop.data[4].value * HX.DEG_TO_RAD, prop.data[5].value * HX.DEG_TO_RAD, prop.data[6].value * HX.DEG_TO_RAD, 0.0);
                break;
            case "Lcl Rotation":
                lclRotation = new HX.Quaternion();
                lclRotation.fromXYZ(prop.data[4].value * HX.DEG_TO_RAD, prop.data[5].value * HX.DEG_TO_RAD, prop.data[6].value * HX.DEG_TO_RAD);
                break;
            case "RotationOffset":
                rotationOffset = new HX.Float4(prop.data[4].value, prop.data[5].value, prop.data[6].value, 0.0);
                break;

            case "Lcl Translation":
                lclTranslation = new HX.Float4(prop.data[4].value, prop.data[5].value, prop.data[6].value, 0.0);
                break;
            case "InheritType":
                if (prop.data[4].value != 1)
                    throw new Error("Unsupported InheritType (must be 1)");
        }
    }

    // http://download.autodesk.com/us/fbx/20112/FBX_SDK_HELP/index.html?url=WS1a9193826455f5ff1f92379812724681e696651.htm,topicNumber=d0e7429

    var matrix = new HX.Matrix4x4();

    if (scalingPivot) matrix.appendTranslation(-scalingPivot.x, -scalingPivot.y, -scalingPivot.z);
    if (lclScaling) matrix.appendScale(lclScaling.x, lclScaling.y, lclScaling.z);
    if (scalingPivot) matrix.appendTranslation(scalingPivot.x, scalingPivot.y, scalingPivot.z);
    if (scalingOffset) matrix.appendTranslation(scalingOffset.x, scalingOffset.y, scalingOffset.z);

    if (rotationPivot) matrix.appendTranslation(-rotationPivot.x, -rotationPivot.y, -rotationPivot.z);
    if (preRotation) matrix.appendRotationQuaternion(preRotation);
    if (lclRotation) matrix.appendRotationQuaternion(lclRotation);
    if (postRotation) matrix.appendRotationQuaternion(postRotation);
    if (rotationPivot) matrix.appendTranslation(rotationPivot.x, rotationPivot.y, rotationPivot.z);
    if (rotationOffset) matrix.appendTranslation(rotationOffset.x, rotationOffset.y, rotationOffset.z);

    if (lclTranslation) matrix.appendTranslation(lclTranslation.x, lclTranslation.y, lclTranslation.z);
    if (geometricTranslation) matrix.prependTranslation(geometricTranslation.x, geometricTranslation.y, geometricTranslation.z);

    target.transformationMatrix = matrix;
};

HX._FBX.prototype._processLight = function(objDef)
{
    var light;
    var props = objDef.getChildNode("Properties70").children;
    var type;

    var len = props.length;
    for (var i = 0; i < len; ++i) {
        var prop = props[i];
        if (prop.data[0].value === "LightType") {
            type = prop.data[4].value;
            if (type === 0) light = new HX.PointLight();
            else if (type === 1) light = new HX.DirectionalLight();
            else throw new Error("Unsupported light type");
            break;
        }
    }

    if (!light) throw new Error("Missing light type property");

    var len = props.length;

    for (var i = 0; i < len; ++i) {
        var prop = props[i];
        var name = prop.data[0].value;
        switch(name) {
            case "Color":
                light.color = new HX.Color(prop.data[4].value, prop.data[5].value, prop.data[6].value);
                break;
            case "Intensity":
                light.intensity = prop.data[4].value;
                if (light.type)
                break;
            case "CastShadows":
                if (light.type === 1) {
                    light.castShadows = true;
                }
                break;
        }
    }

    return light;
};

HX._FBX.prototype._processCamera = function(objDef)
{
    var camera = new HX.PerspectiveCamera();

    function handleProps(props) {
        var len = props.length;
        var interestPosition;

        for (var i = 0; i < len; ++i) {
            var prop = props[i];
            var name = prop.data[0].value;
            switch(name) {
                case "NearPlane":
                    camera.nearDistance = prop.data[4].value;
                    break;
                case "FarPlane":
                    camera.farDistance = prop.data[4].value;
                    break;
                case "FieldOfViewY":
                    camera.verticalFOV = prop.data[4].value * HX.DEG_TO_RAD;
                    break;
                case "Position":
                    camera.position.x = prop.data[4].value;
                    camera.position.y = prop.data[5].value;
                    camera.position.z = prop.data[6].value;
                    break;
                case "InterestPosition":
                    interestPosition = new HX.Float4(prop.data[4].value, prop.data[5].value, prop.data[6].value);
                    camera.lookAt(interestPosition);
                    break;
            }
        }
    }

    if (this._templates["NodeAttribute"]) {
        handleProps(this._templates["NodeAttribute"]);
        this._applyModelProps(camera, this._templates["NodeAttribute"]);
    }
    var props = objDef.getChildNode("Properties70");
    if (props) handleProps(props.children);

    camera.scale.set(1, 1, 1);

    var prop = objDef.getChildNode("Position");
    if (prop) {
        camera.position.x = prop.data[0].value;
        camera.position.y = prop.data[1].value;
        camera.position.z = prop.data[2].value;
    }
    prop = objDef.getChildNode("LookAt");
    if (prop) {
        camera.lookAt(new HX.Float4(prop.data[0].value, prop.data[1].value, prop.data[2].value));
    }

    return camera;
};

HX._FBX.prototype._processMeshModel = function(objDef, UID)
{
    // model and materials will be assigned later
    var node = new HX.ModelInstance();

    // will be filled in on connect
    this._modelInstanceSetups[UID] = {
        modelData: null,
        materials: [],
        materialsIDs: null,
        modelInstance: node,
        parent: null
    };
    return node;
};

HX._FBX.prototype._extractMeshLayerData = function(objDef, nodeName, directDataName, indexDataName)
    {
        var node = objDef.getChildNode(nodeName);
        if (!node)
            return null;
        else {
            var mapMode = node.getChildNode("MappingInformationType").data[0].value;
            var refMode = node.getChildNode("ReferenceInformationType").data[0].value === "Direct"? 1 : 2;

            return {
                refMode: refMode,
                mapMode: mapMode === "ByPolygonVertex"? HX._FBX._Mapping.BY_POLYGON_VERTEX :
                         mapMode === "ByPolygon"?       HX._FBX._Mapping.BY_POLYGON :
                         mapMode === "AllSame"?         HX._FBX._Mapping.ALL_SAME :
                                                        HX._FBX._Mapping.BY_CONTROL_POINT,

                directData: directDataName? node.getChildNode(directDataName).data[0].value: null,
                indexData: refMode === 2? node.getChildNode(indexDataName).data[0].value : null
            }
        }
    };

HX._FBX.prototype._applyVertexData = function (data, index, i, numComponents)
{
    var target = numComponents > 2? new HX.Float4() : new HX.Float2();
    // direct
    if (data.refMode === 1) {
        var directIndex = data.mapMode === 2? index : i;
        target.x = data.directData[directIndex * numComponents];
        target.y = data.directData[directIndex * numComponents + 1];
        if (numComponents > 2)
            target.z = data.directData[directIndex * numComponents + 2];
    }
    // index to direct
    else {
        var directIndex = data.mapMode === 2? data.indexData[index] : data.indexData[i];
        target.x = data.directData[directIndex * numComponents];
        target.y = data.directData[directIndex * numComponents + 1];
        if (numComponents > 2)
            target.z = data.directData[directIndex * numComponents + 2];
    }
    return target;
};

HX._FBX.prototype._generateExpandedMeshData = function(objDef)
{
    var meshData = new HX._FBX._MeshData();
    var indexData = objDef.getChildNode("PolygonVertexIndex").data[0].value;
    var vertexData = objDef.getChildNode("Vertices").data[0].value;
    var normalData = this._extractMeshLayerData(objDef, "LayerElementNormal", "Normals", "NormalsIndex");
    var colorData = this._extractMeshLayerData(objDef, "LayerElementColor", "Colors", "ColorIndex");
    var uvData = this._extractMeshLayerData(objDef, "LayerElementUV", "UV", "UVIndex");
    var materialData = this._extractMeshLayerData(objDef, "LayerElementMaterial", null, "Materials");

    var vertices = [];
    var len = indexData.length;
    var polyIndex = 0;
    var maxMaterialIndex = 0;

    if (normalData) meshData.hasNormals = true;
    if (colorData) meshData.hasColor = true;
    if (uvData) meshData.hasUVs = true;

    for (var i = 0; i < len; ++i) {
        var index = indexData[i];
        var v = new HX._FBX._Vertex();

        if (index < 0) {
            index = -index - 1;
            v.lastVertex = true;
        }

        // is index the control point, referred to by animations?
        v.pos.x = vertexData[index * 3];
        v.pos.y = vertexData[index * 3 + 1];
        v.pos.z = vertexData[index * 3 + 2];
        v.ctrlPointIndex = index;   // if these indices are different, they are probably triggered differerently in animations

        if (normalData) v.normal = this._applyVertexData(normalData, index, i, 3);
        if (colorData) v.color = this._applyVertexData(colorData, index, i, 3);
        if (uvData) v.uv = this._applyVertexData(uvData, index, i, 2);

        if (materialData && materialData.mapMode !== HX._FBX._Mapping.ALL_SAME) {
            var matIndex = materialData.indexData[polyIndex];
            v.materialIndex = matIndex;
            if (matIndex > maxMaterialIndex)
                maxMaterialIndex = matIndex;
        }

        if (v.lastVertex)
            ++polyIndex;

        vertices[i] = v;
    }

    meshData.vertices = vertices;
    meshData.numMaterials = maxMaterialIndex + 1;

    return meshData;
};

HX._FBX.prototype._processMeshGeometry = function(objDef, UID)
{
    var expandedMesh = this._generateExpandedMeshData(objDef);
    var perMaterial = [];

    for (var i = 0; i < expandedMesh.numMaterials; ++i) {
        perMaterial[i] = {
            indexCounter: 0,
            vertexStack: [],
            indexStack: [],
            ctrlPointStack: [],
            vertices: null,
            indices: null,
            ctrlPointIndices: null,
            indexLookUp: {}
        }
    }

    var stride = HX.MeshData.DEFAULT_VERTEX_SIZE;
    var hasNormals = expandedMesh.hasNormals;
    var hasUVs = expandedMesh.hasUVs;
    var hasColor = expandedMesh.hasColor;

    if (hasColor) stride += 3;

    // returns negative if overflow is detected
    function getOrAddIndex(v)
    {
        var hash = v.getHash();
        var data = perMaterial[v.materialIndex];
        var indexLookUp = data.indexLookUp;

        if (indexLookUp.hasOwnProperty(hash))
            return indexLookUp[hash];

        if (data.indexCounter > 65535) return -1;

        var vertices = data.vertices;
        // new unique vertex!
        var k = data.indexCounter * stride;
        var realIndex = data.indexCounter++;

        data.ctrlPointIndices[realIndex] = v.ctrlPointIndex;

        indexLookUp[hash] = realIndex;

        // position
        vertices[k] = v.pos.x;
        vertices[k + 1] = v.pos.y;
        vertices[k + 2] = v.pos.z;

        // normal
        if (hasNormals) {
            vertices[k + 3] = v.normal.x;
            vertices[k + 4] = v.normal.y;
            vertices[k + 5] = v.normal.z;
        }
        else
            vertices[k + 3] = vertices[k + 4] = vertices[k + 5] = 0;

        // tangent & flipsign
        vertices[k + 6] = vertices[k + 7] = vertices[k + 8] = vertices[k + 9] = 0;

        if (hasUVs) {
            vertices[k + 10] = v.uv.x;
            vertices[k + 11] = v.uv.y;
        }
        else
            vertices[k + 10] = vertices[k + 11] = 0;

        if (hasColor) {
            vertices[k + 12] = v.color.x;
            vertices[k + 13] = v.color.y;
            vertices[k + 14] = v.color.z;
        }
        else
            vertices[k + 12] = vertices[k + 13] = vertices[k + 14] = 0;

        return realIndex;
    }

    // todo: change this expansion
    var i = 0, j = 0;
    var vertexData = expandedMesh.vertices;
    var len = vertexData.length;
    var realIndex0, realIndex1, realIndex2;
    var startNewBatch = true;

    // triangulate
    while (i < len) {
        var data = perMaterial[vertexData[i].materialIndex];
        if (!data.vertices) startNewBatch = true;
        // start as startNewBatch, so we push the current list on the stack
        if (startNewBatch) {
            startNewBatch = false;
            data.indexCounter = 0;
            data.indices = [];
            data.vertices = [];
            data.ctrlPointIndices = [];
            data.indexLookUp = {};
            data.indexStack.push(data.indices);
            data.vertexStack.push(data.vertices);
            data.ctrlPointStack.push(data.ctrlPointIndices);
        }

        // for everything: i = control point index

        realIndex0 = getOrAddIndex(vertexData[i]);
        if (realIndex0 < 0) {
            startNewBatch = true;
            continue;
        }
        realIndex1 = getOrAddIndex(vertexData[i + 1]);
        if (realIndex1 < 0) {
            startNewBatch = true;
            continue;
        }

        i += 2;

        var v2;

        do {
            v2 = vertexData[i];
            realIndex2 = getOrAddIndex(v2);

            if (realIndex2 < 0) {
                startNewBatch = true;
            }
            else {
                ++i;

                var indices = perMaterial[v2.materialIndex].indices;
                indices[j] = realIndex0;
                indices[j + 1] = realIndex1;
                indices[j + 2] = realIndex2;

                j += 3;
                realIndex1 = realIndex2;
            }
        } while (!v2.lastVertex && !startNewBatch);
    }

    var modelData = new HX.ModelData();
    var meshIndex = 0;

    this._modelMaterialIDs[UID] = [];

    for (var i = 0; i < expandedMesh.numMaterials; ++i) {
        var data = perMaterial[i];

        for (var j = 0; j < data.indexStack.length; ++j) {
            var meshData = HX.MeshData.createDefaultEmpty();
            if (hasColor) meshData.addVertexAttribute("hx_vertexColor", 3);
            meshData.setVertexData(data.vertexStack[j], 0);
            meshData.setIndexData(data.indexStack[j]);

            var ctrlPoints = data.ctrlPointStack[j];
            var numCtrlPoints = ctrlPoints.length;
            this._ctrlPointLookUp[UID] = [];

            for (var k = 0; k < numCtrlPoints; ++k) {
                this._ctrlPointLookUp[UID][ctrlPoints[k]] = {index: k, meshIndex: meshIndex};
            }
            ++meshIndex;

            this._modelMaterialIDs[UID].push(i);

            var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
            if (!hasNormals) mode |= HX.NormalTangentGenerator.MODE_NORMALS;
            var generator = new HX.NormalTangentGenerator();
            generator.generate(meshData, mode);
            modelData.addMeshData(meshData);
        }
    }

    return modelData;
};

HX._FBX.prototype._processMaterial = function(objDef, UID)
{
    var material = new HX.PBRMaterial();
    var props = objDef.getChildNode("Properties70");
    if (this._templates["Material"]) this._applyMaterialProps(material, this._templates["Material"]);
    if (props) this._applyMaterialProps(material, props.children);
    return material;
};

HX._FBX.prototype._applyMaterialProps = function(target, props)
{
    var len = props.length;
    for (var i = 0; i < len; ++i) {
        var prop = props[i];
        var name = prop.data[0].value;
        switch(name) {
            case "DiffuseColor":
                target.color = new HX.Color(prop.data[4].value, prop.data[5].value, prop.data[6].value);
                break;
            case "Shininess":
            case "ShininessExponent":
                target.roughness = Math.sqrt(2.0/(prop.data[4].value + 2.0));
                break;
        }
    }
};

HX._FBX.prototype._processVideo = function(objDef, UID)
{
    var relFileName = objDef.getChildNode("RelativeFilename");
    var obj;
    if (relFileName) {
        var filename = this._correctURL(relFileName.data[0].value);
        var textureLoader = new HX.AssetLoader(HX.JPG);
        obj = textureLoader.load(filename);
    }

    return obj;
};

HX._FBX.prototype._processPose = function(objDef, UID)
{
    var subclass = objDef.data[2].value;

    switch(subclass) {
        case "BindPose":
            return this._processBindPose(objDef, UID);
    }
};

HX._FBX.prototype._processBindPose = function(objDef, UID)
{
    var children = objDef.children;
    var len = children.length;
    var obj = [];
    for (var i = 0; i < len; ++i) {
        var node = objDef.children[i];
        if (node.children[0].value === "PoseNode") {
            var elm = new HX._FBX._BindPoseElement;
            var data = node.getChildNode("Matrix").data;
            elm.id = node.getChildNode("Node").data[0].value;
            elm.matrix.set(
                data["0"], data["1"], data["2"], data["3"],
                data["4"], data["5"], data["6"], data["7"],
                data["8"], data["9"], data["10"], data["11"],
                data["12"], data["13"], data["14"], data["15"]
            );
            obj.push(elm);
        }
    }
    return obj;
};

HX._FBX.prototype._processDeformer = function(objDef, UID)
{
    var subclass = objDef.data[2].value;

    switch(subclass) {
        case "Skin":
            var obj = new HX.Skeleton();
            this._skeletonSetups[UID] = {
                skeleton: obj,
                modelData: null,
                modelUID: null,
                clusters: []
            };
            return obj;
        case "Cluster":
            return this._processCluster(objDef, UID);
    }
};

HX._FBX.prototype._processCluster = function(objDef, UID)
{
    var indices = objDef.getChildNode("Indexes");  // Get your plurals straight, Autodesk
    var weights = objDef.getChildNode("Weights");
    if (!indices || !weights) return null;

    var obj = new HX._FBX._Cluster();
    obj.indices = indices.data[0].value;
    obj.weights = weights.data[0].value;
    return obj;
};

HX._FBX.prototype._processTexture = function(objDef, UID)
{
    return new HX._FBX._DummyTexture();
};

HX._FBX.prototype._processConnections = function()
{
    var connections = this._rootNode.getChildNode("Connections");
    if (!connections) return;
    connections = connections.children;
    var len = connections.length;

    for (var i = 0; i < len; ++i) {
        var c = connections[i];
        var linkType = c.data[0].value;
        var childUID = c.data[1].value;
        var parentUID = c.data[2].value;
        var extra = c.data[3]? c.data[3].value : null;
        var child = this._objects[childUID];
        var parent = this._objects[parentUID];

        console.log(childUID + " -> " + parentUID);

        if (child && parent) {
            console.log(child.toString() + " -> " + parent.toString());

            switch (linkType) {
                // others not currently supported
                case "OO":
                case "OP":
                    this._connectObject(child, parent, childUID, parentUID, extra);
                    break;
            }

        }
    }

    this._finalizeSkinning();
    this._finalizeModelInstances();
};

HX._FBX.prototype._connectObject = function(child, parent, childUID, parentUID, extra)
{
    if ((child instanceof HX._FBX._DummyNode) || (child instanceof HX._FBX._DummyTexture)) {
        if (child.child) {
            this._connectObject(child.child, parent, childUID, parentUID, extra);
        }
        else {
            child.parent = parent;
            child.parentUID = parentUID;

            if (extra)
                child.textureType = extra;
        }
    }
    else if ((parent instanceof HX._FBX._DummyNode) || (parent instanceof HX._FBX._DummyTexture)) {
        if (parent.useTransform)
            child.transformationMatrix = parent.transformationMatrix;

        if (parent.parent) {
            this._connectObject(child, parent.parent, childUID, parent.parentUID, parent.textureType);
        }
        else
            parent.child = child;
    }
    else if (child instanceof HX.ModelInstance) {
        this._modelInstanceSetups[childUID].parent = parent;
    }
    else if (child instanceof HX.SceneNode) {
        parent.attach(child);
    }
    else if (child instanceof HX.ModelData) {
        this._modelInstanceSetups[parentUID].materialsIDs = this._modelMaterialIDs[childUID];
        this._modelInstanceSetups[parentUID].modelData = child;
    }
    else if (child instanceof HX._FBX._Cluster) {
        this._skeletonSetups[parentUID].clusters.push(child);
    }
    else if (child instanceof HX.Skeleton) {
        this._skeletonSetups[childUID].modelData = parent;
        this._skeletonSetups[childUID].modelUID = parentUID;
    }
    else if (child instanceof HX.Material) {
        this._modelInstanceSetups[parentUID].materials.push(child);
    }
    else if (child instanceof HX.Texture2D) {
        switch(extra) {
            case "DiffuseColor":
                parent.colorMap = child;
                break;
            // WARNING: specular color is not used as such, map needs to be changed to a roughness map!
            case "SpecularColor":
                parent.specularMap = child;
                break;
            case "NormalMap":
                parent.normalMap = child;
                break;
        }
    }
};

HX._FBX.prototype._finalizeModelInstances = function()
{
    for (var key in this._modelInstanceSetups) {
        if (this._modelInstanceSetups.hasOwnProperty(key)) {
            var setup = this._modelInstanceSetups[key];
            var materials = [];

            for (var i = 0; i < setup.materialsIDs.length; ++i) {
                var id = setup.materialsIDs[i];
                materials.push(setup.materials[id]);
            }

            var model = new HX.Model(setup.modelData);
            model.name = setup.modelData.name;
            setup.modelInstance.init(model, materials);

            if (setup.parent)
                setup.parent.attach(setup.modelInstance);
            else
                this._target.attach(setup.modelInstance);
        }
    }
};

HX._FBX.prototype._finalizeSkinning = function()
{
    for (var key in this._skeletonSetups) {
        if (this._skeletonSetups.hasOwnProperty(key)) {
            var setup = this._skeletonSetups[key];

            var ctrlPoints = this._ctrlPointLookUp[setup.modelUID];

            var data = [];
            var len = setup.modelData.numMeshes;
            for (var i = 0; i < len; ++i) {
                data[i] = [];
                var numVerts = setup.modelData.getMeshData(i).numVertices;
                for (var j = 0; j < numVerts * 8; ++j)
                    data[i][j] = -1;

            }

            // boneIndex depends on Joint's index
            len = setup.clusters.length;
            for (var i = 0; i < len; ++i) {
                this._assignClusters(ctrlPoints, setup.clusters[i], data);
            }

            len = setup.modelData.numMeshes;
            for (var i = 0; i < len; ++i) {
                var meshData = setup.modelData.getMeshData(i);
                var numVerts = data[i].length;
                for (var j = 0; j < numVerts; ++j)
                    if (data[i][j] === -1) data[i][j] = 0;

                meshData.addVertexAttribute("hx_boneIndices", 4, 1);
                meshData.addVertexAttribute("hx_boneWeights", 4, 1);
                meshData.setVertexData(data[i], 1);
            }

            setup.modelData.skeleton = setup.skeleton;
        }
    }
};

HX._FBX.prototype._assignClusters = function(ctrlPoints, cluster, targets)
{
    var len = cluster.indices.length;
    var boneIndex = cluster.jointIndex;
    for (var i = 0; i < len; ++i) {
        var index = cluster.indices[i];
        var weight = cluster.weights[i];
        var mapping = ctrlPoints[index];
        var v = mapping.index * 8;
        for (var i = v; i < v + 4; ++i) {
            if (targets[mapping.meshIndex][i] === -1) {
                targets[mapping.meshIndex][i] = boneIndex;  // this index is incorrect!
                targets[mapping.meshIndex][i + 4] = weight;
            }
            if (i === v + 4) this._notifyFailure("Too many bones per matrix! (max 4)");
        }
    }
};

HX._FBX._NodeRecord = function()
{
    this.name = "";
    this.data = [];
    this.children = [];
};

HX._FBX._NodeRecord.prototype =
{
    getChildNode: function(name)
    {
        var children = this.children;
        var len = children.length;
        for (var i = 0; i < len; ++i) {
            if (children[i].name === name) return children[i];
        }
    }
};

HX._FBX._DummyTexture = function()
{
    this.name = null;
    this.child = null;
    this.parent = null;
    this.parentUID = null;
    this.textureType = null;

    this.toString = function()
    {
        return "[DummyTexture(name=" + this.name + ")";
    }
};

HX._FBX._DummyNode = function()
{
    HX.Transform.call(this);
    this.name = null;
    this.child = null;
    this.parent = null;
    this.parentUID = null;
    this.useTransform = false;

    this.toString = function()
    {
        return "[DummyNode(name=" + this.name + ")";
    }
};

HX._FBX._DummyNode.prototype = Object.create(HX.Transform.prototype);

HX._FBX._DataElement = function()
{
    this.typeCode = null;
    this.value = null;
};

HX._FBX._DataElement.INT16 = "Y";
HX._FBX._DataElement.BOOLEAN = "C";
HX._FBX._DataElement.INT32 = "I";
HX._FBX._DataElement.FLOAT = "F";
HX._FBX._DataElement.DOUBLE = "D";
HX._FBX._DataElement.INT64 = "L";

HX._FBX._DataElement.BOOLEAN_ARRAY = "b";
HX._FBX._DataElement.INT32_ARRAY = "i";
HX._FBX._DataElement.FLOAT_ARRAY = "f";
HX._FBX._DataElement.DOUBLE_ARRAY = "d";
HX._FBX._DataElement.INT64_ARRAY = "l";

HX._FBX._DataElement.STRING = "S";
HX._FBX._DataElement.RAW = "R";

HX._FBX._STRING_DEMARCATION = String.fromCharCode(0, 1);

HX._FBX._Mapping =
{
    NONE: 0,
    BY_POLYGON_VERTEX: 1,
    BY_CONTROL_POINT: 2,
    BY_POLYGON: 3,
    ALL_SAME: 4
};

HX._FBX._MeshData = function()
{
    this.vertices = null;
    this.hasColor = false;
    this.hasUVs = false;
    this.hasNormals = false;
    this.numMaterials = 0;
};

HX._FBX._Vertex = function()
{
    this.pos = new HX.Float4();
    this.uv = null;
    this.normal = null;
    this.color = null;
    this.materialIndex = 0;
    this.ctrlPointIndex = -1;
    this._hash = null;

    this.lastVertex = false;
};

HX._FBX._Vertex.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash) {
            var str = this.ctrlPointIndex + "/" + this.materialIndex + "/" + this.pos.x + "/" + this.pos.y + "/" + this.pos.z;

            if (this.normal)
                str = str + "/" + this.normal.x + "/" + this.normal.y + "/" + this.normal.z;

            if (this.uv)
                str = str + "/" + this.uv.x + "/" + this.uv.y;

            if (this.color)
                str = str + "/" + this.color.x + "/" + this.color.y + "/" + this.color.z;

            this._hash = str;
        }

        return this._hash;
    }
};

// this will be translated to a joint later on
// Using GroupNode so we can use parenting
HX._FBX._LimbNode = function()
{
    HX.GroupNode.call(this);
    this.name = null;

    this.toString = function()
    {
        return "[LimbNode(name=" + this.name + ")";
    }
};

HX._FBX._LimbNode.prototype = Object.create(HX.GroupNode.prototype);

HX._FBX._BindPose = function()
{
    this.bindPoseElements = [];
    this.name = null;

    this.toString = function()
    {
        return "[BindPose(name=" + this.name + ")";
    }
};

HX._FBX._BindPoseElement = function()
{
    this.matrix = new HX.Matrix4x4();
};

HX._FBX._Cluster = function()
{
    this.name = null;
    this.limbNode = null;
    this.weights = null;

    this.jointIndex = 0;
    this.joint = null;

    this.toString = function()
    {
        return "[Cluster(name=" + this.name + ")";
    }
};