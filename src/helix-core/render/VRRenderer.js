import {Renderer} from "./Renderer";
import {META} from "../Helix";
import {VRCamera} from "../camera/VRCamera";
import {RectMesh} from "../mesh/RectMesh";
import {Rect} from "../core/Rect";
import {GL} from "../core/GL";

/**
 * @classdesc
 * VRRenderer is a renderer to WebVR. This can only be used if `HX.enableVR` is called
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VRRenderer()
{
    Renderer.call(this);
    this._leftTarget = new Renderer.HDRBuffers(this._depthBuffer);
    this._leftRect = new Rect();
    this._rightRect = new Rect();
}

VRRenderer.prototype = Object.create(Renderer.prototype);

/**
 * @inheritDoc
 */
VRRenderer.prototype.render = function(camera, scene, dt)
{
    console.assert(camera instanceof VRCamera, "Must use VRCamera with VRRenderer!");

    // TODO: Render to two intermediate renderTargets
    META.VR_DISPLAY.depthNear = camera.nearDistance;
    META.VR_DISPLAY.depthFar = camera.farDistance;

    this._camera = camera;
    this._scene = scene;

    camera._updateVR();

    this._updateSize(this.renderTarget);
    this._camera._setRenderTargetResolution(this._width, this._height);

    this._renderCollector.collect(camera, scene);
    this._ambientColor = this._renderCollector.ambientColor;

    this._renderShadowCasters();

    // TODO: Can we set _activeCamera instead of keeping renderItem.camera?
    this._renderView(camera._cameraLeft, scene, dt);

    // swap buffers so leftTarget contains the left target
    var tmp = this._leftTarget;
    this._leftTarget = this._hdrBack;
    this._hdrBack = tmp;

    this._renderView(camera._cameraRight, scene, dt);

    this._renderToScreen();
};

/**
 * @ignore
 */
VRRenderer.prototype._present = function()
{
    if (this._gammaApplied) {
        GL.setViewport(this._leftRect);
        this._copyTextureShader.execute(RectMesh.DEFAULT, this._leftTarget.texture);
        GL.setViewport(this._rightRect);
        this._copyTextureShader.execute(RectMesh.DEFAULT, this._hdrBack.texture);
    }
    else {
        GL.setViewport(this._leftRect);
        this._applyGamma.execute(RectMesh.DEFAULT, this._leftTarget.texture);
        GL.setViewport(this._rightRect);
        this._applyGamma.execute(RectMesh.DEFAULT, this._hdrBack.texture);
    }

    GL.setViewport();
};

/**
 * @ignore
 */
VRRenderer.prototype._updateSize = function()
{
    var width, height;
    if (this.renderTarget) {
        width = this.renderTarget.width * .5;
        height = this.renderTarget.height;
    }
	else {
        width = META.TARGET_CANVAS.width * .5;
        height = META.TARGET_CANVAS.height;
    }

    if (this._width !== width || this._height !== height) {
        this._width = width;
        this._height = height;
        this._depthBuffer.init(this._width, this._height, true);
        this._hdrBack.resize(this._width, this._height);
        this._hdrFront.resize(this._width, this._height);
        this._leftTarget.resize(this._width, this._height);
        this._normalDepthBuffer.initEmpty(width, height);
        this._normalDepthFBO.init();
        this._leftRect.width = width;
        this._leftRect.height = height;
        this._rightRect.width = width;
        this._rightRect.height = height;
        this._rightRect.x = width;
    }
};


export { VRRenderer };