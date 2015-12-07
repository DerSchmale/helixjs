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
            console.log("Error parsing FBX " + err);
            if (onFail) onFail(err);
            return;
        }

        console.log("Parsing complete in " + (Date.now() - time) + "ms");

        onComplete(target);
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
            if (numProperties !== 0 || propertyListLen !== 0 || nameLen !== 0) throw "Invalid null node!";
            return null;
        }

        var record = new HX.FBXParser.NodeRecord();
        record.name = data.getString(nameLen);

        // forget children and properties
        if (this._isIrrelevantNode(record.name)) {
            data.offset = endOffset;
            return record;
        }

        var str = "";
        for (var i = 0; i < lvl; ++i)
            str += "\t";

        console.log(str + record.name);

        for (var i = 0; i < numProperties; ++i) {
            var dataElm = this._parseDataElement();
            record.data.push(dataElm);
            if (dataElm.typeCode === "L")
                console.log(str + "[data] " + dataElm.typeCode + " : 0x" + dataElm.value.U.toString(16) + " 0x" + dataElm.value.L.toString(16));
            else if (dataElm.typeCode === dataElm.typeCode.toUpperCase() && dataElm.typeCode !== HX.FBXParser.DataElement.RAW)
                console.log(str + "[data] " + dataElm.typeCode + " : " + dataElm.value);
            else
                console.log(str + "[data] " + dataElm.typeCode + " : [array object]");
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
                    throw "Unknown data type code " + type;
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
                    throw "Unknown data type code " + type;
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
                //console.log(UID.toString(16), obj);
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
        // these should eventually apply stuff to Model objects
        var subclass = objDef.data[2].value;
        var obj;

        switch(subclass) {
            case "Light":
                // lights not supported at this point
                break;
            case "Camera":
                // camera not supported at this point
                break;
        }

        return obj;
    },

    _processModel: function(objDef)
    {
        var subclass = objDef.data[2].value;
        var obj;

        switch(subclass) {
            case "Light":
                // lights not supported at this point
                break;
            case "Camera":
                // camera not supported at this point
                break;
            case "Mesh":
                obj = this._processMeshModel(objDef);
        }

        if (obj) {
            var props = objDef.getChildNode("Properties70");
            if (this._templates["Model"]) this._applyModelProps(obj, this._templates["Model"]);
            if (props) this._applyModelProps(obj, props.children);
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
                    target.scale.x = prop.data[4].value * .01;
                    target.scale.y = prop.data[5].value * .01;
                    target.scale.z = prop.data[6].value * .01;
                    break;
                case "Lcl Translation":
                    target.position.x = prop.data[4].value;
                    target.position.y = prop.data[5].value;
                    target.position.z = prop.data[6].value;
                    break;
                case "InheritType":
                    if (prop.data[4].value != 1)
                        throw "Unsupported InheritType (must be 1)";
            }
        }
    },

    _processMeshModel: function(objDef)
    {
        // model and materials will be assigned later
        var node = new HX.ModelInstance();
        return node;
    },

    _processMeshGeometry: function(objDef)
    {
        var modelData = new HX.ModelData();
        var vertexData = objDef.getChildNode("Vertices").data[0].value;
        var indexData = objDef.getChildNode("PolygonVertexIndex").data[0].value;
        var meshData = HX.MeshData.createDefaultEmpty();
        var vertices = [];
        var i, j = 0;
        var stride = HX.MeshData.DEFAULT_VERTEX_SIZE;

        for (i = 0; i < vertexData.length; i += 3) {
            vertices[j] = vertexData[i];
            vertices[j + 1] = vertexData[i + 1];
            vertices[j + 2] = vertexData[i + 2];

            for (var k = 3; k < stride; ++k)
                vertices[j + k] = 0.0;

            j += stride;
        }

        i = 0;
        j = 0;
        var len = indexData.length;
        var indices = [];

        while (i < len) {
            var baseIndex = indexData[i];
            var index1 = indexData[i + 1];
            i += 2;
            var newPoly = false;

            while (!newPoly) {
                var index2 = indexData[i++];
                indices[j] = baseIndex;
                indices[j + 1] = index1;
                if (index2 < 0) {
                    index2 = -index2 - 1;
                    newPoly = true;
                }
                indices[j + 2] = index2;
                j += 3;
                index1 = index2;
            }
        }

        meshData.setVertexData(vertices);
        meshData.setIndexData(indices);

        var generator = new HX.NormalTangentGenerator();
        generator.generate(meshData);

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
            var parentUID = c.data[2].value.L;
            var child = this._objects[c.data[1].value.L];
            var parent = this._objects[parentUID];

            if (child) {
                switch (linkType) {
                    // others not currently supported
                    case "OO":
                        if (child instanceof HX.ModelInstance) {
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
                        break;
                }

            }
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