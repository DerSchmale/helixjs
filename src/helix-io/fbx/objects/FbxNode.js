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

    this._geometricMatrix = null;
    this._matrix = null;
};

HX.FbxNode.prototype = Object.create(HX.FbxObject.prototype,
    {
        numChildren:
        {
            get: function ()
            {
                return this.children? this.children.length : 0;
            }
        },

        geometryTransform:
        {
            get: function()
            {
                if (!this._geometricMatrix) {
                    this._geometricMatrix = new HX.Matrix4x4();
                    if (this.GeometricRotation || this.GeometricScaling || this.GeometricTranslation) {
                        var transform = new HX.Transform();
                        // for now there will be problems with this if several geometric transformations are used on the same geometry
                        if (this.GeometricRotation) {
                            var quat = new HX.Quaternion();
                            quat.fromEuler(this.GeometricRotation.x * HX.DEG_TO_RAD, this.GeometricRotation.y * HX.DEG_TO_RAD, this.GeometricRotation.z * HX.DEG_TO_RAD);
                            transform.rotation = quat;
                        }
                        if (this.GeometricScaling) transform.scale = this.GeometricScaling;
                        if (this.GeometricTranslation) transform.position = this.GeometricTranslation;
                        this._geometricMatrix.copyFrom(transform.transformationMatrix);
                    }
                }

                return this._geometricMatrix;
            }
        },

        matrix:
        {
            get: function()
            {
                if (!this._matrix) {
                    this._matrix = new HX.Matrix4x4();
                    var matrix = this._matrix;
                    if (this.ScalingPivot) matrix.appendTranslation(HX.Float4.negate(this.ScalingPivot));
                    var scale = this["Lcl Scaling"];
                    if (scale) matrix.appendScale(scale.x, scale.y, scale.z);
                    if (this.ScalingPivot) matrix.appendTranslation(this.ScalingPivot);
                    if (this.ScalingOffset) matrix.appendTranslation(this.ScalingOffset);

                    if (this.RotationPivot) matrix.appendTranslation(HX.Float4.negate(this.RotationPivot));
                    if (this.PreRotation) matrix.appendQuaternion(this._convertRotation(this.PreRotation));
                    if (this["Lcl Rotation"]) matrix.appendQuaternion(this._convertRotation(this["Lcl Rotation"]));
                    if (this.PostRotation) matrix.appendQuaternion(this._convertRotation(this.PostRotation));
                    if (this.RotationPivot) matrix.appendTranslation(this.RotationPivot);
                    if (this.RotationOffset) matrix.appendTranslation(this.RotationOffset);

                    if (this["Lcl Translation"]) matrix.appendTranslation(this["Lcl Translation"]);
                }

                return this._matrix;
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
        this.mesh.parent = this;
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

HX.FbxNode.prototype._convertRotation = function(v)
{
    var quat = new HX.Quaternion();
    quat.fromEuler(v.x * HX.DEG_TO_RAD, v.y * HX.DEG_TO_RAD, v.z * HX.DEG_TO_RAD);
    return quat;
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