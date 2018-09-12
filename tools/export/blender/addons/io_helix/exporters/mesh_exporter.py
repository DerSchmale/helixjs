import bpy
import struct
from .. import data, data_types, property_types, object_types

class SubMesh:
    def __init__(self):
        self.name = None
        self.num_uvs = 0
        self.vertex_stride = 0
        self.material_index = 0
        self.has_skinning_data = False
        self.skinning_data = []
        self.vertex_data = []
        self.index_data = []
        self.hash_index_map = {}
        self.index_count = 0

    def get_vertex_hash(self, pos, normal, uvs, bind_data):
        vertex_hash = "/" + str(pos) + "/" + str(normal) + "/"

        for uv in uvs:
            vertex_hash = vertex_hash + str(uv) + "/"

        if bind_data:
            for j in bind_data:
                vertex_hash = vertex_hash + str(j) + "/"

        return vertex_hash

    def add_vertex(self, pos, normal, uvs, bind_data):
        assert len(uvs) == self.num_uvs

        vertex_hash = self.get_vertex_hash(pos, normal, uvs, bind_data)

        if vertex_hash in self.hash_index_map:
            index = self.hash_index_map[vertex_hash]
        else:
            index = self.index_count
            self.hash_index_map[vertex_hash] = index
            self.index_count += 1
            self.vertex_data.extend(list(pos))
            self.vertex_data.extend(list(normal))

            for uv in uvs:
                self.vertex_data.extend(list(uv))

            if self.has_skinning_data:
                self.skinning_data.extend([j[0] for j in bind_data])
                self.skinning_data.extend([j[1] for j in bind_data])

        self.index_data.append(index)


def write_submesh(sub_mesh, file, object_map, src_mesh):
    sub_mesh_index = data.start_object(file, object_types.MESH, object_map)
    object_map.map(src_mesh, sub_mesh_index)
    data.write_string_prop(file, property_types.NAME, sub_mesh.name)
    num_vertices = int(len(sub_mesh.vertex_data) / sub_mesh.vertex_stride)
    data.write_uint32_prop(file, property_types.NUM_VERTICES, num_vertices)

    write_attribute(file, "hx_position", 3, data_types.FLOAT32)
    write_attribute(file, "hx_normal", 3, data_types.FLOAT32)

    for i in range(0, sub_mesh.num_uvs):
        name = "hx_texCoord"
        if i > 0:
            name = name + str(i)
        write_attribute(file, name, 2, data_types.FLOAT32)

    # skinning data in stream 1
    if sub_mesh.has_skinning_data:
        write_attribute(file, "hx_jointIndices", 4, data_types.FLOAT32, 1)
        write_attribute(file, "hx_jointWeights", 4, data_types.FLOAT32, 1)

    if num_vertices > 65535:
        # we'll need 32 bit to index all vertices
        index_type = data_types.UINT32
    else:
        # 16 bit indices is enough
        index_type = data_types.UINT16

    data.write_uint32_prop(file, property_types.NUM_INDICES, len(sub_mesh.index_data))
    data.write_uint8_prop(file, property_types.INDEX_TYPE, index_type)

    # knowing format and count, we can write the actual indices
    if index_type == data_types.UINT16:
        data.write_uint16_array_prop(file, property_types.INDEX_DATA, sub_mesh.index_data)
    else:
        data.write_uint32_array_prop(file, property_types.INDEX_DATA, sub_mesh.index_data)

    # TODO: Handle skinning data in multiple streams?
    data.write_float32_array_prop(file, property_types.VERTEX_STREAM_DATA, sub_mesh.vertex_data)

    if sub_mesh.has_skinning_data:
        data.write_float32_array_prop(file, property_types.VERTEX_STREAM_DATA, sub_mesh.skinning_data)

    data.end_object(file)


def get_submesh(src, material_index, list, has_skinned_data):
    for s in list:
        if s.material_index == material_index:
            return s

    sub = SubMesh()
    sub.src = src
    sub.name = src.name
    sub.material_index = material_index
    sub.num_uvs = len(src.uv_layers)
    sub.has_skinning_data = has_skinned_data
    # positions (3), normals (3), uvs (2 per layer)
    sub.vertex_stride = 6 + sub.num_uvs * 2

    # multiple HX.Mesh objects due to more materials being used
    if len(list) > 0:
        sub.name = sub.name + "_" + str(len(list))

    list.append(sub)
    return sub


def get_skinned_data(mesh, armature, vertex_groups):
    data = []
    has_groups = False
    for v in mesh.vertices:
        joints = []

        # select all vertex groups from skinned_object that contain the given vertex
        for g in v.groups:
            has_groups = True
            group = vertex_groups[g.group]
            bone = armature.bones[group.name]
            joints.append((list(armature.bones).index(bone), g.weight))

        # sort descending on weight
        joints.sort(key=lambda joint: -joint[1])

        if len(joints) > 4:
            print("warning: more than 4 joints per vertex! Animation may not work as expected")

        # need 4
        joints = joints[:4]
        for n in range(len(joints), 4):
            joints.append((0, 0))

        print(str(joints))

        data.append(joints)

    if not has_groups:
        return None

    return data


def write(mesh, file, object_map):
    if object_map.has_mapped_indices(mesh):
        return

    skinned_data = None
    vertex_groups = None
    armature = None

    for obj in bpy.data.objects:
        if obj.data == mesh and obj.vertex_groups:
            vertex_groups = obj.vertex_groups
            for mod in obj.modifiers:
                if mod.type == "ARMATURE":
                    armature = mod.object.data
        if armature:
            break

    if vertex_groups:
        skinned_data = get_skinned_data(mesh, armature, vertex_groups)

    sub_meshes = []

    def add_vertex(loop_index):
        vi = mesh.loops[loop_index].vertex_index
        v = mesh.vertices[vi].co
        n = mesh.vertices[vi].normal
        uvs = []

        if not p.use_smooth:
            n = p.normal

        for uv_layer in mesh.uv_layers:
            uvs.append(uv_layer.data[loop_index].uv)

        bind_data = None
        if skinned_data:
            bind_data = skinned_data[vi]

        sub_mesh.add_vertex(v, n, uvs, bind_data)

    for p in mesh.polygons:
        sub_mesh = get_submesh(mesh, p.material_index, sub_meshes, bool(skinned_data))
        for i, loop_index in enumerate(p.loop_indices):
            # triangulation
            if i >= 2:
                add_vertex(p.loop_indices[0])
                add_vertex(p.loop_indices[i - 1])
                add_vertex(p.loop_indices[i])
                pass

    # we'll use the fact that meshes are sorted by material index when we're linking
    # then we can just loop through the mesh.materials list and link MeshInstance baseIndex + subIndex --> materialIndex
    sub_meshes.sort(key=lambda sub_mesh: str(sub_mesh.material_index))

    for s in sub_meshes:
        write_submesh(s, file, object_map, mesh)


def write_attribute(file, name, num_components, data_type, stream_index = 0):
    data.start_property(file, property_types.VERTEX_ATTRIBUTE)
    file.write(name.encode("utf-8"))
    # write end-of-string, and attribute info
    file.write(struct.pack("<BBBB", 0, num_components, data_type, stream_index))
