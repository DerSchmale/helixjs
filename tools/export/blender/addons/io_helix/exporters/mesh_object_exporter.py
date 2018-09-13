from .. import data, object_types, property_types
from . import entity_exporter
from . import mesh_exporter
from . import material_exporter


def write(object, file, object_map, visible):
    # these only actually write if they haven't written before
    mesh = object.data
    mesh_exporter.write(mesh, file, object_map)

    for material in mesh.materials:
        material_exporter.write(material, file, object_map)

    # write the basic entity data
    entity_id = entity_exporter.write(object, file, object_map, visible=visible)

    # write the mesh instance components
    # we sorted the submesh list by their material indices, so the order should match that in the materials list
    mesh_ids = object_map.get_mapped_indices(mesh)

    num_materials = len(mesh.materials)
    if num_materials < len(mesh_ids):
        print("WARNING: Length of materials mismatch in mesh " + mesh.name)

    for i, mesh_id in enumerate(mesh_ids):
        if i >= num_materials:
            break

        material = mesh.materials[i]
        material_id = object_map.get_mapped_indices(material)[0]
        mesh_instance_id = data.start_object(file, object_types.MESH_INSTANCE, object_map)
        data.write_uint8_prop(file, property_types.CAST_SHADOWS, int(material.use_cast_shadows))
        data.end_object(file)
        object_map.link(mesh_instance_id, mesh_id)
        object_map.link(entity_id, mesh_instance_id)
        object_map.link(mesh_instance_id, material_id)

    return entity_id
