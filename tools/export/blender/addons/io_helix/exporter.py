HX_VERSION = "0.1.0"

import bpy, struct
from .exporters import scene_exporter
from .exporters import mesh_object_exporter
from .exporters import light_exporter
from .exporters import camera_exporter
from .exporters import armature_object_exporter
from . import data, object_map, property_types


file_path = None


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


def write_object(obj, file, obj_map, parent_id, scene, export_shadows):
    index = None
    visible = obj.is_visible(scene)
    if obj.type == "MESH":
        index = mesh_object_exporter.write(obj, file, obj_map, visible)
    elif obj.type == "LAMP":
        index = light_exporter.write(obj, file, obj_map, visible, export_shadows)
    elif obj.type == "CAMERA":
        index = camera_exporter.write(obj, file, obj_map)
    elif obj.type == "ARMATURE":
        # In Blender, the armature is a scene object, linked to armature data.
        # but it can also have a position etc.
        index = armature_object_exporter.write(obj, file, obj_map, visible)
        pass

    if index is not None:
        link_meta = int(obj == scene.camera)
        obj_map.link(parent_id, index, link_meta)

        # can't parse the children of an unknown object
        for child in obj.children:
            write_object(child, file, obj_map, index, scene, export_shadows)


def write_scene_graphs(file, obj_map, export_shadows):
    for scene in bpy.data.scenes:
        index = scene_exporter.write(scene, file, obj_map)
        for obj in scene.objects:
            # root object:
            if obj.parent is None:
                write_object(obj, file, obj_map, index, scene, export_shadows)


def write_links(file, obj_map):
    for link in obj_map.links:
        file.write(struct.pack("<LLB", link[0], link[1], link[2]))


def write_hx(context, filepath, lighting_mode="FIXED", export_shadows=False):
    print("Writing Helix file...")
    f = open(filepath, 'wb')

    global file_path
    file_path = filepath

    obj_map = object_map.ObjectMap()
    data.reset()

    write_header(f, lighting_mode)
    write_scene_graphs(f, obj_map, export_shadows)

    data.end_object_list(f)

    write_links(f, obj_map)

    f.close()

    return {'FINISHED'}
