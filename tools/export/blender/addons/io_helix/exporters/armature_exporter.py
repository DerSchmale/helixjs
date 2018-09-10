from .. import data, property_types, object_types


def write_bone(bone, file, object_map):
    bone_id = data.start_object(file, object_types.SKELETON_JOINT, object_map)
    data.write_string_prop(file, property_types.NAME, bone.name)
    data.write_affine_matrix_prop(file, property_types.INVERSE_BIND_POSE, bone.matrix_local)
    data.end_object(file)
    object_map.map(bone, bone_id)
    return bone_id


def write(armature, file, object_map):
    if object_map.has_mapped_indices(armature):
        return

    skeleton_id = data.start_object(file, object_types.SKELETON, object_map)
    data.write_string_prop(file, property_types.NAME, armature.name)
    data.end_object(file)

    object_map.map(armature, skeleton_id)

    # bones are ordered by hierarchy
    for bone in armature.bones:
        bone_id = write_bone(bone, file, object_map)
        if bone.parent:
            parent_id = object_map.get_mapped_indices(bone.parent)[0]
        else:
            parent_id = skeleton_id

        object_map.link(parent_id, bone_id)

    return skeleton_id
