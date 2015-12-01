HX.Project = function(canvas, initOptions)
{
    HX.init(canvas, initOptions);

    this._renderer = new HX.Renderer();
    this._activeCamera = new HX.PerspectiveCamera();
    this._activeScene = new HX.Scene();
    this._ticker = new HX.FrameTicker();
    this._ticker.onTick.bind(this, this._onTick);

    window.addEventListener('resize', function() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    });

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this._initialized = false;
};

HX.Project.prototype =
{
    // user implemented methods:
    onInit: function(dt) {},    // in case we extend this class
    onUpdate: function(dt) {},

    get renderer()
    {
        return this._renderer;
    },

    get activeCamera()
    {
        return this._activeCamera;
    },

    set activeCamera(value)
    {
        this._activeCamera = value;
    },

    get activeScene()
    {
        return this._activeScene;
    },

    set activeScene(value)
    {
        this._activeScene = value;
    },

    start: function()
    {
        if (!this._initialized) {
            this.onInit();
            this._initialized = true;
        }
        this._ticker.start();
    },

    stop: function()
    {
        this._ticker.stop();
    },

    _onTick: function()
    {
        this.onUpdate(this._ticker.dt);
        HX.clear();
        this._renderer.render(this._activeCamera, this._activeScene, this._ticker.dt);
    }
};
