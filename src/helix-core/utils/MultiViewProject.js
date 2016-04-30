/**
 * MultiViewProject is a project template for the simple multi-view set-ups
 * @constructor
 */
HX.MultiViewProject = function()
{
    this._initialized = false;
};

HX.MultiViewProject.prototype =
{
    //override or assign these
    onInit: function() {},
    onUpdate: function(dt) {},

    // automatically starts as well
    init: function(canvas, initOptions)
    {
        if (this._initialized) throw new Error("Already initialized project!");

        HX.init(canvas, initOptions);
        this._resizeCanvas();

        this._renderer = new HX.MultiRenderer();

        var self = this;

        window.addEventListener('resize', function()
        {
            self._resizeCanvas.call(self);
        });

        this.onInit();
        this._initialized = true;
        this.start();
    },

    addView: function(view)
    {
        this._renderer.addView(view);
    },

    removeView: function(view)
    {
        this._renderer.removeView(view);
    },

    start: function()
    {
        HX.onFrame.bind(this._update, this);
    },

    stop: function()
    {
        HX.onFrame.unbind(this._update);
    },

    get renderer()
    {
        return this._renderer;
    },

    _update: function(dt)
    {
        HX._clearGLStats();

        this.onUpdate(dt);

        this._renderer.render(dt);
    },

    _resizeCanvas: function()
    {
        this._canvas = document.getElementById('webglContainer');
        this._canvas.width = this._canvas.clientWidth;
        this._canvas.height = this._canvas.clientHeight;
    }
};