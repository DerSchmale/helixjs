import * as HX from 'helix';

function MD5Anim()
{
    HX.Importer.call(this, HX.SkeletonClip);
    this._hierarchy = null;
    this._baseFrame = null;
    this._activeFrame = null;
    this._numJoints = 0;
    this._frameRate = 0;

    this._correctionQuad = new HX.Quaternion();
    this._correctionQuad.fromAxisAngle(HX.Float4.X_AXIS, -Math.PI *.5);
}

MD5Anim.prototype = Object.create(HX.Importer.prototype);

MD5Anim.prototype.parse = function(data, target)
{
    this._hierarchy = [];
    this._baseFrame = [];
    this._target = target;

    // assuming a valid file, validation isn't our job
    var lines = data.split("\n");
    var len = lines.length;
    var lineFunction = null;

    for (var i = 0; i < len; ++i) {
        // remove leading & trailing whitespace
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        var tokens = line.split(/\s+/);

        if (tokens[0] === "//" || tokens[0] === "")
            continue;

        if (lineFunction) {
            lineFunction.call(this, tokens);
            if (tokens[0] === "}") lineFunction = null;
        }
        else switch (tokens[0]) {
            case "commandline":
            case "numFrames":
            case "MD5Version":
            case "numAnimatedComponents":
                break;
            case "numJoints":
                this._numJoints = parseInt(tokens[1]);
                break;
            case "frameRate":
                this._frameRate = parseInt(tokens[1]);
                break;
            case "hierarchy":
                lineFunction = this._parseHierarchy;
                break;
            case "bounds":
                lineFunction = this._parseBounds;
                break;
            case "baseframe":
                lineFunction = this._parseBaseFrame;
                break;
            case "frame":
                this._activeFrame = new MD5Anim._FrameData();
                lineFunction = this._parseFrame;
                break;

        }
    }

    this._notifyComplete(target);
};

MD5Anim.prototype._parseHierarchy = function(tokens)
{
    if (tokens[0] === "}") return;
    var data = new MD5Anim._HierachyData();
    data.name = tokens[0].substring(1, tokens[0].length - 1);
    data.parent = parseInt(tokens[1]);
    data.flags = parseInt(tokens[2]);
    data.startIndex = parseInt(tokens[3]);
    this._hierarchy.push(data);
};

MD5Anim.prototype._parseBounds = function(tokens)
{
    // don't do anything with bounds for now
};

MD5Anim.prototype._parseBaseFrame = function(tokens)
{
    if (tokens[0] === "}") return;
    var baseFrame = new MD5Anim._BaseFrameData();
    var pos = baseFrame.pos;
    pos.x = parseFloat(tokens[1]);
    pos.y = parseFloat(tokens[2]);
    pos.z = parseFloat(tokens[3]);
    var quat = baseFrame.quat;
    quat.x = parseFloat(tokens[6]);
    quat.y = parseFloat(tokens[7]);
    quat.z = parseFloat(tokens[8]);
    quat.w = 1.0 - quat.x*quat.x - quat.y*quat.y - quat.z*quat.z;
    if (quat.w < 0.0) quat.w = 0.0;
    else quat.w = -Math.sqrt(quat.w);
    this._baseFrame.push(baseFrame);
};

MD5Anim.prototype._parseFrame = function(tokens)
{
    if (tokens[0] === "}") {
        this._translateFrame();
        return;
    }

    var len = tokens.length;
    for (var i = 0; i < len; ++i) {
        this._activeFrame.components.push(parseFloat(tokens[i]));
    }
};

MD5Anim.prototype._translateFrame = function()
{
    var skeletonPose = new HX.SkeletonPose();

    for (var i = 0; i < this._numJoints; ++i) {
        var pose = new HX.SkeletonJointPose();
        var hierarchy = this._hierarchy[i];
        var base = this._baseFrame[i];
        var flags = hierarchy.flags;
        var pos = base.pos;
        var quat = base.quat;
        var comps = this._activeFrame.components;

        var j = hierarchy.startIndex;

        if (flags & 1) pos.x = comps[j];
        if (flags & 2) pos.y = comps[j+1];
        if (flags & 4) pos.z = comps[j+2];
        if (flags & 8) quat.x = comps[j+3];
        if (flags & 16) quat.y = comps[j+4];
        if (flags & 32) quat.z = comps[j+5];

        var w = 1.0 - quat.x * quat.x - quat.y * quat.y - quat.z * quat.z;
        quat.w = w < 0.0 ? 0.0 : -Math.sqrt(w);

        // transform root joints only
        if (hierarchy.parent < 0) {
            pose.rotation.multiply(this._correctionQuad, quat);
            pose.position = this._correctionQuad.rotate(pos);
        }
        else {
            pose.rotation.copyFrom(quat);
            pose.position.copyFrom(pos);
        }

        skeletonPose.jointPoses.push(pose);
    }

    var time = this._target.numKeyFrames / this._frameRate * 1000.0;
    this._target.addKeyFrame(new HX.KeyFrame(time, skeletonPose));
};

MD5Anim._HierachyData = function()
{
    this.name = null;
    this.parent = -1;
    this.flags = 0;
    this.startIndex = 0;
};

MD5Anim._BaseFrameData = function()
{
    this.pos = new HX.Float4();
    this.quat = new HX.Quaternion();
};

MD5Anim._FrameData = function()
{
    this.components = [];
};

export { MD5Anim };