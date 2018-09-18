# @author derschmale <http://www.derschmale.com>

from .. import data, object_map
from ..constants import ObjectType, PropertyType

def write_joint_pose(pose):
    if pose.parent:
        bind_matrix = pose.parent.bone.matrix_local.inverted() * pose.bone.matrix_local
    else:
        bind_matrix = pose.bone.matrix_local

    # matrix_basis is relative to bind pose, so need to extract
    matrix = bind_matrix * pose.matrix_basis

    pos, quat, scale = matrix.decompose()
    data.write_vector_prop(PropertyType.POSITION, pos)
    data.write_quat_prop(PropertyType.ROTATION, quat)
    data.write_vector_prop(PropertyType.SCALE, scale)


def write_keyframe_at(armature, time):
    frame_id = data.start_object(ObjectType.KEY_FRAME)
    data.write_float32_prop(PropertyType.TIME, time)
    data.end_object()

    pose_id = data.start_object(ObjectType.SKELETON_POSE)

    for bone in armature.pose.bones:
        write_joint_pose(bone)

    data.end_object()
    object_map.link(frame_id, pose_id)

    return frame_id


# write actions for armatures, since they're different from normal animations
def write_armature_action(action, armature, scene):
    if object_map.has_mapped_indices(action):
        return object_map.get_mapped_indices(action)[0]

    fps = scene.render.fps

    action_id = data.start_object(ObjectType.ANIMATION_CLIP)
    data.write_string_prop(PropertyType.NAME, action.name)
    data.end_object()

    # need to get all skeleton poses for these times
    for f in range(int(action.frame_range[0]), int(action.frame_range[1] + 1)):
        scene.frame_set(f)
        frame_id = write_keyframe_at(armature, f / fps * 1000.0)
        object_map.link(action_id, frame_id)

    object_map.map(action, action_id)

    return action_id
