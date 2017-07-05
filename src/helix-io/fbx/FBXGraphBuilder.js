import {FbxNode} from "./objects/FbxNode";
import {FbxNodeAttribute} from "./objects/FbxNodeAttribute";
import {FbxMaterial} from "./objects/FbxMaterial";
import {FbxVideo} from "./objects/FbxVideo";
import {FbxFileTexture} from "./objects/FbxFileTexture";
import {FbxSkin} from "./objects/FbxSkin";
import {FbxAnimStack} from "./objects/FbxAnimStack";
import {FbxAnimLayer} from "./objects/FbxAnimLayer";
import {FbxAnimationCurve} from "./objects/FbxAnimationCurve";
import {FbxTime} from "./objects/FbxTime";
import {FbxAnimationCurveNode} from "./objects/FbxAnimationCurveNode";
import {FbxTrashNode} from "./objects/FbxTrashNode";
import {FbxPose, FbxPoseNode} from "./objects/FbxPose";
import {FbxMesh} from "./objects/FbxMesh";
import {FbxLayerElement} from "./objects/FbxLayerElement";
import {FbxCluster} from "./objects/FbxCluster";
// Could also create an ASCII deserializer
/**
 *
 * @constructor
 */
function FBXGraphBuilder()
{
    this._settings = null;
    this._templates = null;
    this._objects = null;
    this._rootNode = null;
    this._animationStack = null;
    this._bindPoses = null;
};

