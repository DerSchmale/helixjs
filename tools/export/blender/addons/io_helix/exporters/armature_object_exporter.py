from .. import data, object_map
from ..constants import ObjectType
from . import action_exporter
from . import armature_exporter
from . import entity_exporter


def write(object, visible, scene):
    armature_id = armature_exporter.write(object.data)
    entity_id = entity_exporter.write(object, visible=visible)
    object_map.link(entity_id, armature_id)

    if not object.animation_data:
        return

    # If the object has NLA tracks, we could have several actions
    # if the current track is active, link it with id 1

    animation_id = data.start_object(ObjectType.SKELETON_ANIMATION)
    data.end_object()
    object_map.link(entity_id, animation_id)

    # if we have tracks, assume we've got multiple clips to export
    tracks = object.animation_data.nla_tracks
    if tracks and len(tracks) > 0:
        mute_states = []
        for track in tracks:
            mute_states.append(track.mute)
            track.mute = True

        for track in tracks:
            track.mute = False
            for strip in track.strips:
                action_id = action_exporter.write_armature_action(strip.action, object, scene)
                object_map.link(animation_id, action_id, int(strip.active))
            track.mute = True

        for i, track in enumerate(tracks):
            track.mute = mute_states[i]

    elif object.animation_data.action:
        action_id = action_exporter.write_armature_action(object.animation_data.action, object, scene)
        object_map.link(animation_id, action_id, 1)

    return entity_id
