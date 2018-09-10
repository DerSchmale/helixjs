from .. import data, object_types
from . import action_exporter
from . import armature_exporter
from . import entity_exporter


def write(object, file, object_map, visible):
    armature_exporter.write(object.data, file, object_map)

    entity_id = entity_exporter.write(object, file, object_map, visible=visible)
    armature_id = object_map.get_mapped_indices(object.data)[0]
    object_map.link(entity_id, armature_id)

    # If the object has NLA tracks, we could have several actions
    # if the current track is active, link it with id 1

    if not object.animation_data:
        return

    animation_id = data.start_object(file, object_types.SKELETON_ANIMATION, object_map)
    data.end_object(file)
    object_map.link(entity_id, animation_id)

    # if we have tracks, assume we've got multiple clips to export
    tracks = object.animation_data.nla_tracks
    if tracks and len(tracks) > 0:
        for track in tracks:
            for strip in track.strips:
                action_id = action_exporter.write_armature_action(strip.action, file, object_map)
                object_map.link(animation_id, action_id, int(strip.active))

    elif object.animation_data.action:
        action_id = action_exporter.write_armature_action(object.animation_data.action, file, object_map)
        object_map.link(animation_id, action_id, 1)

    return entity_id
