from . import mesh_object_exporter
from . import light_exporter
from . import camera_exporter
from . import armature_object_exporter
from . import group_exporter
from . import entity_exporter
from .. import object_map


def write(obj, scene, in_group=False):
    # groups don't keep indices, are unique
    if not in_group and object_map.has_mapped_indices(obj):
        return object_map.get_mapped_indices(obj)[0]

    node_index = None

    # groups override visibility
    visible = in_group or obj.is_visible(scene)

    if obj.type == "MESH":
        node_index = mesh_object_exporter.write(obj, visible)
    elif obj.type == "LAMP":
        node_index = light_exporter.write(obj, visible)
    elif obj.type == "CAMERA":
        node_index = camera_exporter.write(obj)
    elif obj.type == "ARMATURE":
        # In Blender, the armature is a scene object, linked to armature data.
        # but it can also have a position etc.
        node_index = armature_object_exporter.write(obj, visible, scene)
    elif obj.type == "EMPTY":
        if obj.dupli_type == "GROUP" and obj.dupli_group:
            # write the parent proxy:
            node_index = entity_exporter.write_proxy(obj, visible=visible)
            # write the group:
            group_index = group_exporter.write(obj.dupli_group, scene)
            object_map.link(node_index, group_index, 1)

    if node_index is None:
        return node_index

    # groups don't keep indices, don't want to share
    if not in_group:
        object_map.map(obj, node_index)

    link_meta = int(obj == scene.camera)

    # can't parse the children of an unknown object
    for child in obj.children:
        # only export layer 1
        child_index = write(child, scene, in_group)
        if child_index is not None:
            object_map.link(node_index, child_index, link_meta)

    return node_index