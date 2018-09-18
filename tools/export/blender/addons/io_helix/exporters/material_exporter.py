# @author derschmale <http://www.derschmale.com>

import math
from mathutils import Color, Vector

from . import texture_exporter
from .. import data, object_map
from ..constants import ObjectType, PropertyType


def write(material):
    if object_map.has_mapped_indices(material):
        return

    for slot in material.texture_slots:
        if not is_slot_supported(slot):
            continue

        texture_exporter.write(slot.texture)

    material_id = data.start_object(ObjectType.BASIC_MATERIAL)
    # store the index where this material was written, since we need to grab it elsewhere
    object_map.map(material, material_id)

    data.write_string_prop(PropertyType.NAME, material.name)
    data.write_color_prop(PropertyType.COLOR, material.diffuse_color)

    roughness = math.pow(2.0 / (material.specular_hardness + 2.0), .25)
    data.write_float32_prop(PropertyType.ROUGHNESS, roughness)

    if material.use_transparency:
        if material.game_settings.alpha_blend == "ADD":
            data.write_uint8_prop(PropertyType.BLEND_STATE, 1)
        elif material.game_settings.alpha_blend == "CLIP":
            data.write_uint8_prop(PropertyType.ALPHA_THRESHOLD, .5)
        else:
            data.write_uint8_prop(PropertyType.BLEND_STATE, 3)

    if not material.game_settings.use_backface_culling:
        data.write_uint8_prop(PropertyType.CULL_MODE, 0)

    if material.use_vertex_color_paint:
        data.write_uint8_prop(PropertyType.USE_VERTEX_COLORS, 1)

    if material.alpha < 1.0:
        data.write_float32_prop(PropertyType.ALPHA, material.alpha)

    if material.emit > 0.0:
        data.write_color_prop(PropertyType.EMISSIVE_COLOR, Color((material.emit, material.emit, material.emit)))

    for slot in material.texture_slots:
        if not is_slot_supported(slot):
            continue

        tex_id = object_map.get_mapped_indices(slot.texture)[0]

        if slot.use_map_color_diffuse:
            object_map.link(material_id, tex_id, 0)
            write_tex_scale_offset(slot, PropertyType.COLOR_MAP_SCALE, PropertyType.COLOR_MAP_OFFSET)

        if slot.use_map_normal:
            object_map.link(material_id, tex_id, 1)
            write_tex_scale_offset(slot, PropertyType.NORMAL_MAP_SCALE, PropertyType.NORMAL_MAP_OFFSET)

        if slot.use_map_hardness:
            object_map.link(material_id, tex_id, 2)
            # assume this is a gloss map
            data.write_uint8_prop(PropertyType.SPECULAR_MAP_MODE, 1)
            write_tex_scale_offset(slot, PropertyType.SPECULAR_MAP_SCALE, PropertyType.SPECULAR_MAP_OFFSET)

        if slot.use_map_ambient:
            object_map.link(material_id, tex_id, 3)

        if slot.use_map_color_emission and material.emit > 0.0:
            object_map.link(material_id, tex_id, 4)
            write_tex_scale_offset(slot, PropertyType.EMISSION_MAP_SCALE, PropertyType.EMISSION_MAP_OFFSET)

        if slot.use_map_alpha:
            object_map.link(material_id, tex_id, 5)
            write_tex_scale_offset(slot, PropertyType.MASK_MAP_SCALE, PropertyType.MASK_MAP_OFFSET)

    data.end_object()


def write_tex_scale_offset(slot, scale_type, offset_type):
    if slot.scale == Vector((1.0, 1.0, 1.0)) and slot.offset == Vector((0.0, 0.0, 0.0)):
        return

    data.write_vector2_prop(scale_type, slot.scale)
    data.write_vector2_prop(offset_type, slot.offset)


def is_slot_supported(slot):
    return bool(slot) and slot.use and slot.texture_coords == "UV"
