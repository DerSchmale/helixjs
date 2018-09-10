import math
from .. import data, property_types, object_types
from . import texture_exporter
from mathutils import Color


def write(material, file, object_map):
    if object_map.has_mapped_indices(material):
        return

    for slot in material.texture_slots:
        if not slot or not slot.use:
            continue
        texture_exporter.write(slot.texture, file, object_map)

    material_id = data.start_object(file, object_types.MATERIAL, object_map)
    # store the index where this material was written, since we need to grab it elsewhere
    object_map.map(material, material_id)

    data.write_string_prop(file, property_types.NAME, material.name)
    data.write_color_prop(file, property_types.COLOR, material.diffuse_color)

    roughness = math.pow(2.0 / (material.specular_hardness + 2.0), .25)
    data.write_float32_prop(file, property_types.ROUGHNESS, roughness)

    if material.game_settings.alpha_blend == "ADD":
        data.write_uint8_prop(file, property_types.BLEND_STATE, 1)
    elif material.game_settings.alpha_blend == "ALPHA" or material.game_settings.alpha_blend == "ALPHA_SORT":
        data.write_uint8_prop(file, property_types.BLEND_STATE, 3)
    elif material.game_settings.alpha_blend == "CLIP":
        data.write_uint8_prop(file, property_types.ALPHA_THRESHOLD, .5)

    if not material.game_settings.use_backface_culling:
        data.write_uint8_prop(file, property_types.CULL_MODE, 0)

    if material.use_vertex_color_paint:
        data.write_uint8_prop(file, property_types.USE_VERTEX_COLORS, 1)

    if material.alpha < 1.0:
        data.write_float32_prop(file, property_types.ALPHA, material.alpha)

    if material.emit > 0.0:
        data.write_color_prop(file, property_types.EMISSIVE_COLOR, Color((material.emit, material.emit, material.emit)))

    for slot in material.texture_slots:
        # unsupported texture types
        if not slot or not object_map.has_mapped_indices(slot.texture):
            continue

        tex_id = object_map.get_mapped_indices(slot.texture)[0]

        if slot.use_map_color_diffuse:
            object_map.link(material_id, tex_id, 0)
        if slot.use_map_normal:
            object_map.link(material_id, tex_id, 1)
        if slot.use_map_specular:
            object_map.link(material_id, tex_id, 2)
        if slot.use_map_ambient:
            object_map.link(material_id, tex_id, 3)
        if slot.use_map_color_emission and material.emit > 0.0:
            object_map.link(material_id, tex_id, 4)
        if slot.use_map_alpha:
            object_map.link(material_id, tex_id, 5)

    data.end_object(file)
