/**
 *
 * @constructor
 */

import {Quaternion} from "../../math/Quaternion";
import {Float4} from "../../math/Float4";

function SkeletonJointPose()
{
    this.rotation = new Quaternion();
    this.position = new Float4();
    this.scale = new Float4(1, 1, 1);
}

SkeletonJointPose.prototype =
    {
        copyFrom: function(a)
        {
            this.rotation.copyFrom(a.rotation);
            this.position.copyFrom(a.position);
            this.scale.copyFrom(a.scale);
        },

        toString: function()
        {
            return "[SkeletonJointPose]";
        }
    };


export { SkeletonJointPose };