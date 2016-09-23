HX.View = function(scene, camera, xRatio, yRatio, widthRatio, heightRatio)
{
    this.scene = scene;
    this.camera = camera;
    this.viewport = new HX.Rect();
    this._renderer = null;
    this._texture = null;
    this._fbo = null;
    this.xRatio = xRatio || 0;
    this.yRatio = yRatio || 0;
    this.widthRatio = widthRatio || 1;
    this.heightRatio = heightRatio || 1;
};

/**
 * MultiRenderer is a renderer for multiple viewports
 * @constructor
 */
HX.MultiRenderer = function()
{
    this._views = [];
    this._copyTexture = new HX.CopyChannelsShader();
};

HX.MultiRenderer.prototype =
{
    addView: function (view)
    {
        view._renderer = new HX.ForwardRenderer();
        view._texture = new HX.Texture2D();
        view._texture.filter = HX.TextureFilter.BILINEAR_NOMIP;
        view._texture.wrapMode = HX.TextureWrapMode.CLAMP;
        view._fbo = new HX.FrameBuffer(view._texture);
        this._views.push(view);
    },

    removeView: function (view)
    {
        view._fbo.dispose();
        view._texture.dispose();
        view._renderer.dispose();
        var index = this._views.indexOf(view);
        this._views.splice(index, 1);
    },

    render: function (dt, renderTarget)
    {
        HX.pushRenderTarget(renderTarget);

        var viewport = new HX.Rect();
        var screenWidth = HX.TARGET_CANVAS.clientWidth;
        var screenHeight = HX.TARGET_CANVAS.clientHeight;
        for (var i = 0; i < this._views.length; ++i) {
            var view = this._views[i];
            var w = Math.floor(screenWidth * view.widthRatio);
            var h = Math.floor(screenHeight * view.heightRatio);

            if (view._texture.width != w || view._texture.height != h) {
                view._texture.initEmpty(w, h);
                view._fbo.init();
            }

            view._renderer.render(view.camera, view.scene, dt, view._fbo);
            viewport.x = Math.floor(view.xRatio * screenWidth);
            viewport.y = Math.floor((1.0 - view.yRatio - view.heightRatio) * screenHeight);
            viewport.width = w;
            viewport.height = h;
            HX.setViewport(viewport);
            this._copyTexture.execute(HX.RectMesh.DEFAULT, view._texture);
        }

        HX.setViewport(null);

        HX.popRenderTarget();
    }
};