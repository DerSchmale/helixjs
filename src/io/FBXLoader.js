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
};

HX.FBXParser.prototype =
{
    parse: function(data, target, onComplete, onFail)
    {
        var time = Date.now();
        this._data = new HX.DataStream(data);

        this._objects = [];
        // the rootNode
        this._objects[0] = target;

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
                prop.value = {
                    L: this._data.getInt32(),
                    U: this._data.getInt32()
                };
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
            var UID = objDef.data[0].value.L; // haven't seen 32MSBs being used
            var obj;

            switch (objDef.name) {
                case "NodeAttribute":
                    obj = this._processNodeAttribute(objDef);
                    break;
                case "Geometry":
                    obj = this._processMeshGeometry(objDef);
                    break;
                case "Model":
                    obj = this._processModel(objDef);
                    break;
                case "Material":
                    obj = this._processMaterial(objDef);
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

    _processNodeAttribute: function(objDef)
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

    _processModel: function(objDef)
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
                obj = this._processMeshModel(objDef);
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

    _processMeshModel: function(objDef)
    {
        // model and materials will be assigned later
        var node = new HX.ModelInstance();
        return node;
    },

    _generateExpandedMeshData: function(objDef)
    {
        var meshData = new HX.FBXParser.MeshData();
        var indexData = objDef.getChildNode("PolygonVertexIndex").data[0].value;
        var vertexData = objDef.getChildNode("Vertices").data[0].value;
        var normalData = objDef.getChildNode("LayerElementNormal");
        var normalRefMode = 0; // 0 = no normals, 1 = direct, 2 = index to direct
        var normalMapMode = 0; // 0 = no normals, 1 = polygon, 2 = control point
        var vertices = [];
        var len = indexData.length;

        if (normalData) {
            normalRefMode = normalData.getChildNode("ReferenceInformationType").data[0].value === "Direct"? 1 : 2;
            normalMapMode = normalData.getChildNode("MappingInformationType").data[0].value === "ByPolygonVertex"? 1 : 2;
            normalData = normalData.getChildNode("Normals").data[0].value;
            meshData.hasNormals = true;
        }

        // todo: if index mode is direct, just query data there

        for (var i = 0; i < len; ++i) {
            var index = indexData[i];
            var v = new HX.FBXParser.Vertex();

            if (index < 0) {
                index = -index - 1;
                v.lastVertex = true;
            }

            index *= 3;

            v.x = vertexData[index];
            v.y = vertexData[index + 1];
            v.z = vertexData[index + 2];

            if (normalRefMode === 1) {
                var normIndex = normalMapMode === 2? index: i * 3;
                v.normalX = normalData[normIndex];
                v.normalY = normalData[normIndex + 1];
                v.normalZ = normalData[normIndex + 2];
            }

            vertices[i] = v;
        }

        meshData.vertices = vertices;

        return meshData;
    },

    _processMeshGeometry: function(objDef)
    {
        var expandedMesh = this._generateExpandedMeshData(objDef);
        var indexLookUp = [];
        var indices = [];
        var vertices = [];

        var indexCounter = 0;
        var stride = HX.MeshData.DEFAULT_VERTEX_SIZE;
        var hasNormals = expandedMesh.hasNormals;

        function getOrAddIndex(v)
        {
            var hash = v.getHash();

            if (indexLookUp.hasOwnProperty(hash))
                return indexLookUp[hash];

            // new unique vertex!
            var k = indexCounter * stride;
            var realIndex = indexCounter++;
            indexLookUp[hash] = realIndex;

            // position
            vertices[k] = v.x;
            vertices[k + 1] = v.y;
            vertices[k + 2] = v.z;

            // normal
            vertices[k + 3] = hasNormals? v.normalX : 0;
            vertices[k + 4] = hasNormals? v.normalY : 0;
            vertices[k + 5] = hasNormals? v.normalZ : 0;

            // tangent
            vertices[k + 6] = 0;
            vertices[k + 7] = 0;
            vertices[k + 8] = 0;

            // bitangent flipsign
            vertices[k + 9] = 0;

            // UV
            vertices[k + 10] = 0;
            vertices[k + 11] = 0;

            return realIndex;
        }

        // todo: change this expansion
        var i = 0, j = 0;
        var vertexData = expandedMesh.vertices;
        var len = vertexData.length;
        var realIndex0, realIndex1, realIndex2;

        // triangulate
        while (i < len) {
            realIndex0 = getOrAddIndex(vertexData[i]);
            realIndex1 = getOrAddIndex(vertexData[i+1]);

            i += 2;

            var v2;

            do {
                v2 = vertexData[i++];
                realIndex2 = getOrAddIndex(v2);

                indices[j] = realIndex0;
                indices[j + 1] = realIndex1;
                indices[j + 2] = realIndex2;

                j += 3;
                realIndex1 = realIndex2;
            } while (!v2.lastVertex);
        }

        var meshData = HX.MeshData.createDefaultEmpty();
        meshData.setVertexData(vertices);
        meshData.setIndexData(indices);

        var mode = HX.NormalTangentGenerator.MODE_TANGENTS;
        if (!expandedMesh.hasNormals) mode |= HX.NormalTangentGenerator.MODE_NORMALS;
        var generator = new HX.NormalTangentGenerator();
        generator.generate(meshData, mode);

        var modelData = new HX.ModelData();
        modelData.addMeshData(meshData);

        return new HX.Model(modelData);
    },

    _processMaterial: function(objDef)
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
        var modelInstanceMaterials = [];
        var modelInstanceModels = [];

        for (var i = 0; i < len; ++i) {
            var c = connections[i];
            var linkType = c.data[0].value;
            var childUID = c.data[1].value.L;
            var parentUID = c.data[2].value.L;
            var child = this._objects[childUID];
            var parent = this._objects[parentUID];

            console.log(childUID + " -> " + parentUID);
            console.log(child.toString() + " -> " + parent.toString());

            if (child) {
                switch (linkType) {
                    // others not currently supported
                    case "OO":
                        this._connectOO(child, parent, parentUID, modelInstanceMaterials, modelInstanceModels);
                        break;
                }

            }
        }
    },

    _connectOO: function(child, parent, parentUID, modelInstanceMaterials, modelInstanceModels)
    {
        if (child instanceof HX.FBXParser.DummyNode) {
            if (child.child) {
                this._connectOO(child.child, parent, parentUID, modelInstanceMaterials, modelInstanceModels);
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
                this._connectOO(child, parent.parent, parent.parentUID, modelInstanceMaterials, modelInstanceModels);
            else
                parent.child = child;
        }
        else if (child instanceof HX.SceneNode) {
            parent.attach(child);
        }
        else if (child instanceof HX.Model) {
            if (modelInstanceMaterials[parentUID])
                parent.init(child, modelInstanceMaterials[parentUID]);
            else
                modelInstanceModels[parentUID] = child;
        }
        else if (child instanceof HX.Material) {
            if (modelInstanceModels[parentUID])
                parent.init(modelInstanceModels[parentUID], child);
            else
                modelInstanceMaterials[parentUID] = child;
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

HX.FBXParser.MeshData = function()
{
    this.vertices = null;
    this.hasColor = false;
    this.hasNormals = false;
};

HX.FBXParser.Vertex = function()
{
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.u = 0;
    this.v = 0;
    this.normalX = 0;
    this.normalY = 0;
    this.normalZ = 0;
    this._hash = "";

    this.lastVertex = false;
};

HX.FBXParser.Vertex.prototype =
{
    // instead of actually using the values, we should use the indices as keys
    getHash: function()
    {
        if (!this._hash)
            this._hash = this.x + "/" + this.y + "/" + this.z + "/" + this.u + "/" + this.v + "/" + this.normalX + "/" + this.normalY + "/" + this.normalZ + "/";

        return this._hash;
    }
};