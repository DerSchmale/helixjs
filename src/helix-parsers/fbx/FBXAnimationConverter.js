// Could also create an ASCII deserializer
HX.FBXAnimationConverter = function()
{
    this._skinningData = null;
    this._jointUIDLookUp = null;
    this._skeleton = null;
    this._fakeJointIndex = -1;
    this._animationClips = null;
};

HX.FBXAnimationConverter.prototype =
{
    get skeleton()
    {
        return this._skeleton;
    },

    get animationClips()
    {
        return this._animationClips;
    },

    get fakeJointIndex()
    {
        return this._fakeJointIndex;
    },

    getJointBinding: function(ctrlPointIndex)
    {
        return this._skinningData[ctrlPointIndex];
    },

    convertSkin: function (fbxSkin)
    {
        this._skeleton = new HX.Skeleton();
        // skinning data contains a list of bindings per control point
        this._skinningData = [];
        this._jointUIDLookUp = {};

        var len = fbxSkin.clusters.length;

        this._controlPoints = [];

        for (var i = 0; i < len; ++i) {
            var cluster = fbxSkin.clusters[i];
            // a bit annoying, but this way, if there's multiple roots (by whatever chance), we cover them all
            this._addJointsToSkeleton(this._getRootNodeForCluster(cluster));
            var jointData = this._jointUIDLookUp[cluster.limbNode.UID];
            this._assignInverseBindPose(jointData.joint, cluster);
            this._assignJointBinding(cluster, jointData.index);
        }

        var fakeJoint = new HX.SkeletonJoint();
        this._fakeJointIndex = this._skeleton.numJoints;
        this._skeleton.addJoint(fakeJoint);
    },

    convertClips: function(fbxAnimationStack, settings)
    {
        this._frameRate = settings.frameRate;

        this._animationClips = [];

        // TODO: If multiple takes are supported, these would need to be separate clips as well
        for (var i = 0; i < fbxAnimationStack.layers.length; ++i) {
            var numFrames = fbxAnimationStack.LocalStop.getFrameCount(this._frameRate) - fbxAnimationStack.LocalStart.getFrameCount(this._frameRate) + 1;
            var layers = fbxAnimationStack.layers;
            for (var j = 0; j < layers.length; ++j) {
                var clip = this._convertLayer(layers[j], numFrames);
                this._animationClips.push(clip);
            }
        }
    },

    _addJointsToSkeleton: function(rootNode)
    {
        // already added to the skeleton
        if (rootNode.data === true) return;
        rootNode.data = true;
        this._convertSkeletonNode(rootNode, -1);
    },

    _convertSkeletonNode: function(fbxNode, parentIndex)
    {
        var joint = new HX.SkeletonJoint();
        joint.parentIndex = parentIndex;

        var index = this._skeleton.numJoints;
        this._skeleton.addJoint(joint);

        this._jointUIDLookUp[fbxNode.UID] = { joint: joint, index: index };

        if (fbxNode.animationCurveNodes) {
            var numNodes = fbxNode.animationCurveNodes.length;
            for (var i = 0; i < numNodes; ++i) {
                var node = fbxNode.animationCurveNodes[i];
                // store the joint index as curve node data
                node.data = index;
            }
        }

        for (var i = 0; i < fbxNode.numChildren; ++i) {
            this._convertSkeletonNode(fbxNode.getChild(i), index);
        }
    },

    _assignJointBinding: function(cluster, jointIndex)
    {
        if (!cluster.indices) return;
        var len = cluster.indices.length;

        for (var i = 0; i < len; ++i) {
            if (cluster.weights[i] > 0) {
                var ctrlPointIndex = cluster.indices[i];
                this._controlPoints[ctrlPointIndex] = true;
                var skinningData = this._skinningData[ctrlPointIndex] = this._skinningData[ctrlPointIndex] || [];
                var binding = new HX.FBXModelInstanceConverter._JointBinding();
                binding.jointIndex = jointIndex;
                binding.jointWeight = cluster.weights[i];
                skinningData.push(binding);
            }
        }
    },

    _assignInverseBindPose: function (joint, cluster)
    {
        joint.inverseBindPose.copyFrom(cluster.transformLink);
        joint.inverseBindPose.invert();
        joint.inverseBindPose.prepend(cluster.transform);
    },

    // this uses the logic that one of the clusters is bound to have the root node assigned to them
    // not sure if this is always the case, however
    _getRootNodeForCluster: function(cluster)
    {
        var limbNode = cluster.limbNode;
        while (limbNode) {
            if (limbNode.type === "Root")
                return limbNode;
            limbNode = limbNode.parent;
        }
        throw new Error("No Root node found!");
    },

    _convertLayer: function (layer, numFrames)
    {
        // TODO: make framerate an overridable option

        var clip = new HX.SkeletonClip();
        clip.frameRate = this._frameRate;

        // convert key frames to sized frames
        this._convertToFrames(layer, numFrames);

        for (var i = 0; i < numFrames; ++i)
            clip.addFrame(this._convertFrame(layer, i));

        return clip;
    },

    _convertToFrames: function(layer, numFrames)
    {
        var numCurveNodes = layer.curveNodes.length;
        for (var i = 0; i < numCurveNodes; ++i) {
            var node = layer.curveNodes[i];
            // the order of parsing is inefficient
            // need to break up curves first into keyframes, then assign them
            for (var key in node.curves) {
                if (!node.curves.hasOwnProperty(key)) continue;
                var curve = node.curves[key];
                this._convertCurveToFrames(curve, numFrames);
            }
        }
    },

    _convertCurveToFrames: function(curve, numFrames)
    {
        var time = 0.0;
        var j = 0;
        // ms per frame
        var frameDuration = 1000.0 / this._frameRate;
        var numKeyFrames = curve.KeyTime.length;
        var frameData = [];

        for (var i = 0; i < numFrames; ++i) {
            time += frameDuration;
            while (j < numKeyFrames && curve.KeyTime[j].milliseconds < time) {
                ++j;
            }

            // clamp to extremes (shouldn't happen, I think?)
            if (j === 0)
                frameData.push(curve.KeyValueFloat[j]);
            else if (j === numKeyFrames)
                frameData.push(curve.KeyValueFloat[j - 1]);
            else {
                var keyTime = curve.KeyTime[j].milliseconds;
                var prevTime = curve.KeyTime[j - 1].milliseconds;
                var t = (time - prevTime) / (keyTime - prevTime);
                var next = curve.KeyValueFloat[j];
                var prev = curve.KeyValueFloat[j - 1];
                frameData.push(prev + (next - prev) * t);
            }
        }

        curve.data = frameData;
    },

    _convertFrame: function(layer, frame)
    {
        var skeletonPose = new HX.SkeletonPose();

        var numCurveNodes = layer.curveNodes.length;
        for (var i = 0; i < numCurveNodes; ++i) {
            var node = layer.curveNodes[i];
            var tempJointPose = new HX.FBXAnimationConverter._JointPose();
            var target = tempJointPose[node.propertyName];
            // the order of parsing is inefficient
            // need to break up curves first into keyframes, then assign them
            for (var key in node.curves) {
                if (!node.curves.hasOwnProperty(key)) continue;
                var value = node.curves[key].data[frame];
                switch (key) {
                    case "d|X":
                        target.x = value;
                        break;
                    case "d|Y":
                        target.y = value;
                        break;
                    case "d|Z":
                        target.z = value;
                        break;
                }

            }

            var jointPose = new HX.SkeletonJointPose();
            jointPose.translation.copyFrom(tempJointPose["Lcl Translation"]);
            var rot = tempJointPose["Lcl Rotation"];
            jointPose.orientation.fromXYZ(rot.x, rot.y, rot.z);
            skeletonPose.jointPoses[node.data] = jointPose;
        }
    }
};

HX.FBXAnimationConverter._JointPose = function()
{
    this["Lcl Translation"] = new HX.Float4(0.0, 0.0, 0.0);
    this["Lcl Rotation"] = new HX.Float4(0.0, 0.0, 0.0);
    this["Lcl Scaling"] = new HX.Float4(1.0, 1.0, 1.0);
};