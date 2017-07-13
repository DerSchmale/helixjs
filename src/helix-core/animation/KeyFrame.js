/**
 * @classdesc
 * KeyFrame is a time/value pair for use in {@AnimationClip}.
 * @param time The time in milliseconds of the key frame.
 * @param value The value of the key frame. This can for example be a {@linkcode SkeletonPose} for skinned animation clip.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
export function KeyFrame(time, value)
{
    this.time = time || 0.0;
    this.value = value;
}