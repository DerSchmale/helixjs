HX.FBXVideo = function()
{
    HX.FBXElement.call(this);
    // actual video not supported
    this.Width = 0;
    this.Height = 0;
    this.Path = null;
};

HX.FBXVideo.prototype = Object.create(HX.FBXElement.prototype);