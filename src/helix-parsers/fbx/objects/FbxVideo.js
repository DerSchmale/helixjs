HX.FbxVideo = function()
{
    HX.FbxObject.call(this);
    // actual video not supported
    this.relativeFilename = null;
};

HX.FbxVideo.prototype = Object.create(HX.FbxObject.prototype);
HX.FbxVideo.prototype.toString = function() { return "[FbxVideo(name="+this.name+")]"; };