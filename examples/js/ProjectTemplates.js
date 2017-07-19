/**
 * SimpleProject is a project template for the most common 1-scene, 1-camera projects
 * @constructor
 */
function SimpleProject()
{
    this._initialized = false;
    this._assetLibrary = new HX.AssetLibrary();
}

SimpleProject.prototype =
    {
        //override or assign these
        onInit: function() {},
        onUpdate: function(dt) {},

        // automatically starts as well
        init: function(canvas, initOptions)
        {
            if (this._initialized) throw new Error("Already initialized project!");

            HX.init(canvas, initOptions);

            this._canvas = canvas;

            this.queueAssets(this._assetLibrary);

            this._assetLibrary.onComplete.bind(this._onAssetsLoaded, this);
            this._assetLibrary.onProgress.bind(this._onAssetsProgress, this);
            this._assetLibrary.load();
        },

        _onAssetsProgress: function(ratio)
        {
            var preloader = document.getElementById("preloaderProgress");
            preloader.style.width = Math.floor(ratio * 100) + "%";
        },

        _onAssetsLoaded: function()
        {
            var preloader = document.getElementById("preloader");
            document.body.removeChild(preloader);

            this._resizeCanvas();

            this._scene = new HX.Scene();
            this._camera = new HX.PerspectiveCamera();
            this._scene.attach(this._camera);
            this._renderer = new HX.Renderer();

            var self = this;

            window.addEventListener('resize', function()
            {
                self._resizeCanvas();
            });

            this.onInit();
            this._initialized = true;
            this.start();
        },

        queueAssets: function(assetLibrary)
        {

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

        get assetLibrary()
        {
            return this._assetLibrary;
        },

        get scene()
        {
            return this._scene;
        },

        set scene(value)
        {
            this._scene.detach(this._camera);
            this._scene = value;
            this._scene.attach(this._camera);
        },

        get camera()
        {
            return this._camera;
        },

        set camera(value)
        {
            this._scene.detach(this._camera);
            this._camera = value;

            if (!this._camera._parent)
                this._scene.attach(this._camera);
            else if (this._camera._scene !== this._scene)
                throw new Error("Camera attached to a different scene!");
        },

        _update: function(dt)
        {
            this.onUpdate(dt);

            this._renderer.render(this._camera, this._scene, dt);
        },

        _resizeCanvas: function()
        {
            var pixelRatio = window.devicePixelRatio || 1.0;
            var w = window.innerWidth;
            var h = window.innerHeight;
            this._canvas.width = Math.round(w * pixelRatio);
            this._canvas.height = Math.round(h * pixelRatio);

            this._canvas.style.width = w + "px";
            this._canvas.style.height = h + "px";
        }
    };

/**
 * Just a slight extension to SimpleProject, to add debug mode number keys and an fps counter
 * @constructor
 */
DemoProject = function()
{
    SimpleProject.call(this);
    this._stats = null;
};

DemoProject.prototype = Object.create(SimpleProject.prototype);

DemoProject.prototype.init = function(canvas, initOptions)
{
    SimpleProject.prototype.init.call(this, canvas, initOptions);

    this._stats = new HX.StatsDisplay();
};

/**
 * MultiViewProject is a project template for the simple multi-view set-ups
 * @constructor
 */
function MultiViewProject()
{
    this._initialized = false;
    this._assetLibrary = new HX.AssetLibrary();
}

MultiViewProject.prototype =
    {
        //override or assign these
        onInit: function() {},
        onUpdate: function(dt) {},

        // automatically starts as well
        init: function(canvas, initOptions)
        {
            if (this._initialized) throw new Error("Already initialized project!");

            HX.init(canvas, initOptions);

            this._canvas = document.getElementById('webglContainer');

            this.queueAssets(this._assetLibrary);

            this._assetLibrary.onComplete.bind(this._onAssetsLoaded, this);
            this._assetLibrary.onProgress.bind(this._onAssetsProgress, this);
            this._assetLibrary.load();
        },

        _onAssetsProgress: function(ratio)
        {
            var preloader = document.getElementById("preloaderProgress");
            preloader.style.width = Math.floor(ratio * 100) + "%";
        },

        _onAssetsLoaded: function()
        {
            var preloader = document.getElementById("preloader");
            preloader.style.display = "none";

            this._resizeCanvas();

            this._renderer = new HX.MultiRenderer();

            var self = this;

            window.addEventListener('resize', function()
            {
                self._resizeCanvas();
            });

            this.onInit();
            this._initialized = true;
            this.start();
        },

        queueAssets: function(assetLibrary)
        {

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

        get assetLibrary()
        {
            return this._assetLibrary;
        },

        _update: function(dt)
        {
            this.onUpdate(dt);

            this._renderer.render(dt);
        },

        _resizeCanvas: function()
        {
            this._canvas.width = this._canvas.clientWidth;
            this._canvas.height = this._canvas.clientHeight;
        }
    };