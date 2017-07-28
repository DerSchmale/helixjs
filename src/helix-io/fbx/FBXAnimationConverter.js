import {FBXModelInstanceConverter} from "./FBXModelInstanceConverter";
// Could also create an ASCII deserializer
function FBXAnimationConverter()
{
    this._skinningData = null;
    this._jointUIDLookUp = null;
    this._skeleton = null;
    this._fakeJointIndex = -1;
    this._animationClips = null;
    this._frameRate = 24;
}

FBXAnimationConverter.prototype =
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

    convertSkin: function (fbxSkin, geometryMatrix)
    {
        this._skeleton = new HX.Skeleton();
        // skinning data contains a list of bindings per control point
        this._skinningData = [];
        this._jointUIDLookUp = {};

        var len = fbxSkin.clusters.length;

        for (var i = 0; i < len; ++i) {
            var cluster = fbxSkin.clusters[i];
            // a bit annoying, but this way, if there's multiple roots (by whatever chance), we cover them all
            this._addJointsToSkeleton(this._getRootNodeForCluster(cluster));
            var jointData = this._jointUIDLookUp[cluster.limbNode.UID];
            this._assignInverseBindPose(cluster, geometryMatrix, jointData.joint);
            this._assignJointBinding(cluster, jointData.index);
        }

        var fakeJoint = new HX.SkeletonJoint();
        this._fakeJointIndex = this._skeleton.numJoints;
        this._skeleton.addJoint(fakeJoint);

        // are joint poses local perhaps?
        /*for (var i = this._skeleton.numJoints - 1; i >= 0; --i) {
            var joint = this._skeleton.getJoint(i);

            if (joint.parentIndex >= 0) {
                var parent = this._skeleton.getJoint(joint.parentIndex);
                joint.inverseBindPose.prepend(parent.inverseBindPose);
            }
        }*/

        for (var key in this._jointUIDLookUp) {
            this._jointUIDLookUp[key].fbxNode.data = null;
        }
    },

    convertClips: function(fbxAnimationStack, fbxMesh, geometryMatrix, settings)
    {
        this._frameRate = settings.frameRate;

        this._animationClips = [];

        // TODO: If multiple takes are supported, these would need to be separate clips as well
        for (var i = 0; i < fbxAnimationStack.layers.length; ++i) {
            var layers = fbxAnimationStack.layers;
            for (var j = 0; j < layers.length; ++j) {
                var clip = this._convertLayer(layers[j]);
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

        this._jointUIDLookUp[fbxNode.UID] = { joint: joint, index: index, fbxNode: fbxNode };

        if (fbxNode.animationCurveNodes) {
            for (var key in fbxNode.animationCurveNodes) {
                if (fbxNode.animationCurveNodes.hasOwnProperty(key)) {
                    var node = fbxNode.animationCurveNodes[key];
                    // store the joint index as curve node data
                    node.data = index;
                }
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
                var skinningData = this._skinningData[ctrlPointIndex] = this._skinningData[ctrlPointIndex] || [];
                var binding = new FBXModelInstanceConverter._JointBinding();
                binding.jointIndex = jointIndex;
                binding.jointWeight = cluster.weights[i];
                skinningData.push(binding);
            }
        }
    },

    _assignInverseBindPose: function (cluster, geometryMatrix, joint)
    {
        // looks like Unreal uses this, along with cluster's limbnode transform to deform vertices?
        // in that case, should be able to apply this to bind pose instead, since it boils down to the same thing?
        joint.inverseBindPose.copyFrom(cluster.transformLink);
        joint.inverseBindPose.invertAffine();
        joint.inverseBindPose.prependAffine(cluster.transform);
        joint.inverseBindPose.prependAffine(geometryMatrix);
        //joint.inverseBindPose.append(this._settings.orientationMatrix);
    },

    _getLimbGlobalMatrix: function(node)
    {
        if (!node._globalMatrix) {
            node._globalMatrix = new HX.Matrix4x4();
            if (node.parent && node.parent.type === "LimbNode") {
                var parentMatrix = this._getLimbGlobalMatrix(node.parent);
                node._globalMatrix.multiply(parentMatrix, node.matrix);
            }
            else {
                node._globalMatrix.copyFrom(node.matrix);
            }
        }
        return node._globalMatrix;
    },

    // this uses the logic that one of the clusters is bound to have the root node assigned to them
    // not sure if this is always the case, however
    _getRootNodeForCluster: function(cluster)
    {
        var limbNode = cluster.limbNode;
        while (limbNode) {
            if (limbNode.type !== "LimbNode")
                return limbNode;
            limbNode = limbNode.parent;
        }
        throw new Error("No Root node found!");
    },

    _convertLayer: function (layer)
    {
        var keyFrames = this._convertToFrames(layer);
        // this._completeKeyFrames(keyFrames);
        return this._convertToClip(keyFrames);
    },

    _convertToFrames: function(layer)
    {
        var curves = [];
        var numCurveNodes = layer.curveNodes.length;

        for (var i = 0; i < numCurveNodes; ++i) {
            var node = layer.curveNodes[i];
            for (var key in node.curves) {
                if (!node.curves.hasOwnProperty(key)) continue;
                var curve = node.curves[key];
                curves.push({frames: this._addCurveToKeyFrame(curve), node: node});
            }
        }

        return curves;
    },

    _addCurveToKeyFrame: function(curve)
    {
        // ms per frame
        var numKeyFrames = curve.KeyTime.length;
        var keyFrames = [];

        for (var i = 0; i < numKeyFrames; ++i) {
            var time = curve.KeyTime[i].milliseconds;
            var value = curve.KeyValueFloat[i];
            var keyFrame = new HX.KeyFrame(time, value);
            keyFrames.push(keyFrame);
        }

        return keyFrames;
    },

    _completeKeyFrames: function(curves) {
        var indices = [];

        var numCurves = curves.length;
        for (var i = 0; i < numCurves; ++i) {
            indices[i] = 0;
        }

        var finished = false;
        while (!finished) {
            var time = Number.POSITIVE_INFINITY;

            var activeCurve = i;
            for (i = 0; i < numCurves; ++i) {
                var frames = curves[i].frames;
                if (frames[indices[i]].time < time) {
                    time = frames[indices[i]].time;
                    activeCurve = i;
                }
            }

            // Interpolate given the current time
            for (i = 0; i < numCurves; ++i) {
                frames = curves[i].frames;
                // already have the data for this frame
                var index2 = indices[i];
                if (frames[index2].time === time) continue;
                var index1 = Math.max(indices[i] - 1, 0);
                var ratio = HX.MathX.linearStep(frames[index1].time, frames[index2].time, time);
                var value = HX.MathX.lerp(frames[index1].value, frames[index2].value, ratio);
                var frame = new HX.KeyFrame(time, value);
                // insert new frame
                frames.splice(index2, 0, frame);
            }

            // move each playhead to the next
            finished = true;
            for (i = 0; i < numCurves; ++i) {
                frames = curves[i].frames;
                if (frames[indices[i]].time <= time)
                    ++indices[i];

                // still some frames left
                if (indices[i] < frames.length)
                    finished = false;
            }
        }
    },

    _createTempJointPoses: function() {
        var tempJointPoses = [];
        var numJoints = this._skeleton.numJoints;

        // use local bind pose as default
        for (var i = 0; i < numJoints; ++i) {
            var joint = this._skeleton.getJoint(i);
            var localBind = joint.inverseBindPose.clone();
            localBind.invertAffine();

            // by default, use bind pose
            if (joint.parentIndex !== -1) {
                var parentInverse = this._skeleton.getJoint(joint.parentIndex).inverseBindPose;
                localBind.appendAffine(parentInverse);
            }

            var pose = new FBXAnimationConverter._JointPose();
            var transform = new HX.Transform();

            localBind.decompose(transform);

            pose["Lcl Translation"].copyFrom(transform.position);
            transform.rotation.toEuler(pose["Lcl Rotation"]);

            pose["Lcl Rotation"].x *= HX.RAD_TO_DEG;
            pose["Lcl Rotation"].y *= HX.RAD_TO_DEG;
            pose["Lcl Rotation"].z *= HX.RAD_TO_DEG;
            pose["Lcl Scaling"].copyFrom(transform.scale);

            tempJointPoses[i] = pose;
        }

        return tempJointPoses;
    },

    _applyCurvesForFrame: function(tempJointPoses, curves, frameIndex)
    {
        var numCurveNodes = curves.length;
        for (var i = 0; i < numCurveNodes; ++i) {
            var curve = curves[i];
            var frames = curve.frames;
            var node = curve.node;
            var jointIndex = node.data;

            // not a skeleton target?
            if (jointIndex === null) continue;

            var target = tempJointPoses[jointIndex][node.propertyName];

            for (var key in node.curves) {
                if (!node.curves.hasOwnProperty(key)) continue;
                var value = frames[frameIndex].value;

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
        }
    },

    _convertSkeletonPose: function(tempJointPoses)
    {
        var skeletonPose = new HX.SkeletonPose();
        var numJoints = this._skeleton.numJoints;
        for (var i = 0; i < numJoints; ++i) {
            var jointPose = new HX.SkeletonJointPose();

            var tempJointPose = tempJointPoses[i];
            jointPose.position.copyFrom(tempJointPose["Lcl Translation"]);
            // not supporting non-uniform scaling at this point
            jointPose.scale.copyFrom(tempJointPose["Lcl Scaling"]);
            var rot = tempJointPose["Lcl Rotation"];
            jointPose.rotation.fromEuler(rot.x * HX.DEG_TO_RAD, rot.y * HX.DEG_TO_RAD, rot.z * HX.DEG_TO_RAD);
            skeletonPose.setJointPose(i, jointPose);
        }
        return skeletonPose;
    },

    _convertToClip: function(curves) {
        var clip = new HX.AnimationClip();
        var numFrames = curves[0].frames.length;

        for (var f = 0; f < numFrames; ++f) {
            var time = curves[0].frames[f].time;

            var tempJointPoses = this._createTempJointPoses();
            this._applyCurvesForFrame(tempJointPoses, curves, f);

            var skeletonPose = this._convertSkeletonPose(tempJointPoses);

            skeletonPose.setJointPose(this._fakeJointIndex, new HX.SkeletonJointPose());

            clip.addKeyFrame(new HX.KeyFrame(time, skeletonPose));
        }

        return clip;
    }
};

FBXAnimationConverter._JointPose = function()
{
    this["Lcl Translation"] = new HX.Float4(0.0, 0.0, 0.0);
    this["Lcl Rotation"] = new HX.Float4(0.0, 0.0, 0.0);
    this["Lcl Scaling"] = new HX.Float4(1.0, 1.0, 1.0);
};

export { FBXAnimationConverter };