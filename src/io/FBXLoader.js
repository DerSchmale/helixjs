HX.FBXLoader =
{
    load: function (filename, onComplete, onFail)
    {
        var fbxParser = new HX.FBXParser();
        var groupNode = new HX.GroupNode();

        var urlLoader = new HX.URLLoader();
        urlLoader.type = HX.URLLoader.DATA_BINARY;

        urlLoader.onComplete = function (data)
        {
            fbxParser.parse(data, groupNode, onComplete, onFail);
        };

        urlLoader.onError = function (code)
        {
            console.warn("Failed loading " + filename + ". Error code: " + code);
            if (onFail) onFail(code);
        };

        urlLoader.load(filename);

        return groupNode;
    }
};

/**
 *
 * @constructor
 */
HX.FBXParser = function()
{
    this._version = null;
    this._rootNode = null;
    this._templates = null;
    this._objects = null;
    this._modelInstanceSetups = null;
};

HX.FBXParser.prototype =
{
    parse: function(data, target, onComplete, onFail)
    {
        var time = Date.now();
        this._data = new HX.DataStream(data);

        this._objects = [];
        this._modelMaterialIDs = [];
        this._modelInstanceSetups = [];
        // the rootNode
        this._objects["00"] = target;

        if (!this._verifyHeader()) {
            console.log("Incorrect FBX header");
            if (onFail) onFail();
            return;
        }

        if (this._data.getUint16() !== 0x001a)
            console.log("Suspected oddity with FBX file");

        this._version = this._data.getUint32();
        console.log("FBX version " + this._version);

        try {
            this._rootNode = new HX.FBXParser.NodeRecord();
            this._parseChildren(this._rootNode, 0);

            this._processTemplates();
            this._processObjects();
            this._processConnections();
        }
        catch(err) {
            console.log("Error parsing FBX " + err, err.stack);
            if (onFail) onFail(err);
            return;
        }

        console.log("Parsing complete in " + (Date.now() - time) + "ms");

        if (onComplete) onComplete(target);
    },

    _parseChildren: function(parent, lvl)
    {
        var node;
        do {
            node = this._parseNode(lvl);
            if (node) parent.children.push(node);
        } while (node);
    },

    _verifyHeader: function()
    {
        return this._data.getString(21) === "Kaydara FBX Binary  \0";
    },

    // TODO: Remove lvl stuff once it's working
    _parseNode: function(lvl)
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

        var record = new HX.FBXParser.NodeRecord();
        record.name = data.getString(nameLen);

        // forget children and properties
        if (this._isIrrelevantNode(record.name)) {
            data.offset = endOffset;
            return record;
        }

        /*var str = "";
        for (var i = 0; i < lvl; ++i)
            str += "\t";

        console.log(str + record.name);*/

        for (var i = 0; i < numProperties; ++i) {
            var dataElm = this._parseDataElement();
            record.data.push(dataElm);
            /*if (dataElm.typeCode === "L")
                console.log(str + "[data] " + dataElm.typeCode + " : 0x" + dataElm.value.U.toString(16) + " 0x" + dataElm.value.L.toString(16));
            else if (dataElm.typeCode === dataElm.typeCode.toUpperCase() && dataElm.typeCode !== HX.FBXParser.DataElement.RAW)
                console.log(str + "[data] " + dataElm.typeCode + " : " + dataElm.value);
            else
                console.log(str + "[data] " + dataElm.typeCode + " : [array object]");*/
        }

        // there's more data, must contain child nodes (terminated by null node)
        if (data.offset !== endOffset)
            this._parseChildren(record, lvl + 1);

        return record;
    },

    _parseDataElement: function()
    {
        var prop = new HX.FBXParser.DataElement();
        prop.typeCode = this._data.getChar();

        switch (prop.typeCode) {
            case HX.FBXParser.DataElement.BOOLEAN:
                prop.value = this._data.getUint8();
                break;
            case HX.FBXParser.DataElement.INT16:
                prop.value = this._data.getInt16();
                break;
            case HX.FBXParser.DataElement.INT32:
                prop.value = this._data.getInt32();
                break;
            case HX.FBXParser.DataElement.INT64:
                // just concatting strings, since they're only used for ids
                prop.value = this._data.getInt32() + "" + this._data.getInt32();
                break;
            case HX.FBXParser.DataElement.FLOAT:
                prop.value = this._data.getFloat32();
                break;
            case HX.FBXParser.DataElement.DOUBLE:
                prop.value = this._data.getFloat64();
                break;
            case HX.FBXParser.DataElement.STRING:
                var len = this._data.getUint32();
                prop.value = this._data.getString(len);
                break;
            case HX.FBXParser.DataElement.RAW:
                var len = this._data.getUint32();
                prop.value = this._data.getUint8Array(len);
                break;
            default:
                prop.value = this._parseArray(prop.typeCode);
        }

        return prop;
    },

    _parseArray: function(type)
    {
        var len = this._data.getUint32();
        var encoding = this._data.getUint32();
        var compressedLength = this._data.getUint32();

        if (encoding === 0) {
            switch (type) {
                case HX.FBXParser.DataElement.BOOLEAN_ARRAY:
                    return this._data.getUint8Array(len);
                case HX.FBXParser.DataElement.INT32_ARRAY:
                    return this._data.getInt32Array(len);
                case HX.FBXParser.DataElement.INT64_ARRAY:
                    // not sure what to do with this eventually
                    return this._data.getInt32Array(len * 2);
                    break;
                case HX.FBXParser.DataElement.FLOAT_ARRAY:
                    return this._data.getFloat32Array(len);
                    break;
                case HX.FBXParser.DataElement.DOUBLE_ARRAY:
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
                case HX.FBXParser.DataElement.BOOLEAN_ARRAY:
                    return new Uint8Array(data.buffer);
                case HX.FBXParser.DataElement.INT32_ARRAY:
                    return new Int32Array(data);
                case HX.FBXParser.DataElement.INT64_ARRAY:
                    // INCORRECT
                    return new Int32Array(data);
                case HX.FBXParser.DataElement.FLOAT_ARRAY:
                    return new Float32Array(data);
                case HX.FBXParser.DataElement.DOUBLE_ARRAY:
                    return new Float64Array(data);
                default:
                    throw new Error("Unknown data type code " + type);
            }
        }
    },

    _isIrrelevantNode: function(name)
    {
        return  name === "FBXHeaderExtension" ||
                name === "CreationTime" ||
                name === "Creator" ||
                name === "Documents" ||
                name === "FileId" ||
                name === "References" ||
                name === "GlobalSettings";
    },

    _processTemplates: function()
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
    },

    _processObjects: function()
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
                default:
                    console.log("Unsupported object type " + objDef.name);
            }

            if (obj) {
                obj.name = name;
                this._objects[UID] = obj;
            }
        }
    },

    _getObjectDefName: function(objDef)
    {
        return objDef.data[1].value.split(HX.FBXParser.STRING_DEMARCATION)[0];
    },

    _processNodeAttribute: function(objDef, UID)
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
    },

    _processModel: function(objDef, UID)
    {
        var subclass = objDef.data[2].value;
        var obj;
        var undoScale;

        switch(subclass) {
            case "Camera":
                return new HX.FBXParser.DummyNode();
            case "Light":
                obj = new HX.FBXParser.DummyNode();
                obj.useTransform = true;
                undoScale = true;
                break;
            case "Mesh":
                obj = this._processMeshModel(objDef, UID);
                if (this._templates["NodeAttribute"]) this._applyModelProps(obj, this._templates["NodeAttribute"]);
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
    },

    _applyModelProps: function(target, props)
    {
        var len = props.length;
        for (var i = 0; i < len; ++i) {
            var prop = props[i];
            var name = prop.data[0].value;
            switch(name) {
                case "Lcl Rotation":
                    target.rotation.fromXYZ(prop.data[4].value * HX.DEG_TO_RAD, prop.data[5].value * HX.DEG_TO_RAD, prop.data[6].value * HX.DEG_TO_RAD);
                    break;
                case "Lcl Scaling":
                    target.scale.set(prop.data[4].value, prop.data[5].value, prop.data[6].value);
                    break;
                case "Lcl Translation":
                    target.position.set(prop.data[4].value, prop.data[5].value, prop.data[6].value);
                    break;
                case "InheritType":
                    if (prop.data[4].value != 1)
                        throw new Error("Unsupported InheritType (must be 1)");
            }
        }
    },

    _processLight: function(objDef)
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
    },

    _processCamera: function(objDef)
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
    },

    _processMeshModel: function(objDef, UID)
    {
        // model and materials will be assigned later
        var node = new HX.ModelInstance();

        // will be filled in on connect
        this._modelInstanceSetups[UID] = {
            model: null,
            materials: [],
            materialsIDs: null,
            modelInstance: node,
            parent: null
        };
        return node;
    },

    _extractMeshLayerData: function(objDef, nodeName, directDataName, indexDataName)
    {
        var node = objDef.getChildNode(nodeName);
        if (!node)
            return null;
        else {
            var mapMode = node.getChildNode("MappingInformationType").data[0].value;
            var refMode = node.getChildNode("ReferenceInformationType").data[0].value === "Direct"? 1 : 2;

            return {
                refMode: refMode,
                mapMode: mapMode === "ByPolygonVertex"? HX.FBXParser.BY_POLYGON_VERTEX :
                         mapMode === "ByPolygon"?       HX.FBXParser.BY_POLYGON :
                         mapMode === "AllSame"?         HX.FBXParser.ALL_SAME :
                                                        HX.FBXParser.BY_CONTROL_POINT,

                directData: directDataName? node.getChildNode(directDataName).data[0].value: null,
                indexData: refMode === 2? node.getChildNode(indexDataName).data[0].value : null
            }
        }
    },

    _applyVertexData: function (data, index, i, numComponents)
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
    },

    _generateExpandedMeshData: function(objDef)
    {
        var meshData = new HX.FBXParser.MeshData();
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
        //if (colorData) meshData.hasColor = true;
        //if (uvData) meshData.hasUVs = true;

        for (var i = 0; i < len; ++i) {
            var index = indexData[i];
            var v = new HX.FBXParser.Vertex();

            if (index < 0) {
                index = -index - 1;
                v.lastVertex = true;
            }

            v.pos.x = vertexData[index * 3];
            v.pos.y = vertexData[index * 3 + 1];
            v.pos.z = vertexData[index * 3 + 2];

            if (normalData)
                v.normal = this._applyVertexData(normalData, index, i, 3);

            //if (colorData) v.color = this._applyVertexData(colorData, index, i, 3);
            //if (uvData) v.uv = this._applyVertexData(uvData, index, i, 2);

            if (materialData && materialData.mapMode !== HX.FBXParser.ALL_SAME) {
                var index = materialData.indexData[polyIndex];
                //v.materialIndex = index;
                if (index > maxMaterialIndex)
                    maxMaterialIndex = index;
            }

            if (v.lastVertex)
                ++polyIndex;

            vertices[i] = v;
        }

        meshData.vertices = vertices;
        meshData.numMaterials = maxMaterialIndex + 1;

        return meshData;
    },

    _processMeshGeometry: function(objDef, UID)
    {
        var expandedMesh = this._generateExpandedMeshData(objDef);
        var perMaterial = [];

        for (var i = 0; i < expandedMesh.numMaterials; ++i) {
            perMaterial[i] = {
                indexCounter: 0,
                vertexStack: [],
                indexStack: [],
                vertices: null,
                indices: null,
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
        var overflown = true;

        // triangulate
        while (i < len) {
            // start as overflown, so we push the current list on the stack
            if (overflown) {
                overflown = false;
                var data = perMaterial[vertexData[i].materialIndex];
                data.indexCounter = 0;
                data.indices = [];
                data.vertices = [];
                data.indexLookUp = {};
                data.indexStack.push(data.indices);
                data.vertexStack.push(data.vertices);
            }

            realIndex0 = getOrAddIndex(vertexData[i]);
            if (realIndex0 < 0) {
                overflown = true;
                continue;
            }
            realIndex1 = getOrAddIndex(vertexData[i + 1]);
            if (realIndex1 < 0) {
                overflown = true;
                continue;
            }

            i += 2;

            var v2;

            do {
                v2 = vertexData[i];
                realIndex2 = getOrAddIndex(v2);

                if (realIndex2 < 0) {
                    overflown = true;
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
            } while (!v2.lastVertex && !overflown);
        }

        var modelData = new HX.ModelData();

        this._modelMaterialIDs[UID] = [];

        for (var i = 0; i < expandedMesh.numMaterials; ++i) {
            var data = perMaterial[i];

            for (var j = 0; j < data.indexStack.length; ++j) {
                var meshData = HX.MeshData.createDefaultEmpty();
                if (hasColor) meshData.addVertexAttribute("hx_vertexColor", 3);
                meshData.setVertexData(data.vertexStack[j]);
                meshData.setIndexData(data.indexStack[j]);

                this._modelMaterialIDs[UID].push(i);

                var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
                if (!hasNormals) mode |= HX.NormalTangentGenerator.MODE_NORMALS;
                var generator = new HX.NormalTangentGenerator();
                generator.generate(meshData, mode);
                modelData.addMeshData(meshData);
            }
        }

        return new HX.Model(modelData);
    },

    _processMaterial: function(objDef, UID)
    {
        var material = new HX.PBRMaterial();
        var props = objDef.getChildNode("Properties70");
        if (this._templates["Material"]) this._applyMaterialProps(material, this._templates["Material"]);
        if (props) this._applyMaterialProps(material, props.children);
        return material;
    },

    _applyMaterialProps: function(target, props)
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
    },

    _processConnections: function()
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
            var child = this._objects[childUID];
            var parent = this._objects[parentUID];

            // why would parent be null?
            if (child && parent) {
                //console.log(childUID + " -> " + parentUID);
                //console.log(child.toString() + " -> " + parent.toString());

                switch (linkType) {
                    // others not currently supported
                    case "OO":
                        this._connectOO(child, parent, childUID, parentUID);
                        break;
                }

            }
        }

        for (var key in this._modelInstanceSetups) {
            if (this._modelInstanceSetups.hasOwnProperty(key)) {
                var setup = this._modelInstanceSetups[key];
                var materials = [];

                for (var i = 0; i < setup.materialsIDs.length; ++i) {
                    var id = setup.materialsIDs[i];
                    materials.push(setup.materials[id]);
                }

                setup.modelInstance.init(setup.model, materials);
                setup.parent.attach(setup.modelInstance);
            }
        }
    },

    _connectOO: function(child, parent, childUID, parentUID)
    {
        if (child instanceof HX.FBXParser.DummyNode) {
            if (child.child) {
                this._connectOO(child.child, parent, parentUID);
            }
            else {
                child.parent = parent;
                child.parentUID = parentUID;
            }
        }
        else if (parent instanceof HX.FBXParser.DummyNode) {
            if (parent.useTransform)
                child.transformationMatrix = parent.transformationMatrix;

            if (parent.parent)
                this._connectOO(child, parent.parent, parent.parentUID);
            else
                parent.child = child;
        }
        else if (child instanceof HX.ModelInstance) {
            // why is parent undefined all of a sudden?
            this._modelInstanceSetups[childUID].parent = parent;
        }
        else if (child instanceof HX.SceneNode) {
            parent.attach(child);
        }
        else if (child instanceof HX.Model) {
            this._modelInstanceSetups[parentUID].materialsIDs = this._modelMaterialIDs[childUID];
            this._modelInstanceSetups[parentUID].model = child;
        }
        else if (child instanceof HX.Material) {
            this._modelInstanceSetups[parentUID].materials.push(child);
        }
    }
};

