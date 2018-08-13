import {Renderer} from "./Renderer";
import {Texture2D} from "../texture/Texture2D";
import {FrameBuffer} from "../texture/FrameBuffer";
import {DEFAULTS, META, TextureFilter, TextureWrapMode} from "../Helix";
import {Rect} from "../core/Rect";
import {GL} from "../core/GL";
import {RectMesh} from "../mesh/RectMesh";

/**
 * @classdesc
 * View represents a renderable area on screen with the data it should render.
 *
 * @param scene The {@linkcode Scene} to render to this view.
 * @param camera The {@linkcode Camera} to use for this view.
 * @param xRatio The ratio (0 - 1) of the top-left corner of the view's horizontal position relative to the screen width.
 * @param yRatio The ratio (0 - 1) of the top-left corner of the view vertical position relative to the screen height.
 * @param widthRatio The ratio (0 - 1) of the top-left corner of the view's width relative to the screen width.
 * @param heightRatio The ratio (0 - 1) of the top-left corner of the view's height relative to the screen height.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function View(scene, camera, xRatio, yRatio, widthRatio, heightRatio)
{
    /**
     * The {@linkcode Scene} to render to this view.
     */
    this.scene = scene;

    /**
     * The {@linkcode Camera} to use for this view.
     */
    this.camera = camera;

    this._renderer = null;
    this._texture = null;
    this._fbo = null;

    /**
     * The ratio (0 - 1) of the top-left corner of the view's horizontal position relative to the screen width.
     */
    this.xRatio = xRatio || 0;

    /**
     * The ratio (0 - 1) of the top-left corner of the view's vertical position relative to the screen height.
     */
    this.yRatio = yRatio || 0;

    /**
     * The ratio (0 - 1) of the top-left corner of the view's width relative to the screen width.
     */
    this.widthRatio = widthRatio || 1;

    /**
     * The ratio (0 - 1) of the top-left corner of the view's height relative to the screen height.
     */
    this.heightRatio = heightRatio || 1;
}

/**
 * MultiRenderer is a renderer for multiple simultaneous viewports. Multiple scenes can be rendered, with multiple
 * cameras.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MultiRenderer()
{
    this._views = [];
}

MultiRenderer.prototype =
{
    /**
     * Adds a {@linkcode View} to be rendered.
     */
    addView: function (view)
    {
        view._texture = new Texture2D();
        view._texture.filter = TextureFilter.BILINEAR_NOMIP;
        view._texture.wrapMode = TextureWrapMode.CLAMP;
        view._fbo = new FrameBuffer(view._texture);
        view._renderer = new Renderer(view._fbo);
        this._views.push(view);
    },

    /**
     * Removes a {@linkcode View}.
     */
    removeView: function (view)
    {
        view._fbo = null;
        view._texture = null;
        view._renderer = null;
        var index = this._views.indexOf(view);
        this._views.splice(index, 1);
    },

    /**
     * Renders all views.
     * @param dt The milliseconds passed since last frame.
     * @param [renderTarget] An optional {@linkcode FrameBuffer} object to render to.
     */
    render: function (dt, renderTarget)
    {
        var screenWidth = META.TARGET_CANVAS.clientWidth;
        var screenHeight = META.TARGET_CANVAS.clientHeight;
        var numViews = this._views.length;
        for (var i = 0; i < numViews; ++i) {
            var view = this._views[i];
            var w = Math.floor(screenWidth * view.widthRatio);
            var h = Math.floor(screenHeight * view.heightRatio);

            if (view._texture.width !== w || view._texture.height !== h) {
                view._texture.initEmpty(w, h);
                view._fbo.init();
            }

            view._renderer.render(view.camera, view.scene, dt);
        }

        GL.setRenderTarget(renderTarget);
        GL.clear();

        var viewport = new Rect();

        for (i = 0; i < numViews; ++i) {
            view = this._views[i];
            viewport.x = Math.floor(view.xRatio * screenWidth);
            viewport.y = Math.floor((1.0 - view.yRatio - view.heightRatio) * screenHeight);
            viewport.width = view._texture.width;
            viewport.height = view._texture.height;
            GL.setViewport(viewport);
            DEFAULTS.COPY_SHADER.execute(RectMesh.DEFAULT, view._texture);
        }
    }
};

export { View, MultiRenderer };