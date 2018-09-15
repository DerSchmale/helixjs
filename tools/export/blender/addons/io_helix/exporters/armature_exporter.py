from .. import data, object_map
from ..constants import ObjectType, PropertyType


def write_bone(bone, file):
    bone_id = data.start_object(file, ObjectType.SKELETON_JOINT)
    data.write_string_prop(file, PropertyType.NAME, bone.name)
    inverse_bind_matrix = bone.matrix_local.inverted()
    data.write_affine_matrix_prop(file, PropertyType.INVERSE_BIND_POSE, inverse_bind_matrix)
    data.end_object(file)
    object_map.map(bone, bone_id)
    return bone_id


def write(armature, file):
    if object_map.has_mapped_indices(armature):
        return object_map.get_mapped_indices(armature)[0]

    skeleton_id = data.start_object(file, ObjectType.SKELETON)
    data.write_string_prop(file, PropertyType.NAME, armature.name)
    data.end_object(file)

    object_map.map(armature, skeleton_id)

    # bones are ordered by hierarchy
    for bone in armature.bones:
        bone_id = write_bone(bone, file)
        if bone.parent:
            parent_id = object_map.get_mapped_indices(bone.parent)[0]
        else:
            parent_id = skeleton_id

        object_map.link(parent_id, bone_id)

    return skeleton_id
