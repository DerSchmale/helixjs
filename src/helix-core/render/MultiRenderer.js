/**
 * MultiRenderer is a renderer for multiple viewports
 * @constructor
 */
import {Renderer} from "./Renderer";
import {Texture2D} from "../texture/Texture2D";
import {FrameBuffer} from "../texture/FrameBuffer";
import {DEFAULTS, META, TextureFilter, TextureWrapMode} from "../Helix";
import {Rect} from "../core/Rect";
import {GL} from "../core/GL";
import {RectMesh} from "../mesh/RectMesh";


function View(scene, camera, xRatio, yRatio, widthRatio, heightRatio)
{
    this.scene = scene;
    this.camera = camera;
    this.viewport = new Rect();
    this._renderer = null;
    this._texture = null;
    this._fbo = null;
    this.xRatio = xRatio || 0;
    this.yRatio = yRatio || 0;
    this.widthRatio = widthRatio || 1;
    this.heightRatio = heightRatio || 1;
}

function MultiRenderer()
{
    this._views = [];
}

MultiRenderer.prototype =
{
    addView: function (view)
    {
        view._renderer = new Renderer();
        view._texture = new Texture2D();
        view._texture.filter = TextureFilter.BILINEAR_NOMIP;
        view._texture.wrapMode = TextureWrapMode.CLAMP;
        view._fbo = new FrameBuffer(view._texture);
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

            view._renderer.render(view.camera, view.scene, dt, view._fbo);
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