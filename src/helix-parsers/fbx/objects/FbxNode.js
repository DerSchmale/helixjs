HX.FbxNode = function()
{
    HX.FbxObject.call(this);
    this.RotationOffset = null;
    this.RotationPivot = null;
    this.ScalingOffset = null;
    this.ScalingPivot = null;
    this.RotationOrder = 0;
    this.PreRotation = null;
    this.PostRotation = null;
    this.InheritType = 0;
    this.GeometricTranslation = null;
    this.GeometricRotation = null;
    this.GeometricScaling = null;
    this["Lcl Translation"] = null;
    this["Lcl Rotation"] = null;
    this["Lcl Scaling"] = null;
    this.Visibility = true;

    this.type = null;
    this.children = null;
    this.skeleton = null;
    this.defaultAttribute = null;
    this.attributes = null;
    this.mesh = null;
    this.materials = null;
    this.animationCurveNodes = null;
};

HX.FbxNode.prototype = Object.create(HX.FbxObject.prototype,
    {
        numChildren: {
            get: function ()
            {
                return this.children? this.children.length : 0;
            }
        }
    }
);

HX.FbxNode.prototype.getChild = function(i)
{
    return this.children[i];
};

HX.FbxNode.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxNode) {
        //if (obj.type === "Null") return;

        if (obj.type === "Root") {
            this.skeleton = obj;
        }
        else {
            this.children = this.children || [];
            this.children.push(obj);
            obj.parent = this;
        }
    }
    else if (obj instanceof HX.FbxNodeAttribute) {
        this.defaultAttribute = this.defaultAttribute || obj;
        this.attributes = this.attributes || [];
        this.attributes.push(obj);
    }
    else if (obj instanceof HX.FbxMesh) {
        this.mesh = obj;
    }
    else if (obj instanceof HX.FbxMaterial) {
        this.materials = this.materials || [];
        this.materials.push(obj);
    }
    else if (obj instanceof HX.FbxTrashNode) {
        // silently ignore it
    }
    else {
        throw new Error("Incompatible child object " + obj.toString() + " for " + this.type);
    }
};

HX.FbxNode.prototype.connectProperty = function(obj, propertyName)
{
    if (obj instanceof HX.FbxAnimationCurveNode) {
        this.animationCurveNodes = this.animationCurveNodes || {};
        this.animationCurveNodes[propertyName] = obj;
        obj.propertyName = propertyName;
    }
};

HX.FbxNode.prototype.toString = function() { return "[FbxNode(name="+this.name+", type="+this.type+")]"; };