FBXGraphBuilder.prototype =
{
    get bindPoses() { return this._bindPoses; },
    get sceneRoot() { return this._rootNode; },
    get animationStack() { return this._animationStack; },

    build: function(rootRecord, settings)
    {
        this._settings = settings;
        this._templates = {};
        this._objects = {};
        this._bindPoses = null;

        // fbx scene node
        this._rootNode = new FbxNode();
        this._rootNode.name = "hx_rootNode";

        // animations, we'll turn them into a SkeletonBlendTree eventually
        this._animationStack = null;

        // handle templates
        this._processTemplates(rootRecord.getChildByName("Definitions"));
        this._processObjects(rootRecord.getChildByName("Objects"));
        this._processConnections(rootRecord.getChildByName("Connections"));
    },

    _processTemplates: function(definitions)
    {
        var len = definitions.children.length;
        for (var i = 0; i < len; ++i) {
            var child = definitions.children[i];
            if (child.name === "ObjectType") {
                var template = child.getChildByName("PropertyTemplate");
                if (!template) continue;
                var subclass = template.data[0];
                var type = child.data[0];
                var node = this._createNode(type, subclass, template);

                if (node)
                    this._assignProperties(node, template.getChildByName("Properties70"));

                this._templates[type] = node;
            }
        }
    },

    _processObjects: function(definitions)
    {
        var len = definitions.children.length;
        for (var i = 0; i < len; ++i) {
            var obj = null;
            var node = definitions.children[i];
            switch (node.name) {
                case "Geometry":
                    obj = this._processGeometry(node);
                    break;
                case "NodeAttribute":
                    // at this point, we're only supporting meshes
                    // TODO: FbxNodeAttribute will be cast to FbxCamera etc
                    obj = new FbxNodeAttribute();
                    obj.type = node.data[2];
                    break;
                case "Model":
                    obj = new FbxNode();
                    obj.type = node.data[2];
                    // not sure if this is correct
                    break;
                case "Material":
                    obj = new FbxMaterial();
                    break;
                case "Video":
                    obj = new FbxVideo();
                    var rel = node.getChildByName("RelativeFilename");
                    obj.relativeFilename = rel? rel.data[0] : null;
                    break;
                case "Texture":
                    obj = new FbxFileTexture();
                    var rel = node.getChildByName("RelativeFilename");
                    obj.relativeFilename = rel? rel.data[0] : null;
                    break;
                case "Pose":
                    obj = this._processPose(node);
                    this._bindPoses = this._bindPoses || [];
                    this._bindPoses.push(obj);
                    break;
                case "Deformer":
                    if (node.data[2] === "Skin")
                        obj = new FbxSkin();
                    else
                        obj = this._processCluster(node);
                    break;
                case "AnimationStack":
                    obj = new FbxAnimStack();
                    this._animationStack = obj;
                    break;
                case "AnimationLayer":
                    obj = new FbxAnimLayer();
                    break;
                case "AnimationCurve":
                    obj = new FbxAnimationCurve();
                    this._assignFlatData(obj, node);
                    var arr = [];
                    for (var j = 0; j < obj.KeyTime.length; ++j)
                        arr[j] = new FbxTime(obj.KeyTime[j]);
                    obj.KeyTime = arr;
                    break;
                case "AnimationCurveNode":
                    obj = new FbxAnimationCurveNode();
                    break;
                default:
                    // deal with some irrelevant nodes
                    obj = new FbxTrashNode();
            }

            if (obj) {
                var uid = node.data[0];
                obj.name = this._getObjectDefName(node);
                obj.UID = uid;

                if (this._templates[node.name])
                    obj.copyProperties(this._templates[node.name]);

                this._assignProperties(obj, node.getChildByName("Properties70"));

                this._objects[uid] = obj;
            }
        }
    },

    _processPose: function(objDef)
    {
        var pose = new FbxPose();
        pose.type = objDef.data[2];
        for (var i = 0; i < objDef.children.length; ++i) {
            var node = objDef.children[i];
            if (node.name === "PoseNode") {
                var poseNode = new FbxPoseNode();
                poseNode.targetUID = node.getChildByName("Node").data[0];
                poseNode.matrix = new HX.Matrix4x4(node.getChildByName("Matrix").data[0]);
                pose.poseNodes.push(poseNode);
            }
        }
        return pose;
    },

    _processConnections: function(definitions)
    {
        var len = definitions.children.length;
        for (var i = 0; i < len; ++i) {
            var node = definitions.children[i];
            var mode = node.data[0];
            var child = this._objects[node.data[1]];
            var parent = this._objects[node.data[2]] || this._rootNode;

            //console.log(child.toString(), node.data[1], " -> ", parent.toString(), node.data[2], node.data[3]);

            if (mode === "OO")
                parent.connectObject(child);
            else if (mode === "OP")
                parent.connectProperty(child, node.data[3]);
        }
    },

    _createNode: function(name, subclass)
    {
        if (name === "Material")
            return new FbxMaterial();

        if (HX[subclass]) return new HX[subclass];
    },

    _assignFlatData: function(target, node)
    {
        var len = node.children.length;
        for (var i = 0; i < len; ++i) {
            var prop = node.children[i];
            if (target.hasOwnProperty(prop.name)) {
                target[prop.name] = prop.data[0];
            }
        }
    },

    _assignProperties: function(target, properties)
    {
        if (!properties) return;

        var len = properties.children.length;
        for (var i = 0; i < len; ++i) {
            var prop = properties.children[i];
            if (target.hasOwnProperty(prop.data[0])) {
                target[prop.data[0]] = this._getPropertyValue(prop);
            }
        }
    },

    _getPropertyValue: function(prop)
    {
        var data = prop.data;
        switch (data[1]) {
            case "Vector3D":
            case "Lcl Translation":
            case "Lcl Scaling":
            case "Lcl Rotatfion":
                return new HX.Float4(data[4], data[5], data[6]);
            case "bool":
            case "Visibility":
            case "Visibility Inheritance":
                return data[4] !== 0;
            case "ColorRGB":
            case "Color":
                return new HX.Color(data[4], data[5], data[6]);
            case "enum":
            case "double":
            case "float":
            case "int":
            case "KString":
                return data[4];
            case "KTime":
                return new FbxTime(data[4]);
            case "object":
                return null;    // TODO: this will be connected using OP?
        }
    },

    _processGeometry: function(objDef)
    {
        var geometry = new FbxMesh();
        var len = objDef.children.length;
        var layerMap = {};

        for (var i = 0; i < len; ++i) {
            var child = objDef.children[i];
            switch (child.name) {
                case "Vertices":
                    geometry.vertices = child.data[0];
                    break;
                case "PolygonVertexIndex":
                    geometry.indices = child.data[0];
                    break;
                case "Layer":
                    geometry.layerElements = geometry.layerElements || {};
                    this._processLayer(child, layerMap, geometry.layerElements);
                    break;
                default:
                    if (!layerMap[child.name])
                        layerMap[child.name] = child;
                    break;
            }
        }
        return geometry;
    },

    _processLayer: function(objDef, layerMap, elements)
    {
        var len = objDef.children.length;
        for (var i = 0; i < len; ++i) {
            var layerElement = objDef.children[i];
            if (layerElement.name !== "LayerElement") continue;
            var name = layerElement.getChildByName("Type").data[0];
            // do not allow multiple sets
            if (!elements[layerElement.type]) {
                var layerElement = this._processLayerElement(layerMap[name]);
                elements[layerElement.type] = layerElement;
            }
        }
    },

    _processLayerElement: function(objDef)
    {
        var layerElement = new FbxLayerElement();
        var len = objDef.children.length;

        for (var i = 0; i < len; ++i) {
            var node = objDef.children[i];
            switch(node.name) {
                case "MappingInformationType":
                    var mapMode = node.data[0];
                    layerElement.mappingInformationType =   mapMode === "ByPolygonVertex"?  FbxLayerElement.MAPPING_TYPE.BY_POLYGON_VERTEX :
                                                            mapMode === "ByPolygon"?        FbxLayerElement.MAPPING_TYPE.BY_POLYGON :
                                                            mapMode === "AllSame"?          FbxLayerElement.MAPPING_TYPE.ALL_SAME :
                                                                                            FbxLayerElement.MAPPING_TYPE.BY_CONTROL_POINT;
                    break;
                case "ReferenceInformationType":
                    layerElement.referenceInformationType = node.data[0] === "Direct"? FbxLayerElement.REFERENCE_TYPE.DIRECT : FbxLayerElement.REFERENCE_TYPE.INDEX_TO_DIRECT;
                    break;
                case "Normals":
                case "Colors":
                case "UV":
                case "Smoothing":
                    layerElement.type = node.name;
                    layerElement.directData = node.data[0];
                    break;
                case "NormalsIndex":
                case "ColorIndex":
                case "UVIndex":
                case "SmoothingIndex":
                    layerElement.indexData = node.data[0];
                    break;
                case "Materials":
                    layerElement.type = node.name;
                    layerElement.indexData = node.data[0];
                    break;
            }
        }

        return layerElement;
    },

    _getObjectDefName: function(objDef)
    {
        return objDef.data[1].split(FBXGraphBuilder._STRING_DEMARCATION)[0];
    },

    _processCluster: function(objDef)
    {
        var cluster = new FbxCluster();
        var len = objDef.children.length;

        for (var i = 0; i < len; ++i) {
            var node = objDef.children[i];
            switch(node.name) {
                case "Transform":
                    cluster.transform = new HX.Matrix4x4(node.data[0]);
                    break;
                case "TransformLink":
                    cluster.transformLink = new HX.Matrix4x4(node.data[0]);
                    break;
                case "Indexes":
                    cluster.indices = node.data[0];
                    break;
                case "Weights":
                    cluster.weights = node.data[0];
                    break;
            }
        }

        return cluster;
    }
};

FBXGraphBuilder._STRING_DEMARCATION = String.fromCharCode(0, 1);

export {FBXGraphBuilder};