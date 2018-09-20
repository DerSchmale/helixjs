# @author derschmale <http://www.derschmale.com>

from ..constants import ObjectType, PropertyType
from . import object_exporter
from .. import data, object_map

def write(group, scene):
    if object_map.has_mapped_indices(group):
        return object_map.get_mapped_indices(group)[0]

    group_id = data.start_object(ObjectType.SCENE_NODE)
    data.write_string_prop(PropertyType.NAME, group.name)
    data.write_vector_prop(PropertyType.POSITION, -group.dupli_offset)
    data.end_object()

    object_map.map(group, group_id)

    for child in group.objects:
        child_id = object_exporter.write(child, scene, in_group=True)

        if child_id is None:
            continue

        object_map.link(group_id, child_id)

    return group_id