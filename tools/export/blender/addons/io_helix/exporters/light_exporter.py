import mathutils
import struct

from .. import data, object_types, property_types
from . import entity_exporter
from math import radians

def write(object, file, object_map):
    #write the basic entity data

    light_data = object.data
    quat = None

    if light_data.type == "SPOT" or light_data.type == "SUN":
        # TODO: Light points DOWN (-Z) by default. In Helix, it points "forward" (+Y)
        # Need to pass a matrix/quaternion to entity_exporter that transforms the rotation
        quat = mathutils.Quaternion([1, 0, 0], radians(-90.0))
        pass

    entity_id = entity_exporter.write(object, file, object_map, quat)

    if light_data.type == "SUN":
        light_id = data.start_object(file, object_types.DIR_LIGHT, object_map)
    elif light_data.type == "POINT":
        light_id = data.start_object(file, object_types.POINT_LIGHT, object_map)
        write_point_spot_props(file, object)
    elif light_data.type == "SPOT":
        light_id = data.start_object(file, object_types.SPOT_LIGHT, object_map)
        write_point_spot_props(file, object)
        inner_angle = light_data.spot_size * (1.0 - light_data.spot_blend)
        data.start_property(file, property_types.SPOT_ANGLES)
        file.write(struct.pack("<ff", inner_angle, light_data.spot_size))
    else:
        print("Unsupported light type: " + light_data.type + ". Creating empty placeholder Entity.")
        return entity_id

    data.write_color_prop(file, property_types.COLOR, light_data.color)
    data.write_float32_prop(file, property_types.INTENSITY, light_data.energy * 3.1415 * 2.0)

    if light_data.use_shadow:
        data.write_uint8_prop(file, property_types.CAST_SHADOWS, 1)

    data.end_object(file)
    object_map.link(entity_id, light_id)

    return entity_id


def write_point_spot_props(file, light):
    light_data = light.data
    radius = 2.0 * light_data.distance
    data.write_float32_prop(file, property_types.RADIUS, radius)
