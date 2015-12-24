// Could also create an ASCII deserializer
HX.FBXSettings = function()
{
    this._matrix = new HX.Matrix4x4();
    this._frameRate = 24;
    // start with indentity matrix
    // SWAP column[up axis index] with column[1]
    // SWAP column[front axis index] with column[2
    // multiply respective columns with signs
};

HX.FBXSettings.prototype =
{
    get orientationMatrix() { return this._matrix; },
    get frameRate() { return this._frameRate; },

    init: function(rootRecord)
    {
        var upAxisIndex = 1;
        var upAxisSign = 1;
        var frontAxisIndex = 2;
        var frontAxisSign = 1;
        var global = rootRecord.getChildByName("GlobalSettings");
        var props = global.getChildByName("Properties70");
        var len = props.children.length;
        var keyFrames = [ 0, 120, 100, 60, 50, 48, 30 ];

        for (var i = 0; i < len; ++i) {
            var p = props.children[i];
            switch (p.data[0]) {
                case "UpAxis":
                    upAxisIndex = p.data[4];
                    break;
                case "UpAxisSign":
                    upAxisSign = p.data[4];
                    break;
                case "FrontAxis":
                    frontAxisIndex = p.data[4];
                    break;
                case "FrontAxisSign":
                    frontAxisSign = p.data[4];
                    break;
                case "TimeMode":
                    this._frameRate = keyFrames[p.data[4]];
                    break;
            }
        }

        var axes = [ HX.Float4.X_AXIS, HX.Float4.Y_AXIS, HX.Float4.Z_AXIS ];
        var fwd = axes[frontAxisIndex].clone();
        var up = axes[upAxisIndex].clone();
        fwd.scale(frontAxisSign);
        up.scale(upAxisSign);
        this._matrix.lookAt(fwd, HX.Float4.ORIGIN_POINT, up);
        this._matrix.invert();
    }
};