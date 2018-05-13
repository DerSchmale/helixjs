import {Rect} from "../core/Rect";
import {Texture2D} from "../texture/Texture2D";
import {WriteOnlyDepthBuffer} from "../texture/WriteOnlyDepthBuffer";
import {FrameBuffer} from "../texture/FrameBuffer";
import {GL} from "../core/GL";
import {META, TextureFilter} from "../Helix";
import {RectMesh} from "../mesh/RectMesh";

export function ShadowAtlas()
{
    this._texture = new Texture2D();
    // TODO: Allow mips for VSM/ESM
    this._depthBuffer = new WriteOnlyDepthBuffer();
    this._fbo = new FrameBuffer(this._texture, this._depthBuffer);

    if (META.OPTIONS.shadowFilter.blurShader) {
        this._fboNoDepth = new FrameBuffer(this._texture, null);
        this._texture2 = new Texture2D();
        this._fbo2 = new FrameBuffer(this._texture2, null);
    }
}

ShadowAtlas.prototype =
{
    get fbo() { return this._fbo; },
    get texture() { return this._texture; },

    get size() { return this._size; },

    resize: function(size)
    {
        if (this._size === size) return;
        this._size = size;
        this._texture.initEmpty(size, size, META.OPTIONS.shadowFilter.getShadowMapFormat(), META.OPTIONS.shadowFilter.getShadowMapDataType());
        this._texture.filter = META.OPTIONS.shadowFilter.shadowMapFilter;
        if (this._texture.filter !== TextureFilter.NEAREST_NOMIP && this._texture.filter !== TextureFilter.BILINEAR_NOMIP) {
            // We can't use mipmap filtering because it's an *atlas*
            throw new Error("ShadowAtlas does not support mipmaps!");
        }
        this._depthBuffer.init(size, size, false);
        this._fbo.init();

        if (this._texture2) {
            this._texture2.initEmpty(size, size, META.OPTIONS.shadowFilter.getShadowMapFormat(), META.OPTIONS.shadowFilter.getShadowMapDataType());
            this._texture2.filter = TextureFilter.NEAREST_NOMIP;
            this._fboNoDepth.init();
            this._fbo2.init();
        }
    },

    // this is called while rendering shadow maps
    // it's required that the lights are ordered according to their quality bucket
    getNextRect: function()
    {
        return this._rects[this._currentRectIndex++];
    },

    /**
     * mapsPerLevel is an array containing the count per quality levels
     * totalMaps is the total amount of maps required
     */
    initRects: function (mapsPerLevel, totalMaps)
    {
        this._currentRectIndex = 0;
        this._rects = [new Rect(0, 0, this._size, this._size)];

        var numLevels = mapsPerLevel.length;

        for (var i = 0; i < numLevels; ++i) {
            var count = mapsPerLevel[i];
            totalMaps -= count;

            // this means there's more maps in lower qualities, so we need to generate an extra rect to contain them
            if (totalMaps > 0)
                this._divideLast(count + 1, this._rects);
            else {
                this._divideLast(count, this._rects);
                return;
            }
        }
    },

    blur: function()
    {
        var shadowFilter = META.OPTIONS.shadowFilter;
        var shader = shadowFilter.blurShader;

        if (!shader) return;

        this._texture.filter = TextureFilter.NEAREST_NOMIP;

        var numPasses = shadowFilter.numBlurPasses;

        for (var i = 0; i < numPasses; ++i) {
            GL.setRenderTarget(this._fbo2);
            GL.clear();
            shader.execute(RectMesh.DEFAULT, this._texture, 1.0 / this._size, 0.0);

            GL.setRenderTarget(this._fboNoDepth);
            GL.clear();
            shader.execute(RectMesh.DEFAULT, this._texture2, 0.0, 1.0 / this._size);
        }

        this._texture.filter = shadowFilter.shadowMapFilter;
    },

    _divideLast: function(count, flatList)
    {
        // No need to divide if the current quality level has none (but lower do)
        if (count <= 1) return;

        var parentRect = flatList[flatList.length - 1];
        // try to get as many horizontal as vertical, or near enough
        var numX = Math.floor(Math.sqrt(count));
        var numY = Math.ceil(count / numX);
        var baseX = parentRect.x;
        var baseY = parentRect.y;
        var w = parentRect.width / numX;
        var h = parentRect.height / numY;
        var i = 0;

        // TODO: Should we make sure we don't dig below a certain level to prevent degenerate maps?

        for (var y = 0; y < numY; ++y) {
            for (var x = 0; x < numX; ++x) {
                var rect;

                if (parentRect) {
                    // re-use parentRect instead of throwing it away
                    rect = parentRect;
                    parentRect = null;
                }
                else {
                    // pool these rects?
                    rect = new Rect();
                    flatList.push(rect);
                }

                rect.x = baseX + x * w;
                rect.y = baseY + y * h;
                rect.width = w;
                rect.height = h;

                if (++i === count) return rect;
            }
        }
    }
};