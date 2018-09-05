HX_VERSION = "0.1.0"

import bpy, struct
from .exporters import scene_exporter, material_exporter, mesh_exporter, mesh_object_exporter, light_exporter
from . import data, object_map, property_types


def write_header(file, lighting_mode):
    file.write(b"HX")

    # this starts a meta-property list
    data.write_string_prop(file, property_types.VERSION, HX_VERSION)
    data.write_string_prop(file, property_types.GENERATOR, "Blender")
    data.write_uint8_prop(file, property_types.PAD_ARRAYS, 1)
    data.write_uint8_prop(file, property_types.DEFAULT_SCENE_INDEX, list(bpy.data.scenes).index(bpy.context.scene))
    data.write_uint8_prop(file, property_types.LIGHTING_MODE, lighting_mode)

    # as always, end a list with 0
    data.end_header(file)


def write_meshes(file, obj_map):
    for mesh in bpy.data.meshes:
        mesh_exporter.write(mesh, file, obj_map)


def write_materials(file, obj_map):
    for material in bpy.data.materials:
        material_exporter.write(material, file, obj_map)


def write_object(obj, file, obj_map, parent_id):
    index = None
    if obj.type == "MESH":
        index = mesh_object_exporter.write(obj, file, obj_map)
    elif obj.type == "LAMP":
        index = light_exporter.write(obj, file, obj_map)

    if index is not None:
        obj_map.link(parent_id, index)

    for child in obj.children:
        write_object(child, file, obj_map, index)


def write_scene_graphs(file, obj_map):
    for scene in bpy.data.scenes:
        index = scene_exporter.write(scene, file, obj_map)
        for obj in scene.objects:
            # root object:
            if obj.parent is None:
                write_object(obj, file, obj_map, index)


def write_links(file, obj_map):
    for link in obj_map.links:
        file.write(struct.pack("<LL", link[0], link[1]))


def write_hx(context, file_path, lighting_mode="FIXED"):
    print("Writing Helix file...")
    f = open(file_path, 'wb')

    obj_map = object_map.ObjectMap()

    write_header(f, lighting_mode)
    write_meshes(f, obj_map)
    write_materials(f, obj_map)
    write_scene_graphs(f, obj_map)

    data.end_object_list(f)

    write_links(f, obj_map)


    # TODO: Write links

    f.close()

    return {'FINISHED'}
