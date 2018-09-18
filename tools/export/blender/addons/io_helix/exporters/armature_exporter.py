# @author derschmale <http://www.derschmale.com>

from .. import data, object_map
from ..constants import ObjectType, PropertyType


def write_bone(bone):
    bone_id = data.start_object(ObjectType.SKELETON_JOINT)
    data.write_string_prop(PropertyType.NAME, bone.name)
    inverse_bind_matrix = bone.matrix_local.inverted()
    data.write_affine_matrix_prop(PropertyType.INVERSE_BIND_POSE, inverse_bind_matrix)
    data.end_object()
    object_map.map(bone, bone_id)
    return bone_id


def write(armature):
    if object_map.has_mapped_indices(armature):
        return object_map.get_mapped_indices(armature)[0]

    skeleton_id = data.start_object(ObjectType.SKELETON)
    data.write_string_prop(PropertyType.NAME, armature.name)
    data.end_object()

    object_map.map(armature, skeleton_id)

    # bones are ordered by hierarchy
    for bone in armature.bones:
        bone_id = write_bone(bone)
        if bone.parent:
            parent_id = object_map.get_mapped_indices(bone.parent)[0]
        else:
            parent_id = skeleton_id

        object_map.link(parent_id, bone_id)

    return skeleton_id
