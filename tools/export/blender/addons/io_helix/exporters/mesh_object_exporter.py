from . import entity_exporter
from . import mesh_exporter
from . import material_exporter
from .. import data, object_map
from ..constants import ObjectType, PropertyType


def write(object, file, visible):
    # these only actually write if they haven't written before
    mesh = object.data
    mesh_exporter.write(mesh, file)

    for material in mesh.materials:
        material_exporter.write(material, file)

    # write the basic entity data
    entity_id = entity_exporter.write(object, file, visible=visible)

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
        mesh_instance_id = data.start_object(file, ObjectType.MESH_INSTANCE)
        data.write_uint8_prop(file, PropertyType.CAST_SHADOWS, int(material.use_cast_shadows))
        data.end_object(file)
        object_map.link(mesh_instance_id, mesh_id)
        object_map.link(entity_id, mesh_instance_id)
        object_map.link(mesh_instance_id, material_id)

    return entity_id
