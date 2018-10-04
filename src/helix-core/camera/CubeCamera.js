import {Quaternion} from "../math/Quaternion";
import {Float4} from "../math/Float4";
import {PerspectiveCamera} from "./PerspectiveCamera";
import {Entity} from "../entity/Entity";

/**
 * @classdesc
 * CubeCamera is a "camera" consisting out of 6 sub-cameras to render cube maps using {@linkcode CubeRenderer}. The cube
 * is rendered in camera space, so if you want a world space cube map, simply do not rotate the camera.
 *
 * @constructor
 *
 * @property {number} nearDistance The minimum distance to be able to render. Anything closer gets cut off.
 * @property {number} farDistance The maximum distance to be able to render. Anything farther gets cut off.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CubeCamera()
{
    Entity.call(this);
    this._cameras = [];
    this._initCameras();
}

CubeCamera.prototype = Object.create(Entity.prototype, {
    nearDistance: {
        get: function() {
            return this._cameras[0].nearDistance;
        },

        set: function nearDistance(value)
        {
            for (var i = 0; i < 6; ++i)
                this._cameras[i].nearDistance = value;
        }
    },

    farDistance: {
        get: function ()
        {
            return this._cameras[0].farDistance;
        },

        set: function (value)
        {
            for (var i = 0; i < 6; ++i)
                this._cameras[i].farDistance = value;
        }
    }
});

/**
 * Returns the PerspectiveCamera for the given face.
 *
 * @ignore
 */
CubeCamera.prototype.getFaceCamera = function(face)
{
    return this._cameras[face];
};

/**
 * @ignore
 * @private
 */
CubeCamera.prototype._initCameras = function()
{
    var flipY = new Quaternion();
    flipY.fromAxisAngle(Float4.Z_AXIS, Math.PI);

    var rotations = [];
    for (var i = 0; i < 6; ++i)
        rotations[i] = new Quaternion();

    rotations[0].fromAxisAngle(Float4.Z_AXIS, -Math.PI * .5);
    rotations[1].fromAxisAngle(Float4.Z_AXIS, Math.PI * .5);
    rotations[2].fromAxisAngle(Float4.Z_AXIS, 0);
    rotations[3].fromAxisAngle(Float4.Z_AXIS, Math.PI);
    rotations[4].fromAxisAngle(Float4.X_AXIS, Math.PI * .5);
    rotations[5].fromAxisAngle(Float4.X_AXIS, -Math.PI * .5);

    for (i = 0; i < 6; ++i) {
        var camera = new PerspectiveCamera();
        camera.nearDistance = 0.01;
        camera.verticalFOV = Math.PI * .5;
        camera.rotation.copyFrom(rotations[i]);
        camera.position.set(0, 0, 0);
        camera.scale.set(1, 1, -1);
        this._cameras[i] = camera;
        this.attach(camera);
    }
};

export { CubeCamera }