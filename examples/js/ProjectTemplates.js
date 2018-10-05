/**
 * SimpleProject is a project template for the most common 1-scene, 1-camera projects
 * @constructor
 */
function SimpleProject()
{
    this._initialized = false;
    this._assetLibrary = new HX.AssetLibrary("../assets/");
    this.autoStart = true;
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

            try {
				HX.init(canvas, initOptions);
			}
			catch (err) {
                console.error(err);
                this.showError("It seems WebGL is not supported on this device.")
            }

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
            var preloaderText = document.getElementById("preloaderText");
            preloaderText.innerHTML = "Initializing...";

            this._scene = new HX.Scene();
            this._camera = new HX.PerspectiveCamera();
            this._scene.attach(this._camera);
            this._initRenderers();

            this.onInit();
            this._initialized = true;

            if (this.autoStart)
                this.start();
        },

        queueAssets: function(assetLibrary)
        {

        },

        start: function()
        {
            var preloader = document.getElementById("preloader");
            document.body.removeChild(preloader);
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

		showError: function(message)
        {
            console.log(document.getElementById("errorContainer"));
            document.getElementById("errorContainer").classList.remove("hidden");
            document.getElementById("errorMessage").innerHTML = message;
        },

        _initRenderers: function()
        {
            this._renderer = new HX.Renderer();
        },

        _update: function(dt)
        {
            this.onUpdate(dt);

            this._renderer.render(this._camera, this._scene, dt);
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
    SimpleProject.call(this);
}

MultiViewProject.prototype = Object.create(SimpleProject.prototype);

MultiViewProject.prototype._initRenderers = function()
{
    this._renderer = new HX.MultiRenderer();
};

MultiViewProject.prototype.addView = function(view)
{
    this._renderer.addView(view);
};

MultiViewProject.prototype.removeView = function(view)
{
    this._renderer.removeView(view);
};



/**
 * MultiViewProject is a project template for the simple multi-view set-ups
 * @constructor
 */
function VRProject()
{
    SimpleProject.call(this);
}

VRProject.prototype = Object.create(SimpleProject.prototype, {
	vrRenderer: {
	    get: function()
		{
			return this._vrRenderer;
		}
	},

    vrCamera: {
        get: function()
        {
            return this._vrCamera;
        }
    }
});

VRProject.prototype.init = function(canvas, initOptions)
{
	SimpleProject.prototype.init.call(this, canvas, initOptions);

	this._stats = new HX.StatsDisplay();
};

VRProject.prototype._initRenderers = function()
{
    try {
        this._renderer = new HX.Renderer();
        this._vrRenderer = new HX.VRRenderer();

        this._vrCamera = new HX.VRCamera();
        this._scene.attach(this._vrCamera);
    }
    catch(err) {
        this.showError("WebVR is not supported in your browser");
    }
};

VRProject.prototype._update = function(dt)
{
    this.onUpdate(dt);

    if (HX.META.VR_DISPLAY)
        this._vrRenderer.render(this._vrCamera, this._scene, dt);
    else
        this._renderer.render(this._camera, this._scene, dt);
};
