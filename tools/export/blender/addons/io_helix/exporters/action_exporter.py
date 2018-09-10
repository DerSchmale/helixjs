from .. import data, property_types, object_types


# write actions for armatures, since they're different from normal animations
def write_armature_action(action, file, object_map):
    if object_map.has_mapped_indices(action):
        return object_map.get_mapped_indices(action)[0]

    action_id = data.start_object(file, object_types.ANIMATION_CLIP, object_map)
    data.write_string_prop(file, property_types.NAME, action.name)
    data.end_object(file)

    object_map.map(action, action_id)

    return action_id
