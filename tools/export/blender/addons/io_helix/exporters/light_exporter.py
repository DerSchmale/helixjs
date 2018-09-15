import mathutils
import struct
import math

from .. import data, export_options, object_map
from ..constants import ObjectType, PropertyType
from . import entity_exporter


def write(object, visible):
    #write the basic entity data

    light_data = object.data
    quat = None

    if light_data.type == "SPOT" or light_data.type == "SUN":
        # TODO: Light points DOWN (-Z) by default. In Helix, it points "forward" (+Y)
        # Need to pass a matrix/quaternion to entity_exporter that transforms the rotation
        quat = mathutils.Quaternion([1, 0, 0], math.radians(-90.0))
        pass

    entity_id = entity_exporter.write(object, orientation=quat, visible=visible)

    if light_data.type == "SUN":
        light_id = data.start_object(ObjectType.DIR_LIGHT)
    elif light_data.type == "POINT":
        light_id = data.start_object(ObjectType.POINT_LIGHT)
        write_point_spot_props(object)
    elif light_data.type == "SPOT":
        light_id = data.start_object(ObjectType.SPOT_LIGHT)
        write_point_spot_props(object)
        inner_angle = light_data.spot_size * (1.0 - light_data.spot_blend)
        data.start_property(PropertyType.SPOT_ANGLES)
        data.write(struct.pack("<ff", inner_angle, light_data.spot_size))
    else:
        print("Unsupported light type: " + light_data.type + ". Creating empty placeholder Entity.")
        return entity_id

    data.write_string_prop(PropertyType.NAME, light_data.name)
    data.write_color_prop(PropertyType.COLOR, light_data.color)
    data.write_float32_prop(PropertyType.INTENSITY, light_data.energy * 3.1415 * 2.0)

    if export_options.export_shadows and light_data.use_shadow:
        data.write_uint8_prop(PropertyType.CAST_SHADOWS, 1)

    data.end_object()
    object_map.link(entity_id, light_id)

    return entity_id


def write_point_spot_props(light):
    light_data = light.data
    radius = 2.0 * light_data.distance
    data.write_float32_prop(PropertyType.RADIUS, radius)
