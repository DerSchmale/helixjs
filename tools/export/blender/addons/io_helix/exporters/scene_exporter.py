from mathutils import Color
from .. import data, object_map
from ..constants import ObjectType, PropertyType
from . import texture_exporter


def write_skybox(texture, file):
    skybox_id = data.start_object(file, ObjectType.SKYBOX)
    data.end_object(file)

    texture_id = texture_exporter.write(texture, file)
    object_map.link(skybox_id, texture_id)
    return skybox_id


def write_ambient_light(light, file):
    entity_id = data.start_object(file, ObjectType.ENTITY)
    data.end_object(file)

    ambient_id = data.start_object(file, ObjectType.AMBIENT_LIGHT)
    data.write_color_prop(file, PropertyType.COLOR, Color((1, 1, 1)))
    data.write_float32_prop(file, PropertyType.INTENSITY, light.environment_energy)
    data.end_object(file)

    object_map.link(entity_id, ambient_id)

    return entity_id


# def write_light_probe(light, file):
#     entity_id = data.start_object(file, ObjectType.ENTITY)
#     data.end_object(file)
#
#     probe_id = data.start_object(file, ObjectType.AMBIENT_LIGHT)
#     data.write_float32_prop(file, PropertyType.INTENSITY, light.environment_energy)
#     data.end_object(file)
#
#     object_map.link(entity_id, probe_id)
#
#     return entity_id


def write(scene, file):
    scene_id = data.start_object(file, ObjectType.SCENE)
    data.write_string_prop(file, PropertyType.NAME, scene.name)
    data.end_object(file)

    scene_light = scene.world.light_settings

    if scene_light.use_environment_light:
        if scene_light.environment_color == "PLAIN":
            entity_id = write_ambient_light(scene_light, file)
            object_map.link(scene_id, entity_id)

    # light probes not currently supported

    for slot in scene.world.texture_slots:
        if slot and slot.use_map_horizon:
            skybox_id = write_skybox(slot.texture, file)
            object_map.link(scene_id, skybox_id)

    return scene_id
