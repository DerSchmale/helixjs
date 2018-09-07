import struct
from .. import data, property_types, object_types


def write(material, file, object_map):
    material_id = data.start_object(file, object_types.MATERIAL, object_map)
    # store the index where this material was written, since we need to grab it elsewhere
    object_map.map(material, material_id)
    data.write_string_prop(file, property_types.NAME, material.name)
    for slot in material.texture_slots:
        if not slot or not slot.use:
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
        if slot.use_map_color_emission:
            object_map.link(material_id, tex_id, 4)
        if slot.use_map_alpha:
            object_map.link(material_id, tex_id, 5)

    data.end_object(file)


def write_attribute(file, name, num_components, data_type, stream_index = 0):
    data.start_property(file, property_types.VERTEX_ATTRIBUTE)
    file.write(name.encode("utf-8"))
    # write end-of-string, and attribute info
    file.write(struct.pack("<BBBB", 0, num_components, data_type, stream_index))
