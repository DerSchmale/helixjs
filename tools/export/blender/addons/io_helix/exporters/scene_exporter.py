from .. import data, property_types, object_types
from . import texture_exporter
from mathutils import Color


def write_skybox(texture, file, object_map):
    skybox_id = data.start_object(file, object_types.SKYBOX, object_map)
    data.end_object(file)

    texture_id = texture_exporter.write(texture, file, object_map)
    object_map.link(skybox_id, texture_id)
    return skybox_id


def write_ambient_light(light, file, object_map):
    entity_id = data.start_object(file, object_types.ENTITY, object_map)
    data.end_object(file)

    ambient_id = data.start_object(file, object_types.AMBIENT_LIGHT, object_map)
    data.write_color_prop(file, property_types.COLOR, Color((1, 1, 1)))
    data.write_float32_prop(file, property_types.INTENSITY, light.environment_energy)
    data.end_object(file)

    object_map.link(entity_id, ambient_id)

    return entity_id


# def write_light_probe(light, file, object_map):
#     entity_id = data.start_object(file, object_types.ENTITY, object_map)
#     data.end_object(file)
#
#     probe_id = data.start_object(file, object_types.AMBIENT_LIGHT, object_map)
#     data.write_float32_prop(file, property_types.INTENSITY, light.environment_energy)
#     data.end_object(file)
#
#     object_map.link(entity_id, probe_id)
#
#     return entity_id


def write(scene, file, object_map):
    scene_id = data.start_object(file, object_types.SCENE, object_map)
    data.write_string_prop(file, property_types.NAME, scene.name)
    data.end_object(file)

    scene_light = scene.world.light_settings

    if scene_light.use_environment_light:
        if scene_light.environment_color == "PLAIN":
            entity_id = write_ambient_light(scene_light, file, object_map)
            object_map.link(scene_id, entity_id)

    # light probes not currently supported

    for slot in scene.world.texture_slots:
        if slot and slot.use_map_horizon:
            skybox_id = write_skybox(slot.texture, file, object_map)
            object_map.link(scene_id, skybox_id)

    return scene_id
