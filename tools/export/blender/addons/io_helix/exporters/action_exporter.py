from .. import data, property_types, object_types


def write_joint_pose(pose, file):
    if pose.parent:
        bind_matrix = pose.parent.bone.matrix_local.inverted() * pose.bone.matrix_local
    else:
        bind_matrix = pose.bone.matrix_local

    # matrix_basis is relative to bind pose, so need to extract
    matrix = bind_matrix * pose.matrix_basis

    pos, quat, scale = matrix.decompose()
    data.write_vector_prop(file, property_types.POSITION, pos)
    data.write_quat_prop(file, property_types.ROTATION, quat)
    data.write_vector_prop(file, property_types.SCALE, scale)


def write_keyframe_at(armature, time, file, object_map):
    frame_id = data.start_object(file, object_types.KEY_FRAME, object_map)
    data.write_float32_prop(file, property_types.TIME, time)
    data.end_object(file)

    pose_id = data.start_object(file, object_types.SKELETON_POSE, object_map)

    for bone in armature.pose.bones:
        write_joint_pose(bone, file)

    data.end_object(file)
    object_map.link(frame_id, pose_id)

    return frame_id


# write actions for armatures, since they're different from normal animations
def write_armature_action(action, armature, file, object_map, scene):
    if object_map.has_mapped_indices(action):
        return object_map.get_mapped_indices(action)[0]

    fps = scene.render.fps

    action_id = data.start_object(file, object_types.ANIMATION_CLIP, object_map)
    data.write_string_prop(file, property_types.NAME, action.name)
    data.end_object(file)

    # need to get all skeleton poses for these times
    for f in range(int(action.frame_range[0]), int(action.frame_range[1] + 1)):
        scene.frame_set(f)
        frame_id = write_keyframe_at(armature, f / fps * 1000.0, file, object_map)
        object_map.link(action_id, frame_id)

    object_map.map(action, action_id)

    return action_id