HX.FBXParser.NodeRecord = function()
{
    this.name = "";
    this.data = [];
    this.children = [];
};

HX.FBXParser.NodeRecord.prototype =
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

HX.FBXParser.DummyNode = function()
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

HX.FBXParser.DummyNode.prototype = Object.create(HX.Transform.prototype);

HX.FBXParser.DataElement = function()
{
    this.typeCode = null;
    this.value = null;
};

HX.FBXParser.DataElement.INT16 = "Y";
HX.FBXParser.DataElement.BOOLEAN = "C";
HX.FBXParser.DataElement.INT32 = "I";
HX.FBXParser.DataElement.FLOAT = "F";
HX.FBXParser.DataElement.DOUBLE = "D";
HX.FBXParser.DataElement.INT64 = "L";

HX.FBXParser.DataElement.BOOLEAN_ARRAY = "b";
HX.FBXParser.DataElement.INT32_ARRAY = "i";
HX.FBXParser.DataElement.FLOAT_ARRAY = "f";
HX.FBXParser.DataElement.DOUBLE_ARRAY = "d";
HX.FBXParser.DataElement.INT64_ARRAY = "l";

HX.FBXParser.DataElement.STRING = "S";
HX.FBXParser.DataElement.RAW = "R";

HX.FBXParser.STRING_DEMARCATION = String.fromCharCode(0, 1);

HX.FBXParser.Mapping =
{
    NONE: 0,
    BY_POLYGON_VERTEX: 1,
    BY_CONTROL_POINT: 2,
    BY_POLYGON: 3,
    ALL_SAME: 4
};

HX.FBXParser.MeshData = function()
{
    this.vertices = null;
    this.hasColor = false;
    this.hasUVs = false;
    this.hasNormals = false;
    this.numMaterials = 0;
};

HX.FBXParser.Vertex = function()
{
    this.pos = new HX.Float4();
    this.uv = null;
    this.normal = null;
    this.color = null;
    this.materialIndex = 0;
    this._hash = null;

    this.lastVertex = false;
};

HX.FBXParser.Vertex.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash) {
            var str = this.materialIndex + "/" + this.pos.x + "/" + this.pos.y + "/" + this.pos.z;

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