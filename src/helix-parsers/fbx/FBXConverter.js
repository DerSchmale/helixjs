// Could also create an ASCII deserializer
HX.FBXConverter = function()
{

};

HX.FBXConverter.prototype =
{
    convert: function(rootNode, target)
    {
        this._convertGroupNode(rootNode, target);
    },

    // handles object of type FbxNode
    _convertNode: function(fbxNode)
    {
        var hxNode;

        if (fbxNode.mesh) {
            hxNode = new HX.ModelInstance();
            this._convertModelMesh(fbxNode, hxNode);
        }

        if (fbxNode.children && fbxNode.children.length > 0) {
            hxNode = new HX.GroupNode();
            this._convertGroupNode(fbxNode, hxNode);
        }

        this._convertSceneGraphObject(fbxNode, hxNode);

        // TODO: handle lights, cameras, etc
        return hxNode;
    },

    _convertGroupNode: function(fbxNode, hxNode)
    {
        var len = fbxNode.children.length;
        for (var i = 0; i < len; ++i) {
            var childNode = this._convertNode(fbxNode.children[i]);
            hxNode.attach(childNode);
        }
    },

    _convertModelMesh: function(fbxNode, hxNode)
    {

    },

    _convertSceneGraphObject: function(fbxNode, hxNode)
    {
        var matrix = new HX.Matrix4x4();

        if (hxNode.ScalingPivot) matrix.appendTranslation(HX.Float4.negate(hxNode.ScalingPivot));
        if (hxNode["Lcl Scaling"]) matrix.appendScale(hxNode["Lcl Scaling"].x, hxNode["Lcl Scaling"].y, hxNode["Lcl Scaling"].z);
        if (hxNode.ScalingPivot) matrix.appendTranslation(hxNode.ScalingPivot);
        if (scalingOffset) matrix.appendTranslation(scalingOffset.x, scalingOffset.y, scalingOffset.z);

        if (rotationPivot) matrix.appendTranslation(-rotationPivot);
        if (preRotation) matrix.appendRotationQuaternion(preRotation);
        if (lclRotation) matrix.appendRotationQuaternion(lclRotation);
        if (postRotation) matrix.appendRotationQuaternion(postRotation);
        if (rotationPivot) matrix.appendTranslation(rotationPivot);
        if (rotationOffset) matrix.appendTranslation(rotationOffset);

        if (lclTranslation) matrix.appendTranslation(lclTranslation);

        // todo: geometric transform should be on Mesh geometry!
        if (geometricTranslation) matrix.prependTranslation(geometricTranslation);

        target.transformationMatrix = matrix;
    }
};