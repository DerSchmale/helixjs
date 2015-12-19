HX.FbxVideo = function()
{
    HX.FbxObject.call(this);
    // actual video not supported
    this.relativeFilename = null;
};

HX.FbxVideo.prototype = Object.create(HX.FbxObject.prototype);